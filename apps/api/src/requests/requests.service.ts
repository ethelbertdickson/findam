import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestsQueryDto } from './dto/requests-query.dto';

const include = { createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }, country: true, state: true, city: true } satisfies Prisma.UserRequestInclude;

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll(query: RequestsQueryDto) {
    const search = query.q?.trim();
    return this.prisma.userRequest.findMany({ where: { status: query.status ?? 'OPEN', ...(query.type ? { type: query.type } : {}), ...(query.serviceCategory ? { serviceCategory: query.serviceCategory } : {}), ...(query.cityId ? { cityId: query.cityId } : {}), ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] } : {}) }, include, orderBy: { createdAt: 'desc' }, take: 100 });
  }
  mine(userId: string) { return this.prisma.userRequest.findMany({ where: { createdById: userId }, include, orderBy: { createdAt: 'desc' } }); }
  async findOne(id: string) { const request = await this.prisma.userRequest.findUnique({ where: { id }, include }); if (!request) throw new NotFoundException('Request not found'); return request; }
  create(userId: string, dto: CreateRequestDto) { return this.prisma.userRequest.create({ data: { createdById: userId, type: dto.type, title: dto.title.trim(), description: dto.description.trim(), countryId: dto.countryId, stateId: dto.stateId, cityId: dto.cityId, budgetMin: dto.budgetMin, budgetMax: dto.budgetMax, bedrooms: dto.bedrooms, serviceCategory: dto.serviceCategory, contactMode: dto.contactMode || 'MANAGED' }, include }); }
}
