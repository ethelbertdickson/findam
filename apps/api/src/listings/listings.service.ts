import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingType, Prisma, ListingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListingsQueryDto } from './dto/listings-query.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

const listingInclude = {
  images: { orderBy: { position: 'asc' as const } },
  owner: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      agentProfile: { select: { id: true } },
    },
  },
  country: { select: { id: true, name: true, code: true } },
  state: { select: { id: true, name: true } },
  city: { select: { id: true, name: true } },
  area: { select: { id: true, name: true } },
  propertyDetails: true,
  landDetails: true,
  householdDetails: true,
} satisfies Prisma.ListingInclude;

function serialize<T extends { price: Prisma.Decimal }>(listing: T) {
  return { ...listing, price: Number(listing.price) };
}

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListingsQueryDto) {
    const searchTerms = query.q?.trim().split(/\s+/).filter(Boolean) ?? [];
    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.ACTIVE,
      deletedAt: null,
      ...(query.type && { type: query.type }),
      ...(query.countryId && { countryId: query.countryId }),
      ...(query.stateId && { stateId: query.stateId }),
      ...(query.cityId && { cityId: query.cityId }),
      ...(query.areaId && { areaId: query.areaId }),
      ...(query.ids && { id: { in: query.ids } }),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined && { gte: query.minPrice }),
              ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
            },
          }
        : {}),
      ...(searchTerms.length
        ? {
            AND: searchTerms.map((term) => ({
              OR: [
                { title: { contains: term, mode: 'insensitive' as const } },
                { description: { contains: term, mode: 'insensitive' as const } },
                { formattedAddress: { contains: term, mode: 'insensitive' as const } },
                { country: { name: { contains: term, mode: 'insensitive' as const } } },
                { state: { name: { contains: term, mode: 'insensitive' as const } } },
                { city: { name: { contains: term, mode: 'insensitive' as const } } },
                { area: { name: { contains: term, mode: 'insensitive' as const } } },
              ],
            })),
          }
        : {}),
      ...(query.propertyType || query.offerType || query.bedrooms !== undefined || query.isCoRenting !== undefined
        ? {
            propertyDetails: {
              ...(query.propertyType && { propertyType: query.propertyType }),
              ...(query.offerType && { offerType: query.offerType }),
              ...(query.bedrooms !== undefined && { bedrooms: query.bedrooms }),
              ...(query.isCoRenting !== undefined && { isCoRenting: query.isCoRenting }),
            },
          }
        : {}),
      ...(query.tenure ? { landDetails: { tenure: query.tenure } } : {}),
      ...(query.category || query.condition
        ? {
            householdDetails: {
              ...(query.category && { category: query.category }),
              ...(query.condition && { condition: query.condition }),
            },
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        include: listingInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.listing.count({ where }),
    ]);
    return {
      items: items.map(serialize),
      page: query.page,
      limit: query.limit,
      total,
      hasNextPage: skip + items.length < total,
    };
  }

  async findNearby(query: ListingsQueryDto) {
    if (
      query.latitude === undefined ||
      query.longitude === undefined ||
      query.radiusKm === undefined
    )
      return this.findAll(query);
    const radiusMeters = query.radiusKm * 1000;
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Listing"
      WHERE "deletedAt" IS NULL AND "status" = 'ACTIVE' AND location IS NOT NULL
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography, ${radiusMeters})
    `;
    return this.findAll({ ...query, ids: rows.map((row) => row.id) });
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id,
        deletedAt: null,
        status: {
          notIn: [
            ListingStatus.DRAFT,
            ListingStatus.REJECTED,
            ListingStatus.ARCHIVED,
          ],
        },
      },
      include: listingInclude,
    });
    if (!listing) throw new NotFoundException('Listing not found');
    return serialize(listing);
  }

  async favorites(userId: string) {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      include: { listing: { include: listingInclude } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => serialize(row.listing));
  }

  async mine(ownerId: string) {
    const items = await this.prisma.listing.findMany({
      where: { ownerId, deletedAt: null },
      include: listingInclude,
      orderBy: { createdAt: 'desc' },
    });
    return items.map(serialize);
  }

  private async locationIds(dto: CreateListingDto) {
    if (dto.countryId && dto.stateId && dto.cityId)
      return {
        countryId: dto.countryId,
        stateId: dto.stateId,
        cityId: dto.cityId,
        areaId: dto.areaId,
      };
    const countryCode = (dto.countryCode || 'NG').trim().toUpperCase();
    const country = await this.prisma.country.upsert({
      where: { code: countryCode },
      update: {},
      create: { name: dto.countryName || countryCode, code: countryCode },
    });
    const state = await this.prisma.state.upsert({
      where: {
        countryId_name: {
          countryId: country.id,
          name: dto.stateName || 'Cross River',
        },
      },
      update: {},
      create: { countryId: country.id, name: dto.stateName || 'Cross River' },
    });
    const city = await this.prisma.city.upsert({
      where: {
        stateId_name: { stateId: state.id, name: dto.cityName || 'Calabar' },
      },
      update: {},
      create: { stateId: state.id, name: dto.cityName || 'Calabar' },
    });
    const area = dto.areaName
      ? await this.prisma.area.upsert({
          where: { cityId_name: { cityId: city.id, name: dto.areaName } },
          update: {},
          create: { cityId: city.id, name: dto.areaName },
        })
      : null;
    return {
      countryId: country.id,
      stateId: state.id,
      cityId: city.id,
      areaId: area?.id,
    };
  }

  async create(ownerId: string, dto: CreateListingDto) {
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { role: true },
    });
    if (owner?.role !== 'AGENT' && owner?.role !== 'ADMIN')
      throw new ForbiddenException(
        'Enable agent mode before publishing a listing',
      );
    if (dto.type === ListingType.PROPERTY && !dto.propertyDetails)
      throw new BadRequestException(
        'Property details are required for property listings',
      );
    if (dto.type === ListingType.LAND && !dto.landDetails)
      throw new BadRequestException(
        'Land details are required for land listings',
      );
    if (dto.type === ListingType.HOUSEHOLD && !dto.householdDetails)
      throw new BadRequestException(
        'Household details are required for household listings',
      );
    const locations = await this.locationIds(dto);
    const listing = await this.prisma.listing.create({
      data: {
        ownerId,
        type: dto.type,
        title: dto.title.trim(),
        description: dto.description.trim(),
        price: dto.price,
        status: ListingStatus.ACTIVE,
        ...locations,
        latitude: dto.latitude,
        longitude: dto.longitude,
        formattedAddress: dto.formattedAddress,
        locationProvider: dto.locationProvider,
        locationPlaceId: dto.locationPlaceId,
        images: dto.images
          ? { create: dto.images.map((url, position) => ({ url, position })) }
          : undefined,
        propertyDetails:
          dto.type === ListingType.PROPERTY && dto.propertyDetails
            ? { create: dto.propertyDetails }
            : undefined,
        landDetails:
          dto.type === ListingType.LAND && dto.landDetails
            ? { create: dto.landDetails }
            : undefined,
        householdDetails:
          dto.type === ListingType.HOUSEHOLD && dto.householdDetails
            ? { create: dto.householdDetails }
            : undefined,
      },
      include: listingInclude,
    });
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.prisma
        .$executeRaw`UPDATE "Listing" SET location = ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography WHERE id = ${listing.id}`;
    }
    return serialize(listing);
  }

  async update(ownerId: string, id: string, dto: UpdateListingDto) {
    const existing = await this.prisma.listing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Listing not found');
    if (existing.ownerId !== ownerId)
      throw new ForbiddenException('You do not own this listing');
    if (dto.type && dto.type !== existing.type)
      throw new BadRequestException('A listing type cannot be changed');
    const hasLocationUpdate = [
      dto.countryId,
      dto.stateId,
      dto.cityId,
      dto.areaId,
      dto.countryName,
      dto.stateName,
      dto.cityName,
      dto.areaName,
      dto.countryCode,
      dto.formattedAddress,
      dto.locationProvider,
      dto.locationPlaceId,
    ].some((value) => value !== undefined);
    const locations = hasLocationUpdate
      ? await this.locationIds(dto as CreateListingDto)
      : {};
    const listing = await this.prisma.listing.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.description && { description: dto.description.trim() }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...locations,
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.formattedAddress !== undefined && {
          formattedAddress: dto.formattedAddress,
        }),
        ...(dto.locationProvider !== undefined && {
          locationProvider: dto.locationProvider,
        }),
        ...(dto.locationPlaceId !== undefined && {
          locationPlaceId: dto.locationPlaceId,
        }),
        ...(dto.images !== undefined && {
          images: {
            deleteMany: {},
            create: dto.images.map((url, position) => ({ url, position })),
          },
        }),
        ...(dto.propertyDetails && {
          propertyDetails: {
            upsert: {
              create: dto.propertyDetails,
              update: dto.propertyDetails,
            },
          },
        }),
        ...(dto.landDetails && {
          landDetails: {
            upsert: {
              create: dto.landDetails,
              update: dto.landDetails,
            },
          },
        }),
        ...(dto.householdDetails && {
          householdDetails: {
            upsert: {
              create: dto.householdDetails,
              update: dto.householdDetails,
            },
          },
        }),
        status: ListingStatus.ACTIVE,
      },
      include: listingInclude,
    });
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.prisma
        .$executeRaw`UPDATE "Listing" SET location = ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography WHERE id = ${listing.id}`;
    }
    return serialize(listing);
  }

  async remove(ownerId: string, id: string) {
    const existing = await this.prisma.listing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Listing not found');
    if (existing.ownerId !== ownerId)
      throw new ForbiddenException('You do not own this listing');
    await this.prisma.listing.update({
      where: { id },
      data: { deletedAt: new Date(), status: ListingStatus.ARCHIVED },
    });
    return { deleted: true };
  }

  async setFavorite(userId: string, listingId: string, enabled: boolean) {
    await this.findOne(listingId);
    if (enabled)
      await this.prisma.favorite.upsert({
        where: { userId_listingId: { userId, listingId } },
        create: { userId, listingId },
        update: {},
      });
    else
      await this.prisma.favorite.deleteMany({ where: { userId, listingId } });
    return { favorited: enabled };
  }
}
