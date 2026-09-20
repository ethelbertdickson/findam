import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleDesktopAuthDto {
  @ApiProperty({ description: 'Google authorization code' })
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  code!: string;

  @ApiProperty({ description: 'PKCE code verifier' })
  @IsString()
  @MinLength(43)
  @MaxLength(128)
  codeVerifier!: string;

  @ApiProperty({ description: 'Loopback callback URI used by the desktop app' })
  @IsString()
  @MaxLength(300)
  redirectUri!: string;

  @ApiProperty({ description: 'Google OAuth desktop client ID' })
  @IsString()
  @MinLength(20)
  @MaxLength(300)
  clientId!: string;
}
