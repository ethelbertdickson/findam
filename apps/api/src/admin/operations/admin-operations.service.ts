import { Injectable } from '@nestjs/common';
import { OperationalTaskName, OperationalTaskStatus } from '@prisma/client';
import type { JwtAccessPayload } from '../../auth/types/jwt-payload.type';
import { ObservabilityService } from '../../observability/observability.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
  ) {}

  async getMonitoring() {
    const metrics = this.observability.getSnapshot();
    const databaseStartedAt = performance.now();
    let database: { status: 'healthy' | 'down'; latencyMs: number | null } = {
      status: 'healthy',
      latencyMs: null,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = {
        status: 'healthy',
        latencyMs: Math.max(
          1,
          Math.round(performance.now() - databaseStartedAt),
        ),
      };
    } catch {
      database = { status: 'down', latencyMs: null };
    }

    return {
      ...metrics,
      dependencies: {
        database,
        media: {
          status: process.env.CLOUDINARY_URL
            ? ('configured' as const)
            : ('not_configured' as const),
        },
      },
    };
  }

  async runDatabaseHealthCheck(actor: JwtAccessPayload) {
    const startedAt = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const durationMs = Math.max(1, Math.round(performance.now() - startedAt));
      return this.prisma.operationalTaskRun.create({
        data: {
          task: OperationalTaskName.DATABASE_HEALTH_CHECK,
          status: OperationalTaskStatus.SUCCEEDED,
          durationMs,
          detail: 'PostgreSQL responded successfully.',
          actorId: actor.sub,
        },
      });
    } catch {
      const durationMs = Math.max(1, Math.round(performance.now() - startedAt));
      try {
        return await this.prisma.operationalTaskRun.create({
          data: {
            task: OperationalTaskName.DATABASE_HEALTH_CHECK,
            status: OperationalTaskStatus.FAILED,
            durationMs,
            detail: 'PostgreSQL could not be reached.',
            actorId: actor.sub,
          },
        });
      } catch {
        return {
          id: null,
          task: OperationalTaskName.DATABASE_HEALTH_CHECK,
          status: OperationalTaskStatus.FAILED,
          durationMs,
          detail:
            'PostgreSQL could not be reached; the failed run could not be persisted.',
          createdAt: new Date(),
        };
      }
    }
  }

  async getTaskRuns(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.operationalTaskRun.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          task: true,
          status: true,
          durationMs: true,
          detail: true,
          createdAt: true,
          actor: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.operationalTaskRun.count(),
    ]);

    return {
      items,
      page,
      limit,
      total,
      hasNextPage: page * limit < total,
    };
  }
}
