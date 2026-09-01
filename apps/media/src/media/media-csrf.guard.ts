import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";

const ADMIN_CSRF_COOKIE = "findam_admin_csrf";
const ADMIN_CSRF_HEADER = "x-csrf-token";

@Injectable()
export class MediaCsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      cookies?: Record<string, string | undefined>;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const cookieToken = request.cookies?.[ADMIN_CSRF_COOKIE];
    const headerValue = request.headers[ADMIN_CSRF_HEADER];
    const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!cookieToken || !headerToken) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);
    if (
      cookieBuffer.length !== headerBuffer.length ||
      !timingSafeEqual(cookieBuffer, headerBuffer)
    ) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    return true;
  }
}
