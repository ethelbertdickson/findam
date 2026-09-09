import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type';
import { ProjectorProService } from './projectorpro.service';

@ApiTags('projectorpro')
@Controller('projectorpro')
export class ProjectorProController {
  constructor(private readonly service: ProjectorProService) {}

  @Public()
  @Get('credits/packages')
  @ApiOperation({ summary: 'List Projector Pro Deepgram credit packages' })
  packages() {
    return this.service.packages();
  }

  @Get('credits/balance')
  @ApiBearerAuth()
  balance(@CurrentUser() user: JwtAccessPayload) {
    return this.service.balance(user.sub, user.role === 'ADMIN');
  }

  @Post('credits/checkout')
  @ApiBearerAuth()
  checkout(
    @CurrentUser() user: JwtAccessPayload,
    @Body('packageCode') packageCode: string,
  ) {
    return this.service.initializeCheckout(user.sub, packageCode);
  }

  @Post('deepgram/token')
  @ApiBearerAuth()
  token(
    @CurrentUser() user: JwtAccessPayload,
    @Body('installationId') installationId: string,
    @Body('deviceFingerprint') deviceFingerprint: string,
  ) {
    return this.service.issueDeepgramToken(user.sub, installationId, deviceFingerprint, user.role === 'ADMIN');
  }

  @Public()
  @Post('payments/paystack/webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Process signed Paystack payment events' })
  webhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() request: { rawBody?: Buffer; body: unknown },
  ) {
    return this.service.processPaystackWebhook(signature, request.rawBody, request.body);
  }
}
