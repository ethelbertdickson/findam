import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ProfessionalCategory } from '@prisma/client';

export class ProfessionalProfileDto {
  @ApiProperty({ enum: ProfessionalCategory }) @IsEnum(ProfessionalCategory) category!: ProfessionalCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) displayName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[];
  @ApiProperty({ description: 'Required public contact phone number' }) @IsString() @MinLength(5) phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsapp?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() website?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUrl({}, { each: true }) portfolioUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityId?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) serviceAreas?: string[];
}
