import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistrationCodeRequestDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(72) password!: string;
}

export class RegistrationCodeConfirmDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) @MaxLength(6) code!: string;
}
