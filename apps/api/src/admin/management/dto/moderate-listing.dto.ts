import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ListingModerationAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ARCHIVE = 'ARCHIVE',
}

export class ModerateListingDto {
  @ApiProperty({ enum: ListingModerationAction })
  @IsEnum(ListingModerationAction)
  action!: ListingModerationAction;
}
