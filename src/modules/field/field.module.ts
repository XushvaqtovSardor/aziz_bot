import { Module } from '@nestjs/common';
import { FieldService } from './services/field.service';
import { DatabaseChannelService } from './services/database-channel.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FieldService, DatabaseChannelService],
  exports: [FieldService, DatabaseChannelService],
})
export class FieldModule {}
