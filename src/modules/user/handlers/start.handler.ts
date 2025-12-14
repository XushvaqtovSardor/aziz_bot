import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { Command, Update, Ctx, Hears, Action } from 'nestjs-telegraf';
import { UserService } from '../services/user.service';
import { LanguageService } from '../../language/language.service';
import { SubscriptionCheckerService } from '../../channel/services/subscription-checker.service';
import { MainMenuKeyboard } from '../keyboards/main-menu.keyboard';
import { AdminService } from '../../admin/services/admin.service';
import { SessionService } from '../../admin/services/session.service';
import { AdminKeyboard } from '../../admin/keyboards/admin-menu.keyboard';
import { Markup } from 'telegraf';

@Update()
@Injectable()
export class StartHandler {
  private readonly logger = new Logger(StartHandler.name);

  constructor(
    private userService: UserService,
    private languageService: LanguageService,
    private subscriptionChecker: SubscriptionCheckerService,
    private adminService: AdminService,
    private sessionService: SessionService,
  ) {}

  @Command('start')
  async handle(@Ctx() ctx: Context) {
    this.logger.log(`User ${ctx.from?.id} sent /start command`);
    const telegramUser = ctx.from;
    if (!telegramUser) return;

    // Clear any active admin sessions
    this.sessionService.clearSession(telegramUser.id);

    // Find or create user
    const user = await this.userService.findOrCreate(String(telegramUser.id), {
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
      languageCode: telegramUser.language_code,
    });

    // Check if user is blocked
    if (user.isBlocked) {
      const texts = await this.languageService.getTexts(user.language);
      await ctx.reply(texts.userBlocked);
      return;
    }

    // Update last activity
    await this.userService.updateLastActivity(String(user.telegramId));

    // Check if user is admin
    const admin = await this.adminService.getAdminByTelegramId(
      String(telegramUser.id),
    );
    if (admin) {
      this.logger.log(`Admin ${admin.telegramId} opened admin panel`);
      await ctx.reply(
        `👋 Assalomu alaykum, ${admin.username || 'Admin'}!\n\n🔐 Siz admin panelidasiz.`,
        AdminKeyboard.getAdminMainMenu(admin.role),
      );
      return;
    }

    // Get texts in user's language
    const texts = await this.languageService.getTexts(user.language);

    // Check subscription to mandatory channels
    const subscriptionStatus = await this.subscriptionChecker.checkSubscription(
      ctx.from!.id,
      ctx.telegram as any,
    );

    if (!subscriptionStatus.isSubscribed) {
      const buttons = subscriptionStatus.notSubscribedChannels.map(
        (channel) => [
          Markup.button.url(channel.channelName, channel.channelLink),
        ],
      );

      buttons.push([
        Markup.button.url(texts.checkSubscription, 'https://t.me/dummy'),
      ]);

      await ctx.reply(texts.mustSubscribe, Markup.inlineKeyboard(buttons));
      return;
    }

    // User is subscribed, show main menu
    const welcomeMessage = texts.welcomeMessage
      .replace('{firstName}', user.firstName || '')
      .replace(
        '{isPremium}',
        user.isPremium ? texts.premiumUser : texts.freeUser,
      );

    await ctx.reply(
      welcomeMessage,
      MainMenuKeyboard.getMainMenu(texts, user.isPremium),
    );
  }

  @Hears(['🔙 Orqaga', '🔙 Назад', '🔙 Back'])
  async handleBack(@Ctx() ctx: Context) {
    this.logger.log(`User ${ctx.from?.id} going back to main menu`);
    await this.handle(ctx);
  }

  @Action('check_subscription')
  async handleCheckSubscription(@Ctx() ctx: Context) {
    const telegramUser = ctx.from;
    if (!telegramUser) return;

    const user = await this.userService.findByTelegramId(
      String(telegramUser.id),
    );
    if (!user || user.isBlocked) return;

    const texts = await this.languageService.getTexts(user.language);

    // Check subscription again
    const subscriptionStatus = await this.subscriptionChecker.checkSubscription(
      ctx.from!.id,
      ctx.telegram as any,
    );

    if (!subscriptionStatus.isSubscribed) {
      await ctx.answerCbQuery(texts.notSubscribedYet);
      return;
    }

    // Subscribed successfully
    await ctx.answerCbQuery(texts.subscriptionVerified);
    await ctx.deleteMessage();

    const welcomeMessage = texts.welcomeMessage
      .replace('{firstName}', user.firstName || '')
      .replace(
        '{isPremium}',
        user.isPremium ? texts.premiumUser : texts.freeUser,
      );

    await ctx.reply(
      welcomeMessage,
      MainMenuKeyboard.getMainMenu(texts, user.isPremium),
    );
  }
}
