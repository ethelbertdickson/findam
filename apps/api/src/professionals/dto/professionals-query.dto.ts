import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ProfessionalCategory } from '@prisma/client';

export class ProfessionalsQueryDto {
  @ApiPropertyOptional({ enum: ProfessionalCategory }) @IsOptional() @IsEnum(ProfessionalCategory) category?: ProfessionalCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityId?: string;
  @ApiPropertyOptional({ description: 'Only profiles created on or after this ISO timestamp' }) @IsOptional() @IsDateString() createdAfter?: string;
}
