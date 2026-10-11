import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IntegrationKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const expected = this.config.get<string>('integration.apiKey');
    const provided = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>().headers['x-integration-key'];
    if (!expected || typeof provided !== 'string') throw new UnauthorizedException('Integration key required');
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
      throw new UnauthorizedException('Invalid integration key');
    }
    return true;
  }
}
