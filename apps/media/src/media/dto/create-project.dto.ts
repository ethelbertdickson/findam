import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MaxLength(80)
  @Matches(/\S/, { message: "Project name is required" })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Project slug must use lowercase letters, numbers, and hyphens",
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;
}
