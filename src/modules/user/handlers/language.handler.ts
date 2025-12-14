import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { Action, Update, Ctx, Hears } from 'nestjs-telegraf';
import { UserService } from '../services/user.service';
import { LanguageService } from '../../language/language.service';
import { MainMenuKeyboard } from '../keyboards/main-menu.keyboard';
import { Language } from '@prisma/client';

@Update()
@Injectable()
export class LanguageHandler {
  private readonly logger = new Logger(LanguageHandler.name);

  constructor(
    private userService: UserService,
    private languageService: LanguageService,
  ) {}

  @Hears(["🌐 Tilni o'zgartirish", '🌐 Изменить язык', '🌐 Change Language'])
  async showLanguageMenu(@Ctx() ctx: Context) {
    this.logger.log(`User ${ctx.from?.id} requesting language menu`);
    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);

    await ctx.reply(
      texts.selectLanguage,
      MainMenuKeyboard.getLanguageMenu(texts),
    );
  }

  @Action(/^lang_(.+)$/)
  async handleLanguageSelection(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    this.logger.log(`User ${ctx.from?.id} changing language`);
    await ctx.answerCbQuery();

    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const languageCode = callbackQuery.data.replace('lang_', '');
    let newLanguage: Language;

    if (languageCode === 'uz') {
      newLanguage = Language.UZ;
    } else if (languageCode === 'ru') {
      newLanguage = Language.RU;
    } else if (languageCode === 'en') {
      newLanguage = Language.EN;
    } else {
      return;
    }

    // Update user language
    await this.userService.updateLanguage(String(user.telegramId), newLanguage);

    // Get new texts
    const texts = await this.languageService.getTexts(newLanguage);

    await ctx.reply(
      texts.languageChanged,
      MainMenuKeyboard.getMainMenu(texts, user.isPremium),
    );
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
