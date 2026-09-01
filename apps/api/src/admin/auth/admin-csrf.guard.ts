import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_HEADER,
} from '../../auth/constants/admin-session.constants';

@Injectable()
export class AdminCsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      cookies?: Record<string, string | undefined>;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const cookieToken = request.cookies?.[ADMIN_CSRF_COOKIE];
    const headerValue = request.headers[ADMIN_CSRF_HEADER];
    const headerToken = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);
    if (
      cookieBuffer.length !== headerBuffer.length ||
      !timingSafeEqual(cookieBuffer, headerBuffer)
    ) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
