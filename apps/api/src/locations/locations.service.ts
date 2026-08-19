import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}
  countries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }
  states(countryId: string) {
    return this.prisma.state.findMany({
      where: { countryId },
      orderBy: { name: 'asc' },
    });
  }
  cities(stateId: string) {
    return this.prisma.city.findMany({
      where: { stateId },
      orderBy: { name: 'asc' },
    });
  }
  areas(cityId: string) {
    return this.prisma.area.findMany({
      where: { cityId },
      orderBy: { name: 'asc' },
    });
  }
}
