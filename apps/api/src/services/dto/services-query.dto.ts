import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProfessionalCategory, ServiceListingStatus } from '@prisma/client';

export class ServicesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional({ enum: ProfessionalCategory }) @IsOptional() @IsEnum(ProfessionalCategory) category?: ProfessionalCategory;
  @ApiPropertyOptional({ enum: ServiceListingStatus }) @IsOptional() @IsEnum(ServiceListingStatus) status?: ServiceListingStatus;
}
