import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
