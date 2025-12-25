import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx, Action, On, Message } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { PremiumService } from '../../payment/services/premium.service';
import { SettingsService } from '../../settings/services/settings.service';
import { SessionService } from '../services/session.service';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';

/**
 * Admin Management Handler - Admin va sozlamalar boshqaruvi
 * Adminlar, sozlamalar, narxlar boshqaruvi
 */
@Update()
@Injectable()
export class AdminManagementHandler {
  private readonly logger = new Logger(AdminManagementHandler.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly premiumService: PremiumService,
    private readonly settingsService: SettingsService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Admin tekshirish
   */
  private async getAdmin(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  /**
   * Superadmin tekshirish
   */
  private async isSuperAdmin(ctx: Context): Promise<boolean> {
    const admin = await this.getAdmin(ctx);
    return admin?.role === 'SUPERADMIN';
  }

  // ==================== ADMINLAR BOSHQARUVI ====================

  @Hears('👥 Adminlar')
  async showAdminsList(@Ctx() ctx: Context) {
    if (!(await this.isSuperAdmin(ctx))) {
      await ctx.reply("❌ Sizda admin boshqarish huquqi yo'q.");
      return;
    }

    const admins = await this.adminService.findAll();

    let message = "👥 Adminlar ro'yxati:\n\n";
    admins.forEach((a, i) => {
      message += `${i + 1}. @${a.username || 'N/A'}\n`;
      message += `   Rol: ${a.role}\n`;
      message += `   ID: ${a.telegramId}\n\n`;
    });

    const buttons = admins
      .filter((a) => a.role !== 'SUPERADMIN')
      .map((a) => [
        Markup.button.callback(
          `🗑 ${a.username || a.telegramId}`,
          `delete_admin_${a.telegramId}`,
        ),
      ]);

    buttons.push([
      Markup.button.callback("➕ Admin qo'shish", 'add_new_admin'),
    ]);

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
  }

  @Action('add_new_admin')
  async startAddingAdmin(@Ctx() ctx: Context) {
    if (!(await this.isSuperAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Ruxsat yo'q");
      return;
    }

    const admin = await this.getAdmin(ctx);
    await this.sessionService.startSession(
      Number(admin!.telegramId),
      'add_admin' as any,
    );

    await ctx.reply(
      '📝 Yangi admin Telegram ID sini yuboring:\n\n' +
        'Masalan: 123456789\n\n' +
        "❌ Bekor qilish uchun 'Bekor qilish' tugmasini bosing",
      Markup.keyboard([['❌ Bekor qilish']]).resize(),
    );
    await ctx.answerCbQuery();
  }

  @Action(/^delete_admin_(.+)$/)
  async deleteAdmin(@Ctx() ctx: any) {
    if (!(await this.isSuperAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Ruxsat yo'q");
      return;
    }

    const adminTelegramId = ctx.match[1];
    await this.adminService.deleteAdmin(adminTelegramId);

    await ctx.answerCbQuery("✅ Admin o'chirildi");
    await this.showAdminsList(ctx);
  }

  // ==================== SOZLAMALAR ====================

  @Hears('⚙️ Sozlamalar')
  async showSettings(@Ctx() ctx: Context) {
    if (!(await this.isSuperAdmin(ctx))) {
      await ctx.reply("❌ Sizda sozlamalarni o'zgartirish huquqi yo'q.");
      return;
    }

    const premiumSettings = await this.premiumService.getSettings();
    const botSettings = await this.settingsService.getSettings();

    const message = `
⚙️ **BOT SOZLAMALARI**

💎 **Premium narxlar:**
├ 1 oy: ${premiumSettings.monthlyPrice} ${premiumSettings.currency}
├ 3 oy: ${premiumSettings.threeMonthPrice} ${premiumSettings.currency}
├ 6 oy: ${premiumSettings.sixMonthPrice} ${premiumSettings.currency}
└ 1 yil: ${premiumSettings.yearlyPrice} ${premiumSettings.currency}

💳 **Karta ma'lumotlari:**
├ Raqam: ${premiumSettings.cardNumber}
└ Egasi: ${premiumSettings.cardHolder}

📱 **Bot ma'lumotlari:**
├ Support: @${botSettings.supportUsername}
└ Admin chat: ${botSettings.adminNotificationChat}
    `.trim();

    const buttons = [
      [Markup.button.callback("💰 Narxlarni o'zgartirish", 'edit_prices')],
      [
        Markup.button.callback(
          "💳 Karta ma'lumotlarini o'zgartirish",
          'edit_card',
        ),
      ],
      [Markup.button.callback('🔙 Orqaga', 'back_to_admin_menu')],
    ];

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action('edit_prices')
  async startEditingPrices(@Ctx() ctx: Context) {
    if (!(await this.isSuperAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Ruxsat yo'q");
      return;
    }

    const admin = await this.getAdmin(ctx);
    await this.sessionService.startSession(
      Number(admin!.telegramId),
      'edit_premium_prices' as any,
    );

    await ctx.reply(
      "💰 1 oylik premium narxini kiriting (so'mda):\n\n" +
        'Masalan: 25000\n\n' +
        "❌ Bekor qilish uchun 'Bekor qilish' tugmasini bosing",
      Markup.keyboard([['❌ Bekor qilish']]).resize(),
    );
    await ctx.answerCbQuery();
  }

  @Action('edit_card')
  async startEditingCard(@Ctx() ctx: Context) {
    if (!(await this.isSuperAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Ruxsat yo'q");
      return;
    }

    const admin = await this.getAdmin(ctx);
    await this.sessionService.startSession(
      Number(admin!.telegramId),
      'edit_card_info' as any,
    );

    await ctx.reply(
      '💳 Yangi karta raqamini kiriting:\n\n' +
        'Masalan: 8600 1234 5678 9012\n\n' +
        "❌ Bekor qilish uchun 'Bekor qilish' tugmasini bosing",
      Markup.keyboard([['❌ Bekor qilish']]).resize(),
    );
    await ctx.answerCbQuery();
  }

  @Action('back_to_admin_menu')
  async backToAdminMenu(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    await ctx.editMessageText('✅ Asosiy menyu');
    await ctx.reply(
      '👨‍💼 Admin panel',
      AdminKeyboard.getAdminMainMenu(admin.role),
    );
  }

  // ==================== WEB PANEL ====================

  @Hears('🌐 Web Panel')
  async showWebPanel(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const webUrl = process.env.WEB_PANEL_URL || 'http://localhost:3000';
    await ctx.reply(
      `🌐 **Web Admin Panel**\n\nLink: ${webUrl}\n\nAdmin ID: ${admin.telegramId}`,
      { parse_mode: 'Markdown' },
    );
  }

  // ==================== TEXT HANDLER - Sessiya boshqaruvi ====================

  @On('text')
  async handleManagementText(
    @Ctx() ctx: Context,
    @Message('text') text: string,
  ) {
    if (!ctx.from) return;

    // Photo message'larni skip qilish
    if ('photo' in ctx.message!) return;

    const session = this.sessionService.getSession(ctx.from.id);
    if (!session) return;

    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    // Bekor qilish
    if (text === '❌ Bekor qilish') {
      this.sessionService.clearSession(ctx.from.id);
      return ctx.reply(
        '❌ Bekor qilindi.',
        AdminKeyboard.getAdminMainMenu(admin.role),
      );
    }

    const currentState = String(session.state);

    // Faqat management bilan bog'liq state'larni handle qilish
    switch (currentState) {
      case 'add_admin':
        await this.handleAdminCreation(ctx, text, session);
        break;
      case 'edit_premium_prices':
        await this.handlePriceEditing(ctx, text, session);
        break;
      case 'edit_card_info':
        await this.handleCardEditing(ctx, text, session);
        break;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Admin qo'shish jarayoni
   */
  private async handleAdminCreation(ctx: Context, text: string, session: any) {
    switch (session.step) {
      case 0: // Telegram ID
        this.sessionService.updateSessionData(ctx.from!.id, {
          telegramId: text,
        });
        this.sessionService.setStep(ctx.from!.id, 1);
        await ctx.reply('📝 Admin username ini kiriting:');
        break;

      case 1: // Username
        try {
          await this.adminService.createAdmin({
            telegramId: session.data.telegramId,
            username: text,
            role: 'ADMIN',
            canAddAdmin: false,
            canDeleteContent: false,
            createdBy: String(ctx.from!.id),
          });

          this.sessionService.clearSession(ctx.from!.id);
          const admin = await this.getAdmin(ctx);

          await ctx.reply(
            "✅ Admin muvaffaqiyatli qo'shildi!",
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          this.logger.error(`Admin yaratishda xatolik: ${error.message}`);
          await ctx.reply(`❌ Xatolik: ${error.message}`);
        }
        break;
    }
  }

  /**
   * Premium narxlarni tahrirlash jarayoni
   */
  private async handlePriceEditing(ctx: Context, text: string, session: any) {
    switch (session.step) {
      case 0: // 1 month price
        const monthly = parseInt(text);
        if (isNaN(monthly) || monthly <= 0) {
          await ctx.reply("❌ Noto'g'ri format. Musbat raqam kiriting:");
          return;
        }
        this.sessionService.updateSessionData(ctx.from!.id, {
          monthlyPrice: monthly,
        });
        this.sessionService.setStep(ctx.from!.id, 1);
        await ctx.reply('💰 3 oylik premium narxini kiriting:');
        break;

      case 1: // 3 month price
        const threeMonth = parseInt(text);
        if (isNaN(threeMonth) || threeMonth <= 0) {
          await ctx.reply("❌ Noto'g'ri format. Musbat raqam kiriting:");
          return;
        }
        this.sessionService.updateSessionData(ctx.from!.id, {
          threeMonthPrice: threeMonth,
        });
        this.sessionService.setStep(ctx.from!.id, 2);
        await ctx.reply('💰 6 oylik premium narxini kiriting:');
        break;

      case 2: // 6 month price
        const sixMonth = parseInt(text);
        if (isNaN(sixMonth) || sixMonth <= 0) {
          await ctx.reply("❌ Noto'g'ri format. Musbat raqam kiriting:");
          return;
        }
        this.sessionService.updateSessionData(ctx.from!.id, {
          sixMonthPrice: sixMonth,
        });
        this.sessionService.setStep(ctx.from!.id, 3);
        await ctx.reply('💰 1 yillik premium narxini kiriting:');
        break;

      case 3: // 1 year price
        const yearly = parseInt(text);
        if (isNaN(yearly) || yearly <= 0) {
          await ctx.reply("❌ Noto'g'ri format. Musbat raqam kiriting:");
          return;
        }

        try {
          await this.premiumService.updatePrices({
            monthlyPrice: session.data.monthlyPrice,
            threeMonthPrice: session.data.threeMonthPrice,
            sixMonthPrice: session.data.sixMonthPrice,
            yearlyPrice: yearly,
          });

          this.sessionService.clearSession(ctx.from!.id);
          const admin = await this.getAdmin(ctx);

          await ctx.reply(
            '✅ Narxlar muvaffaqiyatli yangilandi!',
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          this.logger.error(`Narxlarni yangilashda xatolik: ${error.message}`);
          await ctx.reply(`❌ Xatolik: ${error.message}`);
        }
        break;
    }
  }

  /**
   * Karta ma'lumotlarini tahrirlash jarayoni
   */
  private async handleCardEditing(ctx: Context, text: string, session: any) {
    switch (session.step) {
      case 0: // Card number
        this.sessionService.updateSessionData(ctx.from!.id, {
          cardNumber: text,
        });
        this.sessionService.setStep(ctx.from!.id, 1);
        await ctx.reply('📝 Karta egasining ismini kiriting:');
        break;

      case 1: // Card holder
        try {
          await this.premiumService.updateCardInfo({
            cardNumber: session.data.cardNumber,
            cardHolder: text,
          });

          this.sessionService.clearSession(ctx.from!.id);
          const admin = await this.getAdmin(ctx);

          await ctx.reply(
            "✅ Karta ma'lumotlari yangilandi!",
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          this.logger.error(
            `Karta ma'lumotlarini yangilashda xatolik: ${error.message}`,
          );
          await ctx.reply(`❌ Xatolik: ${error.message}`);
        }
        break;
    }
  }
}
