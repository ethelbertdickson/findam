import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MediaAssetKind, Prisma } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { AssetsQueryDto } from "./dto/assets-query.dto";
import { CreateApiKeyDto } from "./dto/create-api-key.dto";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { CreateProjectDto } from "./dto/create-project.dto";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  listProjects() {
    return this.prisma.mediaProject.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: { select: { folders: true, assets: true } },
        apiKeys: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            prefix: true,
            lastFour: true,
            createdAt: true,
            lastUsedAt: true,
            revokedAt: true,
          },
        },
      },
    });
  }

  async createProject(dto: CreateProjectDto) {
    const name = dto.name.trim();
    const projectSlug = slug(dto.slug?.trim() || name);
    if (!name || !projectSlug) {
      throw new BadRequestException("A valid project name is required");
    }

    try {
      return await this.prisma.mediaProject.create({
        data: {
          name,
          slug: projectSlug,
          description: dto.description?.trim() || null,
        },
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException("A project with this slug already exists");
      }
      throw error;
    }
  }

  async createApiKey(projectId: string, dto: CreateApiKeyDto) {
    const project = await this.getProjectById(projectId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("An API key name is required");
    const secret = randomBytes(32).toString("base64url");
    const key = `fdm_${project.slug}_${secret}`;
    const record = await this.prisma.mediaApiKey.create({
      data: {
        projectId,
        name,
        prefix: key.slice(0, Math.min(key.length - 4, 20)),
        keyHash: hashApiKey(key),
        lastFour: key.slice(-4),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastFour: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
    });
    return { ...record, key };
  }

  async revokeApiKey(projectId: string, keyId: string) {
    const result = await this.prisma.mediaApiKey.updateMany({
      where: { id: keyId, projectId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException("Active API key not found");
    return { revoked: true };
  }

  async listFolders(projectSlug: string) {
    const project = await this.getProject(projectSlug);
    return this.prisma.mediaFolder.findMany({
      where: { projectId: project.id },
      orderBy: [{ path: "asc" }],
      include: {
        _count: { select: { assets: { where: { deletedAt: null } } } },
      },
    });
  }

  async createFolder(dto: CreateFolderDto) {
    const project = await this.getProject(dto.projectSlug);
    const name = dto.name.trim();
    const parentPath = normalizePath(dto.parentPath ?? "");
    const segment = slug(name);
    if (!segment) {
      throw new BadRequestException("A valid folder name is required");
    }
    const path = normalizePath([parentPath, segment].filter(Boolean).join("/"));

    try {
      return await this.prisma.mediaFolder.create({
        data: { projectId: project.id, name, path },
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException("A folder with this path already exists");
      }
      throw error;
    }
  }

  async listAssets(query: AssetsQueryDto) {
    const project = await this.getProject(query.projectSlug);
    const search = query.q?.trim();
    const where: Prisma.MediaAssetWhereInput = {
      projectId: project.id,
      deletedAt: null,
      ...(query.folderPath ? { folder: { is: { path: normalizePath(query.folderPath) } } } : {}),
      ...(search ? { originalFilename: { contains: search, mode: "insensitive" } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { folder: { select: { id: true, name: true, path: true } } },
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      hasNextPage: query.page * query.limit < total,
    };
  }

  async upload(file: Express.Multer.File, projectSlug: string, folderPath?: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException("A file is required");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException("Files may not exceed 20 MB");
    }
    if (!allowedMimeType(file.mimetype)) {
      throw new BadRequestException("Unsupported file type");
    }

    const project = await this.getProject(projectSlug);
    const folder = folderPath ? await this.getFolder(project.id, folderPath) : null;
    const id = randomUUID();
    const extension = safeExtension(file.originalname, file.mimetype);
    const storedFilename = `${id}${extension}`;
    const storagePath = resolve(process.env.MEDIA_STORAGE_PATH ?? "./storage");
    await mkdir(storagePath, { recursive: true });
    await writeFile(resolve(storagePath, storedFilename), file.buffer, {
      flag: "wx",
    });

    try {
      return await this.prisma.mediaAsset.create({
        data: {
          id,
          projectId: project.id,
          folderId: folder?.id,
          originalFilename: file.originalname.slice(0, 255),
          storedFilename,
          mimeType: file.mimetype,
          kind: kindForMimeType(file.mimetype),
          sizeBytes: file.size,
          urlPath: `/media/${storedFilename}`,
        },
        include: { folder: { select: { id: true, name: true, path: true } } },
      });
    } catch (error) {
      await unlink(resolve(storagePath, storedFilename)).catch(() => undefined);
      throw error;
    }
  }

  private async getProject(projectSlug: string) {
    if (!projectSlug) {
      throw new BadRequestException("A media project is required");
    }
    const project = await this.prisma.mediaProject.findUnique({
      where: { slug: slug(projectSlug) },
    });
    if (!project || !project.isActive) {
      throw new NotFoundException("Active media project not found");
    }
    return project;
  }

  private async getProjectById(id: string) {
    const project = await this.prisma.mediaProject.findUnique({ where: { id } });
    if (!project || !project.isActive) {
      throw new NotFoundException("Active media project not found");
    }
    return project;
  }

  private async getFolder(projectId: string, path: string) {
    const folder = await this.prisma.mediaFolder.findUnique({
      where: {
        projectId_path: { projectId, path: normalizePath(path) },
      },
    });
    if (!folder) throw new NotFoundException("Folder not found");
    return folder;
  }
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

function normalizePath(value: string) {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/")
    .toLowerCase();
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function allowedMimeType(mimeType: string) {
  return (
    mimeType.startsWith("image/") || mimeType.startsWith("video/") || mimeType === "application/pdf"
  );
}

function kindForMimeType(mimeType: string) {
  if (mimeType.startsWith("image/")) return MediaAssetKind.IMAGE;
  if (mimeType.startsWith("video/")) return MediaAssetKind.VIDEO;
  if (mimeType === "application/pdf") return MediaAssetKind.DOCUMENT;
  return MediaAssetKind.OTHER;
}

function safeExtension(filename: string, mimeType: string) {
  const extension = extname(filename).toLowerCase();
  if (/^\.[a-z0-9]{1,10}$/.test(extension)) return extension;
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType.startsWith("video/")) return ".mp4";
  return ".bin";
}
