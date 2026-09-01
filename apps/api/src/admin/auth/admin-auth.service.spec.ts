import { UnauthorizedException } from '@nestjs/common';
import { Role, type User } from '@prisma/client';
import { AuthService } from '../../auth/auth.service';
import type { AuthResult } from '../../auth/types/auth-result.type';
import { UsersService } from '../../users/users.service';
import type { PublicUser } from '../../users/types/public-user.type';
import { AdminAuthService } from './admin-auth.service';

describe('AdminAuthService', () => {
  const adminUser: User = {
    id: 'admin-id',
    email: 'admin@findam.test',
    phone: null,
    passwordHash: 'hash',
    googleId: null,
    firstName: 'Findam',
    lastName: 'Admin',
    avatarUrl: null,
    role: Role.ADMIN,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const authService = {
    login: jest.fn(),
    refreshWithUser: jest.fn(),
    logout: jest.fn(),
  };
  const usersService = {
    getOrThrow: jest.fn(),
  };
  const service = new AdminAuthService(
    authService as unknown as AuthService,
    usersService as unknown as UsersService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('allows active administrators to sign in', async () => {
    const result = authResult(Role.ADMIN);
    authService.login.mockResolvedValue(result);

    await expect(
      service.login('admin@findam.test', 'valid-password'),
    ).resolves.toEqual(result);
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('revokes a newly issued token when a non-admin attempts console login', async () => {
    authService.login.mockResolvedValue(authResult(Role.AGENT));

    await expect(
      service.login('agent@findam.test', 'valid-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
  });

  it('rejects an administrator whose account is no longer active', async () => {
    usersService.getOrThrow.mockResolvedValue({
      ...adminUser,
      isActive: false,
    });

    await expect(service.getAdmin(adminUser.id)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('creates unpredictable CSRF tokens', () => {
    const first = service.createCsrfToken();
    const second = service.createCsrfToken();

    expect(first).toHaveLength(43);
    expect(second).toHaveLength(43);
    expect(first).not.toBe(second);
  });
});

function authResult(role: Role): AuthResult {
  const publicUser: PublicUser = {
    id: `${role.toLowerCase()}-id`,
    email: `${role.toLowerCase()}@findam.test`,
    phone: null,
    firstName: 'Test',
    lastName: role,
    avatarUrl: null,
    role,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: publicUser,
  };
}
