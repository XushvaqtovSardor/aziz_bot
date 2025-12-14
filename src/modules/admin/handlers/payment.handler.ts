import { Injectable } from '@nestjs/common';
import { Update, Hears, Action, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { PaymentService } from '../../payment/services/payment.service';
import { PremiumService } from '../../payment/services/premium.service';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';
import { Markup } from 'telegraf';

@Update()
@Injectable()
export class PaymentHandler {
  constructor(
    private adminService: AdminService,
    private paymentService: PaymentService,
    private premiumService: PremiumService,
  ) {}

  @Hears("💳 To'lovlar")
  async showPaymentMenu(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    const hasPermission = await this.adminService.hasPermission(
      String(admin.telegramId),
      'APPROVE_PAYMENTS',
    );

    if (!hasPermission) {
      await ctx.reply("❌ Sizda bu bo'limga kirish huquqi yo'q.");
      return;
    }

    await ctx.reply(
      "💳 To'lovlarni boshqarish",
      AdminKeyboard.getPaymentManagementMenu(),
    );
  }

  @Hears("📥 Yangi to'lovlar")
  async showPendingPayments(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    const payments = await this.paymentService.findPending();

    if (!payments.length) {
      await ctx.reply("📭 Yangi to'lovlar yo'q.");
      return;
    }

    await ctx.reply(`📥 Yangi to\'lovlar: ${payments.length} ta`);

    for (const payment of payments) {
      const user = payment.user;
      const message = `
💳 **To'lov #${payment.id}**

👤 Foydalanuvchi:
├ Ism: ${user.firstName} ${user.lastName || ''}
├ Username: @${user.username || "yo'q"}
└ ID: ${user.telegramId}

💰 Summa: ${payment.amount.toLocaleString()} so'm
📅 Sana: ${payment.createdAt.toLocaleDateString()}
      `.trim();

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '✅ Tasdiqlash',
            `approve_payment_${payment.id}`,
          ),
          Markup.button.callback(
            '❌ Rad etish',
            `reject_payment_${payment.id}`,
          ),
        ],
      ]);

      await ctx.replyWithPhoto(payment.receiptFileId, {
        caption: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup,
      });
    }
  }

  @Action(/^approve_payment_(\d+)$/)
  async approvePayment(@Ctx() ctx: Context) {
    const match = (ctx.callbackQuery as any).data.match(
      /^approve_payment_(\d+)$/,
    );
    const paymentId = parseInt(match[1]);
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    const hasPermission = await this.adminService.hasPermission(
      String(admin.telegramId),
      'APPROVE_PAYMENTS',
    );

    if (!hasPermission) {
      await ctx.answerCbQuery("❌ Sizda ruxsat yo'q.");
      return;
    }

    // Get admin ID from database
    const adminData = await this.adminService.getAdminByTelegramId(
      String(admin.telegramId),
    );
    if (!adminData) return;

    // Approve payment - default 30 days for monthly plan
    // In production, you should store the selected plan duration
    const payment = await this.paymentService.approve(
      paymentId,
      adminData.id,
      30,
    );

    await ctx.editMessageCaption(
      `✅ To'lov tasdiqlandi!\n\nFoydalanuvchi ${payment.userId} ga premium aktivlashtirildi.`,
      { parse_mode: 'Markdown' },
    );

    await ctx.answerCbQuery("✅ To'lov tasdiqlandi!");

    // TODO: Add user relation include in payment query
    // Notify user
    // try {
    //   await ctx.telegram.sendMessage(
    //     payment.user.telegramId,
    //     "🎉 Tabriklaymiz! To'lovingiz tasdiqlandi va premium faollashtirildi.",
    //   );
    // } catch (error) {
    //   // User might have blocked the bot
    // }
  }

  @Action(/^reject_payment_(\d+)$/)
  async rejectPayment(@Ctx() ctx: Context) {
    const match = (ctx.callbackQuery as any).data.match(
      /^reject_payment_(\d+)$/,
    );
    const paymentId = parseInt(match[1]);
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    const hasPermission = await this.adminService.hasPermission(
      String(admin.telegramId),
      'APPROVE_PAYMENTS',
    );

    if (!hasPermission) {
      await ctx.answerCbQuery("❌ Sizda ruxsat yo'q.");
      return;
    }

    // Get admin ID from database
    const adminData = await this.adminService.getAdminByTelegramId(
      String(admin.telegramId),
    );
    if (!adminData) return;

    const payment = await this.paymentService.reject(
      paymentId,
      adminData.id,
      'Admin tomonidan rad etildi',
    );

    await ctx.editMessageCaption(
      `❌ To'lov rad etildi!\n\nFoydalanuvchi ${payment.userId}`,
      { parse_mode: 'Markdown' },
    );

    await ctx.answerCbQuery("❌ To'lov rad etildi!");

    // TODO: Add user relation include in payment query
    // Notify user
    // try {
    //   await ctx.telegram.sendMessage(
    //     payment.user.telegramId,
    //     "❌ Uzr, to'lovingiz rad etildi. Iltimos, qaytadan urinib ko'ring yoki admin bilan bog'laning.",
    //   );
    // } catch (error) {
    //   // User might have blocked the bot
    // }
  }

  private async getAdminFromContext(ctx: Context) {
    const telegramUser = ctx.from;
    if (!telegramUser) return null;

    const isAdmin = await this.adminService.isAdmin(String(telegramUser.id));
    if (!isAdmin) return null;

    return { telegramId: telegramUser.id };
  }
}
