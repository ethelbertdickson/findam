import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Role } from '@prisma/client';

export class AccountModeDto {
  @ApiProperty({ enum: [Role.USER, Role.AGENT] })
  @IsIn([Role.USER, Role.AGENT])
  mode!: 'USER' | 'AGENT';
}
