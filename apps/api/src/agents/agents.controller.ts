import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type';
import { AgentProfileDto } from './dto/agent-profile.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { AgentsService } from './agents.service';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}
  @Public() @Get() findAll() {
    return this.agents.findAll();
  }
  @Get('me/profile') me(@CurrentUser() user: JwtAccessPayload) {
    return this.agents.findByUserId(user.sub);
  }
  @Public() @Get(':id') findOne(@Param('id') id: string) {
    return this.agents.findOne(id);
  }
  @Public() @Get(':id/listings') listings(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agents.listings(id, Number(page || 1), Number(limit || 20));
  }
  @Public() @Get(':id/ratings') ratings(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agents.ratings(id, Number(page || 1), Number(limit || 20));
  }
  @Post('me') saveProfile(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: AgentProfileDto,
  ) {
    return this.agents.upsert(user.sub, dto);
  }
  @Post(':id/ratings') rate(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.agents.rate(id, user.sub, dto);
  }
}
