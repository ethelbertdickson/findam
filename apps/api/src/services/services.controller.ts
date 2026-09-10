import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type';
import { ServiceListingDto } from './dto/service-listing.dto';
import { ServicesQueryDto } from './dto/services-query.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}
  @Public() @Get() findAll(@Query() query: ServicesQueryDto) { return this.services.findAll(query); }
  @Public() @Get(':id') findOne(@Param('id') id: string) { return this.services.findOne(id); }
  @Post() create(@CurrentUser() user: JwtAccessPayload, @Body() dto: ServiceListingDto) { return this.services.create(user.sub, dto); }
}
