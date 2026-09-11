import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { toPublicUser } from '../users/types/public-user.type';
import type { RegisterDto } from './dto/register.dto';
import type { AuthResult, AuthTokens } from './types/auth-result.type';
import type {
  JwtAccessPayload,
  JwtRefreshPayload,
} from './types/jwt-payload.type';
import { parseDurationMs } from './utils/duration.util';
import type { PasswordResetConfirmDto } from './dto/password-reset.dto';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';

const REFRESH_TOKEN_HASH_ROUNDS = 12;
const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.usersService.create(dto);
    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { ...tokens, user: toPublicUser(user) };
  }

  async requestRegistrationCode(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    if (await this.usersService.findByEmail(normalizedEmail))
      throw new ConflictException('An account with this email already exists');
    const mailKey = process.env.RESEND_API_KEY;
    const mailFrom = process.env.MAIL_FROM;
    if (!mailKey || !mailFrom)
      throw new ServiceUnavailableException('Email verification is not configured yet.');

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    await this.prisma.pendingRegistration.upsert({
      where: { email: normalizedEmail },
      create: { email: normalizedEmail, passwordHash, firstName: 'Projector', lastName: 'User', codeHash: createHash('sha256').update(code).digest('hex'), expiresAt: new Date(Date.now() + 15 * 60_000) },
      update: { passwordHash, codeHash: createHash('sha256').update(code).digest('hex'), expiresAt: new Date(Date.now() + 15 * 60_000), attempts: 0 },
    });
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mailKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: mailFrom, to: [normalizedEmail], subject: 'Your Projector Pro verification code', html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 15 minutes.</p>` }),
    });
    if (!response.ok) {
      await this.prisma.pendingRegistration.deleteMany({ where: { email: normalizedEmail } });
      throw new ServiceUnavailableException('Verification email could not be sent.');
    }
    return { message: 'A verification code was sent to your email.' };
  }

  async confirmRegistrationCode(email: string, code: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const pending = await this.prisma.pendingRegistration.findUnique({ where: { email: normalizedEmail } });
    if (!pending || pending.expiresAt < new Date() || pending.attempts >= 5)
      throw new UnauthorizedException('The verification code is invalid or expired.');
    const expected = Buffer.from(pending.codeHash, 'utf8');
    const actual = Buffer.from(createHash('sha256').update(code.trim()).digest('hex'), 'utf8');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await this.prisma.pendingRegistration.update({ where: { id: pending.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('The verification code is invalid or expired.');
    }
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: pending.passwordHash,
        firstName: pending.firstName,
        lastName: pending.lastName,
        role: 'USER',
      },
    });
    await this.prisma.pendingRegistration.delete({ where: { id: pending.id } });
    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { ...tokens, user: toPublicUser({ ...user, passwordHash: pending.passwordHash }) };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { ...tokens, user: toPublicUser(user) };
  }

  async google(idToken: string): Promise<AuthResult> {
    const audiences =
      this.configService.get<string[]>('google.clientIds') ?? [];
    if (!audiences.length) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google sign-in');
    }

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException('Google email could not be verified');
    }

    const user = await this.usersService.findOrCreateGoogleUser({
      googleId: payload.sub,
      email: payload.email,
      firstName: payload.given_name || payload.name?.split(' ')[0] || 'Google',
      lastName:
        payload.family_name ||
        payload.name?.split(' ').slice(1).join(' ') ||
        'User',
      avatarUrl: payload.picture,
    });

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { ...tokens, user: toPublicUser(user) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { accessToken, refreshToken: rotatedRefreshToken } =
      await this.refreshWithUser(refreshToken);
    return { accessToken, refreshToken: rotatedRefreshToken };
  }

  async refreshWithUser(refreshToken: string): Promise<AuthResult> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });
    if (!stored || stored.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Refresh token has expired or been revoked',
      );
    }

    const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
    if (!matches) {
      // Token id matched but content didn't: possible token theft — revoke it defensively.
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.getOrThrow(stored.userId);
    if (!user.isActive) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('This account has been deactivated');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return { ...tokens, user: toPublicUser(user) };
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken).catch(
      () => null,
    );
    if (!payload) {
      return;
    }

    await this.prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      // Email delivery is intentionally provider-agnostic; connect an email provider here.
      if (process.env.NODE_ENV !== 'production')
        return {
          message:
            'If the account exists, reset instructions have been created.',
          developmentToken: token,
        };
    }
    return {
      message: 'If the account exists, reset instructions have been sent.',
    };
  }

  async resetPassword(dto: PasswordResetConfirmDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.usedAt || record.expiresAt < new Date())
      throw new UnauthorizedException(
        'Invalid or expired password reset token',
      );
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: 'Password reset successfully' };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<JwtRefreshPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtRefreshPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const accessPayload: JwtAccessPayload = { sub: userId, email, role };
    const accessExpiresIn = this.configService.getOrThrow<string>(
      'jwt.accessExpiresIn',
    );
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: parseDurationMs(accessExpiresIn) / 1000,
    });

    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: '',
        expiresAt: new Date(Date.now() + parseDurationMs(refreshExpiresIn)),
      },
    });

    const refreshPayload: JwtRefreshPayload = {
      sub: userId,
      jti: refreshTokenRecord.id,
    };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: parseDurationMs(refreshExpiresIn) / 1000,
    });

    const tokenHash = await bcrypt.hash(
      refreshToken,
      REFRESH_TOKEN_HASH_ROUNDS,
    );
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { tokenHash },
    });

    return { accessToken, refreshToken };
  }
}
