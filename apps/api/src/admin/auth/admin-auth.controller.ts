import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  Body,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_CSRF_COOKIE,
  ADMIN_REFRESH_COOKIE,
} from '../../auth/constants/admin-session.constants';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { LoginDto } from '../../auth/dto/login.dto';
import type { AuthTokens } from '../../auth/types/auth-result.type';
import type { JwtAccessPayload } from '../../auth/types/jwt-payload.type';
import { parseDurationMs } from '../../auth/utils/duration.util';
import { AdminAuthService } from './admin-auth.service';
import { AdminCsrfGuard } from './admin-csrf.guard';
import { AdminRoleGuard } from './admin-role.guard';

@ApiTags('admin auth')
@Controller('admin/auth')
export class AdminAuthController {
  private readonly adminPath: string;
  private readonly secureCookies: boolean;

  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly config: ConfigService,
  ) {
    const prefix = this.config.get<string>('apiPrefix') ?? 'api/v1';
    this.adminPath = `/${prefix.replace(/^\/+|\/+$/g, '')}/admin`;
    this.secureCookies = this.config.get<string>('nodeEnv') === 'production';
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Start an administrator browser session' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.adminAuth.login(dto.email, dto.password);
    const csrfToken = this.setSessionCookies(response, result);
    this.disableCaching(response);
    return { user: result.user, csrfToken };
  }

  @Public()
  @Get('csrf')
  @ApiOperation({ summary: 'Issue a CSRF token for session refresh' })
  csrf(@Res({ passthrough: true }) response: Response) {
    const csrfToken = this.setCsrfCookie(response);
    this.disableCaching(response);
    return { csrfToken };
  }

  @Public()
  @UseGuards(AdminCsrfGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh an administrator browser session' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[ADMIN_REFRESH_COOKIE] as
      string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Administrator session has expired');
    }

    const result = await this.adminAuth.refresh(refreshToken);
    const csrfToken = this.setSessionCookies(response, result);
    this.disableCaching(response);
    return { user: result.user, csrfToken };
  }

  @UseGuards(AdminRoleGuard)
  @Get('session')
  @ApiOperation({ summary: 'Get the current administrator session' })
  async session(
    @CurrentUser() currentUser: JwtAccessPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.adminAuth.getAdmin(currentUser.sub);
    const csrfToken = this.setCsrfCookie(response);
    this.disableCaching(response);
    return { user, csrfToken };
  }

  @Public()
  @UseGuards(AdminCsrfGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({ summary: 'End an administrator browser session' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[ADMIN_REFRESH_COOKIE] as
      string | undefined;
    if (refreshToken) {
      await this.adminAuth.logout(refreshToken);
    }
    this.clearSessionCookies(response);
    this.disableCaching(response);
  }

  private setSessionCookies(response: Response, tokens: AuthTokens) {
    response.cookie(
      ADMIN_ACCESS_COOKIE,
      tokens.accessToken,
      this.cookieOptions(
        parseDurationMs(
          this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
        ),
      ),
    );
    response.cookie(
      ADMIN_REFRESH_COOKIE,
      tokens.refreshToken,
      this.cookieOptions(
        parseDurationMs(
          this.config.get<string>('jwt.refreshExpiresIn') ?? '30d',
        ),
      ),
    );
    return this.setCsrfCookie(response);
  }

  private setCsrfCookie(response: Response) {
    const csrfToken = this.adminAuth.createCsrfToken();
    response.cookie(
      ADMIN_CSRF_COOKIE,
      csrfToken,
      this.cookieOptions(24 * 60 * 60 * 1000),
    );
    return csrfToken;
  }

  private clearSessionCookies(response: Response) {
    const options = this.cookieOptions();
    response.clearCookie(ADMIN_ACCESS_COOKIE, options);
    response.clearCookie(ADMIN_REFRESH_COOKIE, options);
    response.clearCookie(ADMIN_CSRF_COOKIE, options);
  }

  private cookieOptions(maxAge?: number): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'strict',
      path: this.adminPath,
      ...(maxAge === undefined ? {} : { maxAge }),
    };
  }

  private disableCaching(response: Response) {
    response.setHeader('Cache-Control', 'no-store');
  }
}
