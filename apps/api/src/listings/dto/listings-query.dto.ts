import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ListingType,
  PropertyType,
  PropertyOfferType,
  HouseholdCategory,
  HouseholdCondition,
  LandTenure,
} from '@prisma/client';

export class ListingsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional({ enum: ListingType })
  @IsOptional()
  @IsEnum(ListingType)
  type?: ListingType;
  @ApiPropertyOptional() @IsOptional() @IsString() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() areaId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;
  @ApiPropertyOptional({ enum: PropertyOfferType })
  @IsOptional()
  @IsEnum(PropertyOfferType)
  offerType?: PropertyOfferType;
  @ApiPropertyOptional({ minimum: 0, maximum: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  bedrooms?: number;
  @ApiPropertyOptional({ enum: LandTenure })
  @IsOptional()
  @IsEnum(LandTenure)
  tenure?: LandTenure;
  @ApiPropertyOptional({ enum: HouseholdCategory })
  @IsOptional()
  @IsEnum(HouseholdCategory)
  category?: HouseholdCategory;
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(HouseholdCondition)
  condition?: HouseholdCondition;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
  @ApiPropertyOptional({
    description: 'Radius in kilometres for nearby searches',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(100)
  radiusKm?: number;
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  // Internal restriction populated by the nearby query; never accepted from HTTP directly.
  @IsOptional() @IsArray() @IsString({ each: true }) ids?: string[];
}
