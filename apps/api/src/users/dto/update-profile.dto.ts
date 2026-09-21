import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsUrl() avatarUrl?: string;
  @ApiPropertyOptional({ description: 'Managed media asset replaced when the avatar changes' })
  @IsOptional()
  @IsUUID()
  avatarMediaId?: string | null;
  @ApiPropertyOptional({ enum: ['NGN', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'ZAR', 'GHS', 'KES'] })
  @IsOptional()
  @IsIn(['NGN', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'ZAR', 'GHS', 'KES'])
  currencyCode?: string;
}
