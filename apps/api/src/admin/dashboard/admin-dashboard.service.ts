import { Injectable, Logger } from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const generatedAt = new Date();
    const sevenDaysAgo = new Date(generatedAt);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const databaseStartedAt = performance.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const databaseLatencyMs = Math.max(
        1,
        Math.round(performance.now() - databaseStartedAt),
      );

      const [
        usersTotal,
        usersActive,
        agentsTotal,
        listingsTotal,
        listingsActive,
        newUsersSevenDays,
        newListingsSevenDays,
        recentUsers,
        recentListings,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.agentProfile.count(),
        this.prisma.listing.count({ where: { deletedAt: null } }),
        this.prisma.listing.count({
          where: { deletedAt: null, status: ListingStatus.ACTIVE },
        }),
        this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        this.prisma.listing.count({
          where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
        }),
        this.prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
          },
        }),
        this.prisma.listing.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            createdAt: true,
            city: { select: { name: true } },
          },
        }),
      ]);

      const recentActivity = [
        ...recentUsers.map((user) => ({
          id: `user:${user.id}`,
          kind: 'USER_REGISTERED' as const,
          title: `${user.firstName} ${user.lastName}`,
          detail: `${titleCase(user.role)} account registered`,
          occurredAt: user.createdAt,
        })),
        ...recentListings.map((listing) => ({
          id: `listing:${listing.id}`,
          kind: 'LISTING_CREATED' as const,
          title: listing.title,
          detail: `${titleCase(listing.type)} · ${listing.city.name} · ${titleCase(listing.status)}`,
          occurredAt: listing.createdAt,
        })),
      ]
        .sort(
          (left, right) =>
            right.occurredAt.getTime() - left.occurredAt.getTime(),
        )
        .slice(0, 6);

      return {
        generatedAt,
        api: {
          status: 'healthy' as const,
          uptimeSeconds: Math.floor(process.uptime()),
          environment: process.env.NODE_ENV ?? 'development',
          version: process.env.npm_package_version ?? '0.0.1',
        },
        database: {
          status: 'healthy' as const,
          latencyMs: databaseLatencyMs,
        },
        marketplace: {
          usersTotal,
          usersActive,
          agentsTotal,
          listingsTotal,
          listingsActive,
          newUsersSevenDays,
          newListingsSevenDays,
        },
        recentActivity,
      };
    } catch (error) {
      this.logger.error(
        'Could not load dashboard data',
        error instanceof Error ? error.stack : String(error),
      );
      return {
        generatedAt,
        api: {
          status: 'degraded' as const,
          uptimeSeconds: Math.floor(process.uptime()),
          environment: process.env.NODE_ENV ?? 'development',
          version: process.env.npm_package_version ?? '0.0.1',
        },
        database: {
          status: 'down' as const,
          latencyMs: null,
        },
        marketplace: null,
        recentActivity: [],
      };
    }
  }
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
