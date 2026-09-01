import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

const ADMIN_ACCESS_COOKIE = "findam_admin_access";

@Injectable()
export class AdminMediaGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const bearer = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    const token = bearer ?? request.cookies?.[ADMIN_ACCESS_COOKIE];
    if (!token) throw new UnauthorizedException("Administrator session required");

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; role: string }>(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET,
        },
      );
      if (payload.role !== "ADMIN") throw new ForbiddenException("Administrator access required");
      (request as Request & { user?: typeof payload }).user = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException("Administrator session is invalid or expired");
    }
  }
}
