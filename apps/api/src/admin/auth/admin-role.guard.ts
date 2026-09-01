import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { JwtAccessPayload } from '../../auth/types/jwt-payload.type';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: JwtAccessPayload;
    }>();

    if (request.user?.role !== Role.ADMIN) {
      throw new ForbiddenException('Administrator access required');
    }

    return true;
  }
}
