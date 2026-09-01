import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { MediaProject } from "@prisma/client";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { hashApiKey } from "./media.service";

export type ProjectRequest = Request & { mediaProject?: MediaProject };

@Injectable()
export class ProjectApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ProjectRequest>();
    const authorization = request.headers.authorization;
    const key = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : undefined;
    const projectSlugValue = request.params.projectSlug;
    const projectSlug = Array.isArray(projectSlugValue) ? projectSlugValue[0] : projectSlugValue;
    if (!key || !projectSlug) {
      throw new UnauthorizedException("A project API key is required");
    }

    const record = await this.prisma.mediaApiKey.findFirst({
      where: {
        keyHash: hashApiKey(key),
        revokedAt: null,
        project: { slug: projectSlug, isActive: true },
      },
      include: { project: true },
    });
    if (!record) {
      throw new UnauthorizedException("Project API key is invalid or revoked");
    }

    request.mediaProject = record.project;
    await this.prisma.mediaApiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }
}
