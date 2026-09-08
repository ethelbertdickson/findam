import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalProfileDto } from './dto/professional-profile.dto';
import { ProfessionalsQueryDto } from './dto/professionals-query.dto';

const include = {
  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true } },
  country: { select: { id: true, name: true, code: true } },
  state: { select: { id: true, name: true } },
  city: { select: { id: true, name: true } },
} satisfies Prisma.ProfessionalProfileInclude;

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ProfessionalsQueryDto) {
    const search = query.q?.trim();
    return this.prisma.professionalProfile.findMany({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.countryId ? { countryId: query.countryId } : {}),
        ...(query.stateId ? { stateId: query.stateId } : {}),
        ...(query.cityId ? { cityId: query.cityId } : {}),
        ...(search ? { OR: [{ displayName: { contains: search, mode: 'insensitive' } }, { bio: { contains: search, mode: 'insensitive' } }, { specialties: { has: search } }] } : {}),
      },
      include,
      orderBy: [{ isVerified: 'desc' }, { averageRating: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  async findOne(id: string) {
    const profile = await this.prisma.professionalProfile.findUnique({ where: { id }, include });
    if (!profile) throw new NotFoundException('Professional not found');
    return profile;
  }

  async findByUserId(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({ where: { userId }, include });
    if (!profile) throw new NotFoundException('Professional profile not found');
    return profile;
  }

  upsert(userId: string, dto: ProfessionalProfileDto) {
    const data = {
      category: dto.category,
      displayName: dto.displayName?.trim() || null,
      bio: dto.bio?.trim() || null,
      specialties: dto.specialties ?? [],
      phone: dto.phone?.trim() || null,
      whatsapp: dto.whatsapp?.trim() || null,
      website: dto.website || null,
      portfolioUrls: dto.portfolioUrls ?? [],
      countryId: dto.countryId || null,
      stateId: dto.stateId || null,
      cityId: dto.cityId || null,
      serviceAreas: dto.serviceAreas ?? [],
    };
    return this.prisma.professionalProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data, include });
  }
}
