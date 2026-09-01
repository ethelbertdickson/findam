import { Logger } from '@nestjs/common';
import { ListingStatus, ListingType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService', () => {
  const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  const prisma = {
    $queryRaw: jest.fn(),
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    agentProfile: {
      count: jest.fn(),
    },
    listing: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const service = new AdminDashboardService(prisma as unknown as PrismaService);

  afterAll(() => loggerSpy.mockRestore());

  beforeEach(() => jest.clearAllMocks());

  it('returns live marketplace totals and recent activity', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    prisma.user.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(3);
    prisma.agentProfile.count.mockResolvedValue(4);
    prisma.listing.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(14)
      .mockResolvedValueOnce(5);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        firstName: 'Ada',
        lastName: 'Okon',
        role: Role.USER,
        createdAt: new Date('2026-09-01T00:02:00.000Z'),
      },
    ]);
    prisma.listing.findMany.mockResolvedValue([
      {
        id: 'listing-1',
        title: 'Two bedroom flat',
        type: ListingType.PROPERTY,
        status: ListingStatus.ACTIVE,
        createdAt: new Date('2026-09-01T00:01:00.000Z'),
        city: { name: 'Calabar' },
      },
    ]);

    const result = await service.getDashboard();

    expect(result.api.status).toBe('healthy');
    expect(result.database.status).toBe('healthy');
    expect(result.marketplace).toEqual({
      usersTotal: 12,
      usersActive: 11,
      agentsTotal: 4,
      listingsTotal: 20,
      listingsActive: 14,
      newUsersSevenDays: 3,
      newListingsSevenDays: 5,
    });
    expect(result.recentActivity).toHaveLength(2);
    expect(result.recentActivity[0].kind).toBe('USER_REGISTERED');
  });

  it('reports degraded health when the database cannot be reached', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));

    const result = await service.getDashboard();

    expect(result.api.status).toBe('degraded');
    expect(result.database).toEqual({ status: 'down', latencyMs: null });
    expect(result.marketplace).toBeNull();
    expect(result.recentActivity).toEqual([]);
  });
});
