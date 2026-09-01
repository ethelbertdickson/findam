import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthService } from '../../auth/auth.service';
import type { AuthResult } from '../../auth/types/auth-result.type';
import { UsersService } from '../../users/users.service';
import { toPublicUser } from '../../users/types/public-user.type';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const result = await this.authService.login(email, password);
    return this.requireAdmin(result);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const result = await this.authService.refreshWithUser(refreshToken);
    return this.requireAdmin(result);
  }

  async getAdmin(userId: string) {
    const user = await this.usersService.getOrThrow(userId);
    if (!user.isActive || user.role !== Role.ADMIN) {
      throw new UnauthorizedException(
        'Administrator session is no longer valid',
      );
    }
    return toPublicUser(user);
  }

  logout(refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  createCsrfToken() {
    return randomBytes(32).toString('base64url');
  }

  private async requireAdmin(result: AuthResult): Promise<AuthResult> {
    if (result.user.role !== Role.ADMIN || !result.user.isActive) {
      await this.authService.logout(result.refreshToken);
      throw new UnauthorizedException('Invalid email or password');
    }
    return result;
  }
}
