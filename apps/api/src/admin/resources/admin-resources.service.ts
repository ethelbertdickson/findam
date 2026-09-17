import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mkdir, rename, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminListingsQueryDto } from './dto/admin-listings-query.dto';
import {
  AdminUsersQueryDto,
  AdminUserStatus,
} from './dto/admin-users-query.dto';

@Injectable()
export class AdminResourcesService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async uploadAppRelease(app: string, file: { path: string; originalname: string }) {
    const appSlug = app.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(appSlug)) throw new BadRequestException('Invalid app folder.');
    const root = resolve(this.config.get<string>('DOWNLOAD_ROOT') ?? '/var/lib/findam/downloads');
    const directory = resolve(root, appSlug);
    if (!directory.startsWith(`${root}/`)) throw new BadRequestException('Invalid app folder.');
    await mkdir(directory, { recursive: true });
    const targetName = appSlug === 'projectorpro' ? 'ProjectorPro-latest.zip' : basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const target = join(directory, targetName);
    await rename(file.path, target);
    const details = await stat(target);
    return { app: appSlug, filename: targetName, sizeBytes: details.size, path: target };
  }

  async getProjectorProDownloads(limit: number) {
    const [summary, byCountry, recent] = await Promise.all([
      this.prisma.downloadEvent.groupBy({ by: ['status'], where: { product: 'projectorpro' }, _count: { _all: true } }),
      this.prisma.downloadEvent.groupBy({ by: ['countryCode', 'continent'], where: { product: 'projectorpro', countryCode: { not: null } }, _count: { _all: true }, orderBy: { _count: { countryCode: 'desc' } }, take: 50 }),
      this.prisma.downloadEvent.findMany({ where: { product: 'projectorpro' }, orderBy: { startedAt: 'desc' }, take: limit, select: { id: true, version: true, platform: true, status: true, ipHash: true, countryCode: true, continent: true, region: true, userAgent: true, referrer: true, startedAt: true, completedAt: true } }),
    ]);
    return { summary, byCountry, recent };
  }

  async getUserDetails(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        projectorProWallet: {
          select: {
            balanceSeconds: true,
            trialGrantedAt: true,
            entries: { orderBy: { createdAt: 'desc' }, take: 100 },
          },
        },
        projectorProPurchases: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            packageCode: true,
            creditSeconds: true,
            status: true,
            createdAt: true,
            fulfilledAt: true,
          },
        },
        projectorProSessions: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            installationId: true,
            reservedSeconds: true,
            consumedSeconds: true,
            status: true,
            createdAt: true,
            lastHeartbeatAt: true,
            completedAt: true,
          },
        },
        projectorProTrialDevices: {
          orderBy: { grantedAt: 'desc' },
          select: { deviceId: true, grantedAt: true },
        },
        refreshTokens: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { createdAt: true, expiresAt: true, revokedAt: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User account was not found.');
    return {
      ...user,
      // The first 60-minute trial is intentionally claimed on the first
      // ProjectorPro device session, not during ordinary account registration.
      projectorProTrialAvailable: user.projectorProWallet === null,
    };
  }

  async getUsers(query: AdminUsersQueryDto) {
    const search = query.q?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status
        ? { isActive: query.status === AdminUserStatus.ACTIVE }
        : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          agentProfile: {
            select: { agencyName: true, isVerified: true },
          },
          _count: { select: { listings: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(items, total, query.page, query.limit);
  }

  async getListings(query: AdminListingsQueryDto) {
    const search = query.q?.trim();
    const where: Prisma.ListingWhereInput = {
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              {
                owner: {
                  is: {
                    OR: [
                      { firstName: { contains: search, mode: 'insensitive' } },
                      { lastName: { contains: search, mode: 'insensitive' } },
                      { email: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              },
              {
                city: {
                  is: { name: { contains: search, mode: 'insensitive' } },
                },
              },
              {
                state: {
                  is: { name: { contains: search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          city: { select: { name: true } },
          state: { select: { name: true } },
          images: {
            orderBy: { position: 'asc' },
            take: 1,
            select: { url: true },
          },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    const items = records.map(({ images, price, ...listing }) => ({
      ...listing,
      price: price.toString(),
      imageUrl: images[0]?.url ?? null,
    }));

    return paginated(items, total, query.page, query.limit);
  }
}

function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    page,
    limit,
    total,
    hasNextPage: page * limit < total,
  };
}
