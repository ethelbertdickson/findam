import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { AdminResourcesService } from './admin-resources.service';
import { AdminListingsQueryDto } from './dto/admin-listings-query.dto';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';

@ApiTags('admin resources')
@Controller('admin')
@UseGuards(AdminRoleGuard)
export class AdminResourcesController {
  constructor(private readonly resources: AdminResourcesService) {}

  @Get('users')
  @ApiOperation({ summary: 'List and search users for administration' })
  getUsers(@Query() query: AdminUsersQueryDto) {
    return this.resources.getUsers(query);
  }

  @Get('listings')
  @ApiOperation({ summary: 'List and search listings for administration' })
  getListings(@Query() query: AdminListingsQueryDto) {
    return this.resources.getListings(query);
  }
}
