import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('admin dashboard')
@Controller('admin/dashboard')
@UseGuards(AdminRoleGuard)
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get live API and marketplace dashboard data' })
  getDashboard() {
    return this.dashboard.getDashboard();
  }
}
