import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google-issued OpenID Connect ID token' })
  @IsString()
  @MinLength(20)
  idToken: string;
}
