import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type';
import { ProfessionalProfileDto } from './dto/professional-profile.dto';
import { ProfessionalsQueryDto } from './dto/professionals-query.dto';
import { ProfessionalsService } from './professionals.service';

@ApiTags('professionals')
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}
  @Public() @Get() findAll(@Query() query: ProfessionalsQueryDto) { return this.professionals.findAll(query); }
  @Get('me/profile') me(@CurrentUser() user: JwtAccessPayload) { return this.professionals.findByUserId(user.sub); }
  @Post('me') save(@CurrentUser() user: JwtAccessPayload, @Body() dto: ProfessionalProfileDto) { return this.professionals.upsert(user.sub, dto); }
  @Post('managed') managed(@CurrentUser() user: JwtAccessPayload, @Body() dto: ProfessionalProfileDto) { return this.professionals.createManaged(user.sub, dto); }
  @Public() @Get(':id') findOne(@Param('id') id: string) { return this.professionals.findOne(id); }
}
