import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { statfs } from 'node:fs/promises';
import { ObservabilityService } from '../observability/observability.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    private readonly config: ConfigService,
  ) {}

  async health() {
    const startedAt = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { product: 'findam', status: 'healthy', database: { status: 'healthy', latencyMs: Math.max(1, Math.round(performance.now() - startedAt)) }, generatedAt: new Date().toISOString() };
    } catch {
      return { product: 'findam', status: 'degraded', database: { status: 'down', latencyMs: null }, generatedAt: new Date().toISOString() };
    }
  }

  async users() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [total, active, newLast7Days] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: since } } }),
    ]);
    return { product: 'findam', total, active, newLast7Days, generatedAt: new Date().toISOString() };
  }

  async storage() {
    const provider = this.config.get<string>('storage.provider') ?? 'unknown';
    const storagePath = this.config.get<string>('media.storagePath');
    if (!storagePath) return { product: 'findam', provider, status: 'configured', capacity: null, generatedAt: new Date().toISOString() };
    try {
      const stats = await statfs(storagePath);
      const totalBytes = Number(stats.blocks) * Number(stats.bsize);
      const freeBytes = Number(stats.bfree) * Number(stats.bsize);
      return { product: 'findam', provider, status: 'healthy', capacity: { totalBytes, freeBytes, usedBytes: totalBytes - freeBytes }, generatedAt: new Date().toISOString() };
    } catch {
      return { product: 'findam', provider, status: 'unavailable', capacity: null, generatedAt: new Date().toISOString() };
    }
  }

  usage() { return { product: 'findam', ...this.observability.getSnapshot() }; }

  async alerts() {
    const [health, storage] = await Promise.all([this.health(), this.storage()]);
    const alerts: Array<{ code: string; severity: 'warning' | 'critical'; message: string }> = [];
    if (health.database.status !== 'healthy') alerts.push({ code: 'DATABASE_DOWN', severity: 'critical', message: 'Findam database is unavailable.' });
    if (storage.status === 'unavailable') alerts.push({ code: 'STORAGE_UNAVAILABLE', severity: 'warning', message: 'Findam storage capacity could not be read.' });
    return { product: 'findam', alerts, generatedAt: new Date().toISOString() };
  }
}
