import { Module } from '@nestjs/common';
import { ProjectorProController } from './projectorpro.controller';
import { ProjectorProService } from './projectorpro.service';

@Module({
  controllers: [ProjectorProController],
  providers: [ProjectorProService],
})
export class ProjectorProModule {}
