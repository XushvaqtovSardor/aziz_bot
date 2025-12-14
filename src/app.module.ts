import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotModule } from './bot/bot.module';
import { PrismaModule } from './prisma/prisma.module';
import { LanguageModule } from './modules/language/language.module';
import { AdminModule } from './modules/admin/admin.module';
import { FieldModule } from './modules/field/field.module';
import { ChannelModule } from './modules/channel/channel.module';
import { ContentModule } from './modules/content/content.module';
import { PaymentModule } from './modules/payment/payment.module';
import { UserModule } from './modules/user/user.module';
import { BroadcastModule } from './modules/broadcast/broadcast.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UserHandlersModule } from './modules/user/user-handlers.module';
import { AdminHandlersModule } from './modules/admin/admin-handlers.module';
import { APP_FILTER } from '@nestjs/core';
import { TelegrafExceptionFilter } from './common/filters/telegraf-exception.filter';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TelegrafModule.forRoot({
      token: process.env.BOT_TOKEN as string,
    }),
    LanguageModule,
    AdminModule,
    FieldModule,
    ChannelModule,
    ContentModule,
    PaymentModule,
    UserModule,
    BroadcastModule,
    SettingsModule,
    UserHandlersModule,
    AdminHandlersModule,
    BotModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: TelegrafExceptionFilter,
    },
  ],
})
export class AppModule {}
