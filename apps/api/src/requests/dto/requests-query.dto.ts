import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProfessionalCategory, UserRequestStatus, UserRequestType } from '@prisma/client';

export class RequestsQueryDto {
  @ApiPropertyOptional({ enum: UserRequestType }) @IsOptional() @IsEnum(UserRequestType) type?: UserRequestType;
  @ApiPropertyOptional({ enum: UserRequestStatus }) @IsOptional() @IsEnum(UserRequestStatus) status?: UserRequestStatus;
  @ApiPropertyOptional({ enum: ProfessionalCategory }) @IsOptional() @IsEnum(ProfessionalCategory) serviceCategory?: ProfessionalCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cityId?: string;
}
