import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ObservabilityModule } from '../observability/observability.module';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { IntegrationKeyGuard } from './integration-key.guard';

@Module({
  imports: [PrismaModule, ObservabilityModule],
  controllers: [IntegrationController],
  providers: [IntegrationService, IntegrationKeyGuard],
})
export class IntegrationModule {}
