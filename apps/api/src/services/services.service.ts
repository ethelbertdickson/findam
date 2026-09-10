import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceListingDto } from './dto/service-listing.dto';
import { ServicesQueryDto } from './dto/services-query.dto';

const include = { provider: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } }, city: true, state: true } } } satisfies Prisma.ServiceListingInclude;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ServicesQueryDto) {
    const search = query.q?.trim();
    return this.prisma.serviceListing.findMany({
      where: { status: query.status ?? 'ACTIVE', ...(query.category ? { category: query.category } : {}), ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }, { serviceAreas: { has: search } }] } : {}) },
      include, orderBy: { createdAt: 'desc' }, take: 100,
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.serviceListing.findUnique({ where: { id }, include });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async create(userId: string, dto: ServiceListingDto) {
    let providerId = dto.providerId;
    if (providerId) {
      const managed = await this.prisma.professionalProfile.findFirst({ where: { id: providerId, OR: [{ managedById: userId }, { userId }] } });
      if (!managed) throw new NotFoundException('Managed professional not found');
    } else {
      const own = await this.prisma.professionalProfile.findUnique({ where: { userId } });
      if (!own) throw new NotFoundException('Create a professional profile first');
      providerId = own.id;
    }
    return this.prisma.serviceListing.create({ data: { providerId, createdById: userId, title: dto.title.trim(), description: dto.description.trim(), category: dto.category, serviceAreas: dto.serviceAreas ?? [], priceFrom: dto.priceFrom, priceTo: dto.priceTo, }, include });
  }
}
