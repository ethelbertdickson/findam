import { ForbiddenException } from '@nestjs/common';
import { AdminAuditAction, ListingStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminManagementService } from './admin-management.service';
import { ListingModerationAction } from './dto/moderate-listing.dto';

describe('AdminManagementService', () => {
  const transaction = {
    user: { update: jest.fn() },
    listing: { update: jest.fn() },
    adminAuditLog: { create: jest.fn() },
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    listing: { findFirst: jest.fn() },
    adminAuditLog: { findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new AdminManagementService(
    prisma as unknown as PrismaService,
  );
  const actor = {
    sub: 'admin-1',
    email: 'admin@findam.test',
    role: Role.ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
  });

  it('refuses to deactivate the current administrator', async () => {
    await expect(
      service.updateUserStatus(actor, actor.sub, false),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses console changes to another administrator', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-2',
      role: Role.ADMIN,
      isActive: true,
    });

    await expect(
      service.updateUserStatus(actor, 'admin-2', false),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deactivates a non-admin and creates an audit entry in the same transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: Role.USER,
      isActive: true,
    });
    transaction.user.update.mockResolvedValue({
      id: 'user-1',
      isActive: false,
    });

    await expect(
      service.updateUserStatus(actor, 'user-1', false),
    ).resolves.toEqual({
      id: 'user-1',
      isActive: false,
      unchanged: false,
    });

    expect(transaction.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        action: AdminAuditAction.USER_DEACTIVATED,
        actorId: actor.sub,
        targetType: 'USER',
        targetId: 'user-1',
        metadata: { previousIsActive: true, isActive: false },
      },
    });
  });

  it('approves a listing and records its previous status', async () => {
    prisma.listing.findFirst.mockResolvedValue({
      id: 'listing-1',
      status: ListingStatus.PENDING,
    });
    transaction.listing.update.mockResolvedValue({
      id: 'listing-1',
      status: ListingStatus.ACTIVE,
    });

    await expect(
      service.moderateListing(
        actor,
        'listing-1',
        ListingModerationAction.APPROVE,
      ),
    ).resolves.toEqual({
      id: 'listing-1',
      status: ListingStatus.ACTIVE,
      unchanged: false,
    });

    expect(transaction.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        action: AdminAuditAction.LISTING_APPROVED,
        actorId: actor.sub,
        targetType: 'LISTING',
        targetId: 'listing-1',
        metadata: {
          previousStatus: ListingStatus.PENDING,
          status: ListingStatus.ACTIVE,
        },
      },
    });
  });
});
