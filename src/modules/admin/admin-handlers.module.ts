import { Module } from '@nestjs/common';
import { AdminHandler } from './admin.handler';
import { AdminContentHandler } from './handlers/admin-content.handler';
import { AdminChannelsHandler } from './handlers/admin-channels.handler';
import { AdminPaymentsHandler } from './handlers/admin-payments.handler';
import { AdminManagementHandler } from './handlers/admin-management.handler';
import { AdminModule } from './admin.module';
import { UserModule } from '../user/user.module';
import { ContentModule } from '../content/content.module';
import { FieldModule } from '../field/field.module';
import { PaymentModule } from '../payment/payment.module';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { ChannelModule } from '../channel/channel.module';
import { SettingsModule } from '../settings/settings.module';

/**
 * Admin Handlers Module - Barcha admin handlerlarni boshqaradi
 * Handler'lar professional tarzda 5 ta alohida fayllarga bo'lingan
 */
@Module({
  imports: [
    AdminModule,
    UserModule,
    ContentModule,
    FieldModule,
    PaymentModule,
    BroadcastModule,
    ChannelModule,
    SettingsModule,
  ],
  providers: [
    AdminHandler, // Asosiy handler - statistika va umumiy funksiyalar
    AdminContentHandler, // Kino va field boshqaruvi
    AdminChannelsHandler, // Kanal boshqaruvi
    AdminPaymentsHandler, // To'lovlar boshqaruvi
    AdminManagementHandler, // Admin va sozlamalar boshqaruvi
  ],
  exports: [
    AdminHandler,
    AdminContentHandler,
    AdminChannelsHandler,
    AdminPaymentsHandler,
    AdminManagementHandler,
  ],
})
export class AdminHandlersModule {}
