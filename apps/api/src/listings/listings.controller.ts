import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type';
import { ListingsQueryDto } from './dto/listings-query.dto';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@ApiTags('listings')
@Controller()
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Public() @Get('listings') findAll(@Query() query: ListingsQueryDto) {
    return this.listings.findAll(query);
  }
  @Public() @Get('properties') properties(@Query() query: ListingsQueryDto) {
    return this.listings.findAll({ ...query, type: 'PROPERTY' as const });
  }
  @Public() @Get('lands') lands(@Query() query: ListingsQueryDto) {
    return this.listings.findAll({ ...query, type: 'LAND' as const });
  }
  @Public() @Get('household') household(@Query() query: ListingsQueryDto) {
    return this.listings.findAll({ ...query, type: 'HOUSEHOLD' as const });
  }
  @Public() @Get('listings/nearby') findNearby(
    @Query() query: ListingsQueryDto,
  ) {
    return this.listings.findNearby(query);
  }
  @Public() @Get('listings/:id') findOne(@Param('id') id: string) {
    return this.listings.findOne(id);
  }
  @Get('my-listings') mine(@CurrentUser() user: JwtAccessPayload) {
    return this.listings.mine(user.sub);
  }
  @Post('listings') create(
    @CurrentUser() user: JwtAccessPayload,
    @Body() dto: CreateListingDto,
  ) {
    return this.listings.create(user.sub, dto);
  }
  @Patch('listings/:id') update(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listings.update(user.sub, id, dto);
  }
  @Delete('listings/:id') remove(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
  ) {
    return this.listings.remove(user.sub, id);
  }
  @Get('favorites') favorites(@CurrentUser() user: JwtAccessPayload) {
    return this.listings.favorites(user.sub);
  }
  @Post('favorites/:listingId') favorite(
    @CurrentUser() user: JwtAccessPayload,
    @Param('listingId') listingId: string,
  ) {
    return this.listings.setFavorite(user.sub, listingId, true);
  }
  @Delete('favorites/:listingId') unfavorite(
    @CurrentUser() user: JwtAccessPayload,
    @Param('listingId') listingId: string,
  ) {
    return this.listings.setFavorite(user.sub, listingId, false);
  }
}
