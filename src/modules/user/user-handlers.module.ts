import { Module } from '@nestjs/common';
import { UserHandler } from './user.handler';
import { UserModule } from './user.module';
import { LanguageModule } from '../language/language.module';
import { ChannelModule } from '../channel/channel.module';
import { ContentModule } from '../content/content.module';
import { PaymentModule } from '../payment/payment.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminModule } from '../admin/admin.module';
@Module({
  imports: [
    UserModule,
    LanguageModule,
    ChannelModule,
    ContentModule,
    PaymentModule,
    SettingsModule,
    AdminModule,
  ],
  providers: [UserHandler],
  exports: [UserHandler],
})
export class UserHandlersModule {}
