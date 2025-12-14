import { Module } from '@nestjs/common';
import { StatisticsHandler } from './handlers/statistics.handler';
import { FieldHandler } from './handlers/field.handler';
import { PaymentHandler } from './handlers/payment.handler';
import { BroadcastHandler } from './handlers/broadcast.handler';
import { ChannelHandler } from './handlers/channel.handler';
import { ContentHandler } from './handlers/content.handler';
import { AdminManagementHandler } from './handlers/admin-management.handler';
import { AdminModule } from './admin.module';
import { UserModule } from '../user/user.module';
import { ContentModule } from '../content/content.module';
import { FieldModule } from '../field/field.module';
import { PaymentModule } from '../payment/payment.module';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { ChannelModule } from '../channel/channel.module';

@Module({
  imports: [
    AdminModule,
    UserModule,
    ContentModule,
    FieldModule,
    PaymentModule,
    BroadcastModule,
    ChannelModule,
  ],
  providers: [
    StatisticsHandler,
    FieldHandler,
    PaymentHandler,
    BroadcastHandler,
    ChannelHandler,
    ContentHandler,
    AdminManagementHandler,
  ],
  exports: [
    StatisticsHandler,
    FieldHandler,
    PaymentHandler,
    BroadcastHandler,
    ChannelHandler,
    ContentHandler,
    AdminManagementHandler,
  ],
})
export class AdminHandlersModule {}
