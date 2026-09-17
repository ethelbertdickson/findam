import { Module } from '@nestjs/common';
import { ProjectorProController } from './projectorpro.controller';
import { ProjectorProService } from './projectorpro.service';
import { ProjectorProDownloadsService } from './projectorpro-downloads.service';

@Module({
  controllers: [ProjectorProController],
  providers: [ProjectorProService, ProjectorProDownloadsService],
})
export class ProjectorProModule {}
