import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  HouseholdCategory,
  HouseholdCondition,
  AgencyFeeType,
  LandTenure,
  ListingType,
  MeasurementUnit,
  PropertyType,
  PropertyOfferType,
  RentPeriod,
} from '@prisma/client';

export class PropertyDetailsDto {
  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  propertyType!: PropertyType;
  @ApiPropertyOptional({
    enum: PropertyOfferType,
    default: PropertyOfferType.RENT,
  })
  @IsOptional()
  @IsEnum(PropertyOfferType)
  offerType?: PropertyOfferType;
  @ApiProperty({ enum: RentPeriod })
  @IsEnum(RentPeriod)
  rentPeriod!: RentPeriod;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24)
  bedrooms?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24)
  bathrooms?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24)
  toilets?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24)
  parking?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFurnished?: boolean;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;
  @ApiPropertyOptional({ enum: AgencyFeeType, default: AgencyFeeType.FLAT })
  @IsOptional()
  @IsEnum(AgencyFeeType)
  agencyFeeType?: AgencyFeeType;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agencyFee?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  legalFee?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cautionFee?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  serviceCharge?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherCharges?: number;
}

export class LandDetailsDto {
  @ApiProperty({ enum: LandTenure }) @IsEnum(LandTenure) tenure!: LandTenure;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numberOfPlots?: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) landSize!: number;
  @ApiProperty({ enum: MeasurementUnit })
  @IsEnum(MeasurementUnit)
  measurementUnit!: MeasurementUnit;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentsAvailable?: string[];
}

export class HouseholdDetailsDto {
  @ApiProperty({ enum: HouseholdCategory })
  @IsEnum(HouseholdCategory)
  category!: HouseholdCategory;
  @ApiProperty({ enum: HouseholdCondition })
  @IsEnum(HouseholdCondition)
  condition!: HouseholdCondition;
}

export class CreateListingDto {
  @ApiProperty({ enum: ListingType }) @IsEnum(ListingType) type!: ListingType;
  @ApiProperty() @IsString() @MaxLength(120) title!: string;
  @ApiProperty() @IsString() @MaxLength(5000) description!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) price!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() areaId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() areaName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images?: string[];
  @ApiPropertyOptional({ type: PropertyDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PropertyDetailsDto)
  propertyDetails?: PropertyDetailsDto;
  @ApiPropertyOptional({ type: LandDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LandDetailsDto)
  landDetails?: LandDetailsDto;
  @ApiPropertyOptional({ type: HouseholdDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HouseholdDetailsDto)
  householdDetails?: HouseholdDetailsDto;
}
