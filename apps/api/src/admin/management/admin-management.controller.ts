import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../../auth/types/jwt-payload.type';
import { AdminCsrfGuard } from '../auth/admin-csrf.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { AdminManagementService } from './admin-management.service';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';
import { ModerateListingDto } from './dto/moderate-listing.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('admin management')
@Controller('admin')
@UseGuards(AdminRoleGuard)
export class AdminManagementController {
  constructor(private readonly management: AdminManagementService) {}

  @Patch('users/:id/status')
  @UseGuards(AdminCsrfGuard)
  @ApiOperation({ summary: 'Activate or deactivate a non-admin account' })
  updateUserStatus(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('id') userId: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    return this.management.updateUserStatus(actor, userId, body.isActive);
  }

  @Patch('listings/:id/moderation')
  @UseGuards(AdminCsrfGuard)
  @ApiOperation({ summary: 'Approve, reject, or archive a listing' })
  moderateListing(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('id') listingId: string,
    @Body() body: ModerateListingDto,
  ) {
    return this.management.moderateListing(actor, listingId, body.action);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Read the administrator audit trail' })
  getAudit(@Query() query: AdminAuditQueryDto) {
    return this.management.getAuditLog(query);
  }
}
