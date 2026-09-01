import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../../auth/types/jwt-payload.type';
import { AdminCsrfGuard } from '../auth/admin-csrf.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { AdminOperationsService } from './admin-operations.service';
import { TaskRunsQueryDto } from './dto/task-runs-query.dto';

@ApiTags('admin operations')
@Controller('admin')
@UseGuards(AdminRoleGuard)
export class AdminOperationsController {
  constructor(private readonly operations: AdminOperationsService) {}

  @Get('monitoring')
  @ApiOperation({
    summary: 'Get live API request metrics and dependency checks',
  })
  getMonitoring() {
    return this.operations.getMonitoring();
  }

  @Get('tasks/runs')
  @ApiOperation({ summary: 'List tracked operational task runs' })
  getTaskRuns(@Query() query: TaskRunsQueryDto) {
    return this.operations.getTaskRuns(query.page, query.limit);
  }

  @Post('tasks/database-health-check')
  @UseGuards(AdminCsrfGuard)
  @ApiOperation({ summary: 'Run and record a PostgreSQL health check' })
  runDatabaseHealthCheck(@CurrentUser() actor: JwtAccessPayload) {
    return this.operations.runDatabaseHealthCheck(actor);
  }
}
