import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { Action, Update, Ctx, Hears } from 'nestjs-telegraf';
import { UserService } from '../services/user.service';
import { LanguageService } from '../../language/language.service';
import { PaymentService } from '../../payment/services/payment.service';
import { PremiumService } from '../../payment/services/premium.service';
import { MainMenuKeyboard } from '../keyboards/main-menu.keyboard';

@Update()
@Injectable()
export class PremiumHandler {
  private readonly logger = new Logger(PremiumHandler.name);

  constructor(
    private userService: UserService,
    private languageService: LanguageService,
    private paymentService: PaymentService,
    private premiumService: PremiumService,
  ) {}

  @Hears(['⭐️ Premium obuna', '⭐️ Premium подписка', '⭐️ Premium Subscription'])
  async showPremiumMenu(@Ctx() ctx: Context) {
    this.logger.log(`User ${ctx.from?.id} opened premium menu`);
    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);

    if (user.isPremium) {
      const premiumStatus = await this.premiumService.checkPremiumStatus(
        user.id,
      );
      const expiresText = premiumStatus.expiresAt
        ? new Date(premiumStatus.expiresAt).toLocaleDateString()
        : '';

      await ctx.reply(
        texts.alreadyPremium.replace('{expiresAt}', expiresText),
        MainMenuKeyboard.getMainMenu(texts, true),
      );
      return;
    }

    const settings = await this.premiumService.getPremiumSettings();

    const message =
      `${texts.premiumFeatures}\n\n` +
      `${texts.premiumPrices}:\n` +
      `1️⃣ ${texts.monthlyPremium} - ${settings.monthlyPrice} so'm\n` +
      `2️⃣ ${texts.threeMonthPremium} - ${settings.threeMonthPrice} so'm\n` +
      `3️⃣ ${texts.sixMonthPremium} - ${settings.sixMonthPrice} so'm\n` +
      `4️⃣ ${texts.yearlyPremium} - ${settings.yearlyPrice} so'm\n\n` +
      `💳 ${texts.cardNumber}: ${settings.cardNumber}\n` +
      `👤 ${texts.cardHolder}: ${settings.cardHolder}\n\n` +
      `${settings.description}`;

    await ctx.reply(message, MainMenuKeyboard.getPremiumMenu(texts));
  }

  @Action(/^buy_premium_(.+)$/)
  async handlePremiumPurchase(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    const duration = callbackQuery.data.replace('buy_premium_', '');
    this.logger.log(`User ${ctx.from?.id} buying premium: ${duration}`);
    await ctx.answerCbQuery();

    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);
    const settings = await this.premiumService.getPremiumSettings();

    let amount: number;
    let durationMonths: number;

    // duration from callback_data is in months: 1, 3, 6, 12
    const months = parseInt(duration);

    if (months === 1) {
      amount = settings.monthlyPrice;
      durationMonths = 30;
    } else if (months === 3) {
      amount = settings.threeMonthPrice;
      durationMonths = 90;
    } else if (months === 6) {
      amount = settings.sixMonthPrice;
      durationMonths = 180;
    } else if (months === 12) {
      amount = settings.yearlyPrice;
      durationMonths = 365;
    } else {
      return;
    }

    // TODO: Save plan details to session when session is implemented
    // For now, just show instructions to send receipt
    await ctx.reply(
      `${texts.premiumPrices}\n\n` +
        `💰 To'lov summasi: ${amount} so'm\n` +
        `⏱ Muddat: ${months} oy\n\n` +
        texts.sendReceipt,
      MainMenuKeyboard.getBackButton(texts),
    );
  }

  // TODO: Add @On('photo') handler when receipt upload is implemented
  async handleReceiptPhoto(ctx: Context, photoFileId: string) {
    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);

    // Check if there's a pending payment
    // const session = ctx.session as any;
    const session = { pendingPayment: null } as any;
    if (!session?.pendingPayment) {
      await ctx.reply(texts.noPendingPayment);
      return;
    }

    // Create payment record
    const payment = await this.paymentService.create(
      user.id,
      session.pendingPayment.amount,
      photoFileId,
    );

    // Clear pending payment
    delete session.pendingPayment;

    await ctx.reply(
      texts.receiptReceived,
      MainMenuKeyboard.getMainMenu(texts, user.isPremium),
    );

    // Notify admins about new payment (optional)
    // You can send notification to admin notification chat here
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
