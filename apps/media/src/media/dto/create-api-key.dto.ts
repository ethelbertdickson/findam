import { IsString, Matches, MaxLength } from "class-validator";

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(80)
  @Matches(/\S/, { message: "API key name is required" })
  name!: string;
}
