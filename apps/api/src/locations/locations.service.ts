import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LocationSearchDto } from './dto/location-search.dto';

interface GeoapifyResult {
  place_id: string;
  formatted: string;
  name?: string;
  country?: string;
  country_code?: string;
  state?: string;
  county?: string;
  city?: string;
  district?: string;
  suburb?: string;
  postcode?: string;
  lat: number;
  lon: number;
  result_type?: string;
}

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async autocomplete(query: LocationSearchDto) {
    const apiKey = this.config.get<string>('geoapify.apiKey');
    if (!apiKey)
      throw new ServiceUnavailableException(
        'Location autocomplete is not configured',
      );

    const params = new URLSearchParams({
      text: query.q.trim(),
      format: 'json',
      limit: String(query.limit),
      lang: 'en',
      apiKey,
    });
    if (query.latitude !== undefined && query.longitude !== undefined)
      params.set('bias', `proximity:${query.longitude},${query.latitude}`);

    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?${params}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok) throw new Error(`Geoapify returned ${response.status}`);
      const data = (await response.json()) as { results?: GeoapifyResult[] };
      return (data.results ?? []).map((item) => ({
        id: item.place_id,
        provider: 'GEOAPIFY' as const,
        formattedAddress: item.formatted,
        name: item.name,
        countryName: item.country || 'Unknown',
        countryCode: item.country_code?.toUpperCase() || 'XX',
        stateName: item.state || item.county || item.country || 'Unknown',
        cityName:
          item.city || item.county || item.state || item.country || 'Unknown',
        areaName: item.suburb || item.district || item.city || item.name,
        postcode: item.postcode,
        latitude: item.lat,
        longitude: item.lon,
        resultType: item.result_type,
      }));
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new BadGatewayException(
        'Location search is temporarily unavailable',
      );
    }
  }
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
