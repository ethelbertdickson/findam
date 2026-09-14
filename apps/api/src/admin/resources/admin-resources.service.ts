import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminListingsQueryDto } from './dto/admin-listings-query.dto';
import {
  AdminUsersQueryDto,
  AdminUserStatus,
} from './dto/admin-users-query.dto';

@Injectable()
export class AdminResourcesService {
  constructor(private readonly prisma: PrismaService) {}

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
    return user;
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
