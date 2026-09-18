import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ProfessionalCategory, UserRequestType } from '@prisma/client';

export class CreateRequestDto {
  @ApiProperty({ enum: UserRequestType }) @IsEnum(UserRequestType) type!: UserRequestType;
  @ApiProperty() @IsString() @MaxLength(120) title!: string;
  @ApiProperty() @IsString() @MaxLength(3000) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() criteria?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() countryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() stateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budgetMax?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) bedrooms?: number;
  @ApiPropertyOptional({ enum: ProfessionalCategory }) @IsOptional() @IsEnum(ProfessionalCategory) serviceCategory?: ProfessionalCategory;
  @ApiProperty({ description: 'Required contact phone number' }) @IsString() @MinLength(5) contactPhone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactMode?: string;
}
