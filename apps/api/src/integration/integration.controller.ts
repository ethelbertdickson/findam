import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IntegrationKeyGuard } from './integration-key.guard';
import { IntegrationService } from './integration.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('integration')
@ApiHeader({ name: 'x-integration-key', required: true, description: 'Control Centre service key' })
@Controller('integration')
@Public()
@UseGuards(IntegrationKeyGuard)
export class IntegrationController {
  constructor(private readonly integration: IntegrationService) {}

  @Get('health')
  @ApiOperation({ summary: 'Read-only product health for the Control Centre' })
  health() { return this.integration.health(); }

  @Get('metrics/users')
  @ApiOperation({ summary: 'Read-only user totals for the Control Centre' })
  users() { return this.integration.users(); }

  @Get('metrics/storage')
  @ApiOperation({ summary: 'Read-only storage usage for the Control Centre' })
  storage() { return this.integration.storage(); }

  @Get('metrics/usage')
  @ApiOperation({ summary: 'Read-only API usage for the Control Centre' })
  usage() { return this.integration.usage(); }

  @Get('alerts')
  @ApiOperation({ summary: 'Read-only product alerts for the Control Centre' })
  alerts() { return this.integration.alerts(); }
}
