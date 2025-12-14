import { Module } from '@nestjs/common';
import { StartHandler } from './handlers/start.handler';
import { LanguageHandler } from './handlers/language.handler';
import { SearchHandler } from './handlers/search.handler';
import { PremiumHandler } from './handlers/premium.handler';
import { AboutHandler } from './handlers/about.handler';
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
  providers: [
    StartHandler,
    LanguageHandler,
    SearchHandler,
    PremiumHandler,
    AboutHandler,
  ],
  exports: [
    StartHandler,
    LanguageHandler,
    SearchHandler,
    PremiumHandler,
    AboutHandler,
  ],
})
export class UserHandlersModule {}
