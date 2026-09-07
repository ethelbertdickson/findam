import { Controller, Get, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable, catchError, from, interval, map, of, startWith, switchMap } from 'rxjs';
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

  @Sse('stream')
  @ApiOperation({ summary: 'Stream live dashboard updates' })
  stream(): Observable<MessageEvent> {
    return interval(15_000).pipe(
      startWith(0),
      switchMap(() => from(this.dashboard.getDashboard())),
      map((data) => ({ data })),
      catchError(() => of({ data: { error: 'Dashboard update unavailable' } })),
    );
  }
}
