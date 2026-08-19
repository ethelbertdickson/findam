import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}
  @Public() @Get('countries') countries() {
    return this.locations.countries();
  }
  @Public() @Get('countries/:countryId/states') states(
    @Param('countryId') id: string,
  ) {
    return this.locations.states(id);
  }
  @Public() @Get('states/:stateId/cities') cities(
    @Param('stateId') id: string,
  ) {
    return this.locations.cities(id);
  }
  @Public() @Get('cities/:cityId/areas') areas(@Param('cityId') id: string) {
    return this.locations.areas(id);
  }
}
