import { Module } from '@nestjs/common';
import { ChannelService } from './services/channel.service';
import { SubscriptionCheckerService } from './services/subscription-checker.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ChannelService, SubscriptionCheckerService],
  exports: [ChannelService, SubscriptionCheckerService],
})
export class ChannelModule {}
