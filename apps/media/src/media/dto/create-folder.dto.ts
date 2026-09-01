import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateFolderDto {
  @IsString()
  @MaxLength(80)
  projectSlug!: string;

  @IsString()
  @MaxLength(80)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/, {
    message: "Folder name may contain letters, numbers, spaces, hyphens, and underscores only",
  })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  parentPath?: string;
}
