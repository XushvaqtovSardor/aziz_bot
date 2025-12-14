import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { Action, Update, Ctx, Hears } from 'nestjs-telegraf';
import { UserService } from '../services/user.service';
import { LanguageService } from '../../language/language.service';
import { SettingsService } from '../../settings/services/settings.service';
import { Markup } from 'telegraf';

@Update()
@Injectable()
export class AboutHandler {
  private readonly logger = new Logger(AboutHandler.name);

  constructor(
    private userService: UserService,
    private languageService: LanguageService,
    private settingsService: SettingsService,
  ) {}

  @Hears(['ℹ️ Bot haqida', 'ℹ️ О боте', 'ℹ️ About Bot'])
  async showAboutInfo(@Ctx() ctx: Context) {
    this.logger.log(`User ${ctx.from?.id} opened about page`);
    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);
    const settings = await this.settingsService.getSettings();

    const aboutMessage = `${texts.aboutBot}\n\n${settings.aboutBot}`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.url(
          texts.supportButton,
          `https://t.me/${settings.supportUsername}`,
        ),
      ],
    ]);

    await ctx.reply(aboutMessage, keyboard);
  }

  private async getUserFromContext(ctx: Context) {
    const telegramUser = ctx.from;
    if (!telegramUser) return null;

    const user = await this.userService.findByTelegramId(
      String(telegramUser.id),
    );
    if (!user || user.isBlocked) return null;

    await this.userService.updateLastActivity(String(user.telegramId));
    return user;
  }
}
