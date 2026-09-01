import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ADMIN_ACCESS_COOKIE } from '../constants/admin-session.constants';
import type { JwtAccessPayload } from '../types/jwt-payload.type';

const adminCookieExtractor = (request: Request): string | null =>
  (request.cookies?.[ADMIN_ACCESS_COOKIE] as string | undefined) ?? null;

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        adminCookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  validate(payload: JwtAccessPayload): JwtAccessPayload {
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
