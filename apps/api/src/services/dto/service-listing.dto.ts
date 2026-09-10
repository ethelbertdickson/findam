import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProfessionalCategory } from '@prisma/client';

export class ServiceListingDto {
  @ApiProperty() @IsString() @MaxLength(120) title!: string;
  @ApiProperty() @IsString() @MaxLength(3000) description!: string;
  @ApiProperty({ enum: ProfessionalCategory }) @IsEnum(ProfessionalCategory) category!: ProfessionalCategory;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) serviceAreas?: string[];
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceFrom?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) priceTo?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() providerId?: string;
}
