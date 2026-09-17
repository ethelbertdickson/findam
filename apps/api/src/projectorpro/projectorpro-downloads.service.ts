import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DownloadEventStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const PRODUCT = 'projectorpro';

@Injectable()
export class ProjectorProDownloadsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async publicStats() {
    const [started, completed, byPlatform] = await Promise.all([
      this.prisma.downloadEvent.count({ where: { product: PRODUCT } }),
      this.prisma.downloadEvent.count({ where: { product: PRODUCT, status: DownloadEventStatus.COMPLETED } }),
      this.prisma.downloadEvent.groupBy({ by: ['platform', 'status'], where: { product: PRODUCT }, _count: { _all: true } }),
    ]);
    const root = resolve(this.config.get<string>('DOWNLOAD_ROOT') ?? '/var/lib/findam/downloads');
    return { product: PRODUCT, downloadsStarted: started, downloadsCompleted: completed, byPlatform, availablePlatforms: ['windows', 'linux', 'macos'].filter((platform) => Boolean(findLatestFile(join(root, PRODUCT, platform)))) };
  }

  async streamLatest(request: Request, response: Response, requestedPlatform: string) {
    const platform = normalizePlatform(requestedPlatform);
    if (!platform) throw new NotFoundException('This platform is not supported.');
    const root = resolve(this.config.get<string>('DOWNLOAD_ROOT') ?? '/var/lib/findam/downloads');
    const directory = join(root, PRODUCT, platform);
    const filePath = findLatestFile(directory);
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) throw new NotFoundException('No release is available for this platform yet.');
    const version = this.config.get<string>('PROJECTORPRO_DOWNLOAD_VERSION') ?? 'latest';
    const ip = request.headers['x-forwarded-for']?.toString().split(',')[0].trim() ?? request.ip;
    const salt = this.config.get<string>('DOWNLOAD_IP_SALT') ?? 'findam-downloads';
    const ipHash = ip ? createHash('sha256').update(`${salt}:${ip}`).digest('hex') : undefined;
    const countryCode = (request.headers['cf-ipcountry'] ?? request.headers['x-country-code'])?.toString().toUpperCase();
    const event = await this.prisma.downloadEvent.create({ data: { product: PRODUCT, version, platform, ipHash, countryCode, continent: continentFor(countryCode), userAgent: request.headers['user-agent']?.slice(0, 500), referrer: request.headers.referer?.slice(0, 500) } });
    response.setHeader('Content-Type', mimeFor(filePath));
    response.setHeader('Content-Disposition', `attachment; filename="${basename(filePath)}"`);
    response.setHeader('Content-Length', statSync(filePath).size);
    const stream = createReadStream(filePath);
    response.on('finish', () => void this.prisma.downloadEvent.update({ where: { id: event.id }, data: { status: response.statusCode < 400 ? DownloadEventStatus.COMPLETED : DownloadEventStatus.FAILED, completedAt: new Date() } }).catch(() => undefined));
    stream.on('error', () => { void this.prisma.downloadEvent.update({ where: { id: event.id }, data: { status: DownloadEventStatus.FAILED } }).catch(() => undefined); response.destroy(); });
    stream.pipe(response);
  }
}

function normalizePlatform(value: string) {
  const normalized = value.trim().toLowerCase();
  return ['windows', 'linux', 'macos'].includes(normalized) ? normalized : undefined;
}

function findLatestFile(directory: string) {
  if (!existsSync(directory)) return undefined;
  const filename = readdirSync(directory).find((item) => /^ProjectorPro-latest\./i.test(item));
  return filename ? join(directory, filename) : undefined;
}

function mimeFor(filePath: string) {
  if (filePath.endsWith('.dmg')) return 'application/x-apple-diskimage';
  if (filePath.endsWith('.msi')) return 'application/x-msi';
  if (filePath.endsWith('.deb')) return 'application/vnd.debian.binary-package';
  if (filePath.endsWith('.exe')) return 'application/vnd.microsoft.portable-executable';
  return 'application/octet-stream';
}

function continentFor(country?: string) {
  if (!country) return undefined;
  const africa = new Set(['NG','GH','KE','ZA','EG','RW','UG','TZ','ET','CI','SN','CM','MA','DZ','TN']);
  const europe = new Set(['GB','FR','DE','ES','IT','NL','PT','IE','SE','NO','DK','FI','CH']);
  const americas = new Set(['US','CA','BR','MX','AR','CL']);
  const asia = new Set(['IN','CN','JP','SG','AE','SA','IL']);
  if (africa.has(country)) return 'Africa';
  if (europe.has(country)) return 'Europe';
  if (americas.has(country)) return 'Americas';
  if (asia.has(country)) return 'Asia';
  if (country === 'AU' || country === 'NZ') return 'Oceania';
  return undefined;
}
