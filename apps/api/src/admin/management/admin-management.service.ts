import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminAuditAction, ListingStatus, Prisma, Role } from '@prisma/client';
import type { JwtAccessPayload } from '../../auth/types/jwt-payload.type';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { ListingModerationAction } from './dto/moderate-listing.dto';

@Injectable()
export class AdminManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async updateUserStatus(
    actor: JwtAccessPayload,
    userId: string,
    isActive: boolean,
  ) {
    if (actor.sub === userId) {
      throw new ForbiddenException('You cannot change your own access status');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.role === Role.ADMIN) {
      throw new ForbiddenException('Administrator accounts are protected');
    }

    if (target.isActive === isActive) {
      return { id: target.id, isActive: target.isActive, unchanged: true };
    }

    const action = isActive
      ? AdminAuditAction.USER_ACTIVATED
      : AdminAuditAction.USER_DEACTIVATED;

    const user = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: userId },
        data: { isActive },
        select: { id: true, isActive: true },
      });
      await transaction.adminAuditLog.create({
        data: {
          action,
          actorId: actor.sub,
          targetType: 'USER',
          targetId: userId,
          metadata: { previousIsActive: target.isActive, isActive },
        },
      });
      return updated;
    });

    return { ...user, unchanged: false };
  }

  async moderateListing(
    actor: JwtAccessPayload,
    listingId: string,
    moderationAction: ListingModerationAction,
  ) {
    const target = await this.prisma.listing.findFirst({
      where: { id: listingId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!target) throw new NotFoundException('Listing not found');

    const { status, action } = listingModerationResult(moderationAction);
    if (target.status === status) {
      return { id: target.id, status: target.status, unchanged: true };
    }

    const listing = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.listing.update({
        where: { id: listingId },
        data: { status },
        select: { id: true, status: true },
      });
      await transaction.adminAuditLog.create({
        data: {
          action,
          actorId: actor.sub,
          targetType: 'LISTING',
          targetId: listingId,
          metadata: {
            previousStatus: target.status,
            status,
          },
        },
      });
      return updated;
    });

    return { ...listing, unchanged: false };
  }

  async getAuditLog(query: AdminAuditQueryDto) {
    const where: Prisma.AdminAuditLogWhereInput = query.action
      ? { action: query.action }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          metadata: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items,
      page: query.page,
      limit: query.limit,
      total,
      hasNextPage: query.page * query.limit < total,
    };
  }
}

function listingModerationResult(action: ListingModerationAction) {
  switch (action) {
    case ListingModerationAction.APPROVE:
      return {
        status: ListingStatus.ACTIVE,
        action: AdminAuditAction.LISTING_APPROVED,
      };
    case ListingModerationAction.REJECT:
      return {
        status: ListingStatus.REJECTED,
        action: AdminAuditAction.LISTING_REJECTED,
      };
    case ListingModerationAction.ARCHIVE:
      return {
        status: ListingStatus.ARCHIVED,
        action: AdminAuditAction.LISTING_ARCHIVED,
      };
    default:
      throw new BadRequestException('Unsupported listing moderation action');
  }
}
