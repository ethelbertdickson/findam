import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ enum: [Role.USER, Role.AGENT], default: Role.USER })
  @IsIn([Role.USER, Role.AGENT])
  role: Role = Role.USER;
}
