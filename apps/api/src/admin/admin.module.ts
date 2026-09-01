import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminCsrfGuard } from './auth/admin-csrf.guard';
import { AdminRoleGuard } from './auth/admin-role.guard';
import { AdminDashboardController } from './dashboard/admin-dashboard.controller';
import { AdminDashboardService } from './dashboard/admin-dashboard.service';
import { AdminResourcesController } from './resources/admin-resources.controller';
import { AdminResourcesService } from './resources/admin-resources.service';
import { AdminManagementController } from './management/admin-management.controller';
import { AdminManagementService } from './management/admin-management.service';
import { AdminOperationsController } from './operations/admin-operations.controller';
import { AdminOperationsService } from './operations/admin-operations.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminResourcesController,
    AdminManagementController,
    AdminOperationsController,
  ],
  providers: [
    AdminAuthService,
    AdminCsrfGuard,
    AdminRoleGuard,
    AdminDashboardService,
    AdminResourcesService,
    AdminManagementService,
    AdminOperationsService,
  ],
})
export class AdminModule {}
