import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { PaymentService } from '../../payment/services/payment.service';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';

/**
 * Admin Payments Handler - To'lovlar boshqaruvi
 * Premium to'lovlarni tasdiqlash/rad etish
 */
@Update()
@Injectable()
export class AdminPaymentsHandler {
  private readonly logger = new Logger(AdminPaymentsHandler.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Admin tekshirish
   */
  private async getAdmin(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  // ==================== TO'LOVLAR MENYU ====================

  @Hears("💳 To'lovlar")
  async showPaymentsMenu(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    await ctx.reply(
      "💳 To'lovlar bo'limi",
      AdminKeyboard.getPaymentManagementMenu(),
    );
  }

  // ==================== YANGI TO'LOVLAR ====================

  @Hears("📥 Yangi to'lovlar")
  async showPendingPayments(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const payments = await this.paymentService.findPending();

    if (payments.length === 0) {
      await ctx.reply("📥 Yangi to'lovlar yo'q.");
      return;
    }

    for (const payment of payments) {
      await this.sendPaymentNotification(ctx, payment);
    }
  }

  // ==================== TO'LOVNI TASDIQLASH ====================

  @Action(/^approve_payment_(\d+)$/)
  async approvePayment(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const match = (ctx.callbackQuery as any).data.match(
      /^approve_payment_(\d+)$/,
    );
    const paymentId = parseInt(match[1]);

    try {
      const payment = await this.paymentService.findById(paymentId);
      if (!payment) {
        await ctx.answerCbQuery("❌ To'lov topilmadi");
        return;
      }

      await this.paymentService.approve(paymentId, admin.id, payment.duration);

      await ctx.answerCbQuery("✅ To'lov tasdiqlandi");
      await ctx.editMessageCaption("✅ To'lov tasdiqlandi va premium berildi");

      this.logger.log(
        `Payment ${paymentId} approved by admin ${admin.telegramId}`,
      );
    } catch (error) {
      this.logger.error(`Error approving payment ${paymentId}:`, error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  // ==================== TO'LOVNI RAD ETISH ====================

  @Action(/^reject_payment_(\d+)$/)
  async rejectPayment(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const match = (ctx.callbackQuery as any).data.match(
      /^reject_payment_(\d+)$/,
    );
    const paymentId = parseInt(match[1]);

    try {
      await this.paymentService.reject(
        paymentId,
        admin.id,
        'Admin tomonidan rad etildi',
      );

      await ctx.answerCbQuery("❌ To'lov rad etildi");
      await ctx.editMessageCaption("❌ To'lov rad etildi");

      this.logger.log(
        `Payment ${paymentId} rejected by admin ${admin.telegramId}`,
      );
    } catch (error) {
      this.logger.error(`Error rejecting payment ${paymentId}:`, error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * To'lov haqida bildirishnoma yuborish
   */
  private async sendPaymentNotification(ctx: Context, payment: any) {
    const message = `
💳 **To'lov #${payment.id}**
👤 Foydalanuvchi: ${payment.user.firstName || 'N/A'}
${payment.user.username ? `📱 @${payment.user.username}\n` : ''}
🆔 User ID: ${payment.user.telegramId}
💰 Summa: ${payment.amount} ${payment.currency}
📅 Davomiyligi: ${payment.duration} kun
🕐 Sana: ${payment.createdAt.toLocaleString('uz-UZ')}
    `.trim();

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          '✅ Tasdiqlash',
          `approve_payment_${payment.id}`,
        ),
        Markup.button.callback('❌ Rad etish', `reject_payment_${payment.id}`),
      ],
    ]);

    try {
      await ctx.replyWithPhoto(payment.receiptFileId, {
        caption: message,
        parse_mode: 'Markdown',
        ...buttons,
      });
    } catch (error) {
      this.logger.error(`Error sending payment notification:`, error);
      await ctx.reply(`${message}\n\n❌ Chek rasmini yuklab bo'lmadi`, buttons);
    }
  }
}
