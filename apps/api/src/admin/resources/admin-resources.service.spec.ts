import { ListingStatus, ListingType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminResourcesService } from './admin-resources.service';
import { AdminUserStatus } from './dto/admin-users-query.dto';

describe('AdminResourcesService', () => {
  const prisma = {
    user: { findMany: jest.fn(), count: jest.fn() },
    listing: { findMany: jest.fn(), count: jest.fn() },
  };
  const service = new AdminResourcesService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('paginates and filters users without selecting credentials', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
    prisma.user.count.mockResolvedValue(21);

    const resultPromise = service.getUsers({
      q: 'Ada',
      role: Role.AGENT,
      status: AdminUserStatus.ACTIVE,
      page: 2,
      limit: 20,
    });

    // Jest stores mock call arguments as `any`; narrow this captured Prisma query for assertions.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const usersArgs = prisma.user.findMany.mock.calls[0]?.[0] as unknown as {
      skip: number;
      take: number;
      where: { role: Role; isActive: boolean };
      select: Record<string, unknown>;
    };
    expect(usersArgs.skip).toBe(20);
    expect(usersArgs.take).toBe(20);
    expect(usersArgs.where).toEqual(
      expect.objectContaining({ role: Role.AGENT, isActive: true }),
    );
    expect(usersArgs.select).not.toHaveProperty('passwordHash');
    await expect(resultPromise).resolves.toEqual({
      items: [{ id: 'user-1' }],
      page: 2,
      limit: 20,
      total: 21,
      hasNextPage: false,
    });
  });

  it('excludes deleted listings and serializes decimal prices', async () => {
    prisma.listing.findMany.mockResolvedValue([
      {
        id: 'listing-1',
        title: 'A home',
        price: { toString: () => '350000.00' },
        images: [{ url: 'https://images.example/home.jpg' }],
      },
    ]);
    prisma.listing.count.mockResolvedValue(3);

    const resultPromise = service.getListings({
      q: '',
      type: ListingType.PROPERTY,
      status: ListingStatus.ACTIVE,
      page: 1,
      limit: 20,
    });

    const listingCalls = prisma.listing.findMany.mock.calls as unknown as Array<
      [unknown]
    >;
    const listingsArgs = listingCalls[0]?.[0] as {
      where: {
        deletedAt: null;
        type: ListingType;
        status: ListingStatus;
      };
    };
    expect(listingsArgs.where).toEqual(
      expect.objectContaining({
        deletedAt: null,
        type: ListingType.PROPERTY,
        status: ListingStatus.ACTIVE,
      }),
    );
    await expect(resultPromise).resolves.toEqual(
      expect.objectContaining({
        items: [
          {
            id: 'listing-1',
            title: 'A home',
            price: '350000.00',
            imageUrl: 'https://images.example/home.jpg',
          },
        ],
      }),
    );
  });
});
