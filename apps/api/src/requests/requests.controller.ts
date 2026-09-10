import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestsQueryDto } from './dto/requests-query.dto';
import { RequestsService } from './requests.service';

@ApiTags('requests')
@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}
  @Public() @Get() all(@Query() query: RequestsQueryDto) { return this.requests.findAll(query); }
  @Get('mine') mine(@CurrentUser() user: JwtAccessPayload) { return this.requests.mine(user.sub); }
  @Public() @Get(':id') one(@Param('id') id: string) { return this.requests.findOne(id); }
  @Post() create(@CurrentUser() user: JwtAccessPayload, @Body() dto: CreateRequestDto) { return this.requests.create(user.sub, dto); }
}
