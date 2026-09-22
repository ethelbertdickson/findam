import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class AssetsQueryDto {
  @IsString()
  @MaxLength(80)
  projectSlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  folderPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  createdAfter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  createdBefore?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  uploadedBy?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 30;
}
