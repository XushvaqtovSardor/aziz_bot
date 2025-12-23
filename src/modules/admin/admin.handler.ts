import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx, On, Message, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { AdminService } from './services/admin.service';
import { UserService } from '../user/services/user.service';
import { MovieService } from '../content/services/movie.service';
import { SerialService } from '../content/services/serial.service';
import { FieldService } from '../field/services/field.service';
import { PaymentService } from '../payment/services/payment.service';
import { WatchHistoryService } from '../content/services/watch-history.service';
import { BroadcastService } from '../broadcast/services/broadcast.service';
import { ChannelService } from '../channel/services/channel.service';
import { SessionService } from './services/session.service';
import { PremiumService } from '../payment/services/premium.service';
import { SettingsService } from '../settings/services/settings.service';
import {
  AdminState,
  MovieCreateStep,
  SerialCreateStep,
  MovieCreationData,
} from './types/session.interface';
import { AdminKeyboard } from './keyboards/admin-menu.keyboard';

@Update()
@Injectable()
export class AdminHandler {
  private readonly logger = new Logger(AdminHandler.name);

  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private movieService: MovieService,
    private serialService: SerialService,
    private fieldService: FieldService,
    private paymentService: PaymentService,
    private watchHistoryService: WatchHistoryService,
    private broadcastService: BroadcastService,
    private channelService: ChannelService,
    private sessionService: SessionService,
    private premiumService: PremiumService,
    private settingsService: SettingsService,
  ) {}

  private async getAdmin(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  // ==================== STATISTICS ====================
  @Hears('📊 Statistika')
  async showStatistics(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const [userStats, paymentStats, topContent, activeUsers, newUsers] =
      await Promise.all([
        this.userService.getUserStatistics(),
        this.paymentService.getStatistics(),
        this.watchHistoryService.getMostWatchedContent(5),
        this.watchHistoryService.getActiveUsers(30),
        this.watchHistoryService.getNewUsers(30),
      ]);

    const message = `
📊 **BOT STATISTIKASI**

👥 **Foydalanuvchilar:**
├ Jami: ${userStats.totalUsers}
├ Premium: ${userStats.premiumUsers}
├ Bloklangan: ${userStats.blockedUsers}
└ Faol (30 kun): ${activeUsers}

💰 **To'lovlar:**
├ Jami: ${paymentStats.totalPayments}
├ Tasdiqlangan: ${paymentStats.approvedCount}
├ Rad etilgan: ${paymentStats.rejectedCount}
└ Kutilmoqda: ${paymentStats.pendingCount}

📈 **Yangi foydalanuvchilar (30 kun):** ${newUsers}

🎬 **Eng ko'p ko'rilgan:**
Kinolar: ${topContent.movies.length}
Seriallar: ${topContent.serials.length}
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  // ==================== FIELDS ====================
  @Hears('📁 Fieldlar')
  async openFieldsMenu(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    await ctx.reply(
      '📁 Fieldlar bolimi',
      AdminKeyboard.getFieldManagementMenu(),
    );
  }

  @Hears("➕ Field qo'shish")
  async startAddingField(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin || !ctx.from) return;

    this.sessionService.createSession(ctx.from.id, 'ADDING_FIELD' as any);

    await ctx.reply(
      '📝 Field nomini kiriting:\nMasalan: Yangi kinolar',
      AdminKeyboard.getCancelButton(),
    );
  }

  @Hears("📋 Fieldlar ro'yxati")
  async showFieldsList(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const fields = await this.fieldService.findAll();

    if (fields.length === 0) {
      await ctx.reply('📂 Hech qanday field topilmadi.');
      return;
    }

    let message = '📋 Mavjud fieldlar:\n\n';
    fields.forEach((field, index) => {
      message += `${index + 1}. ${field.name}\n`;
    });
    message += "\n👇 Batafsil ma'lumot olish uchun raqamni bosing:";

    const buttons = [];
    const row = [];
    fields.forEach((field, index) => {
      row.push(
        Markup.button.callback(String(index + 1), `field_detail_${field.id}`),
      );
      if (row.length === 5) {
        buttons.push([...row]);
        row.length = 0;
      }
    });
    if (row.length > 0) buttons.push(row);

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
  }

  @Action(/^field_detail_(\d+)$/)
  async showFieldDetail(@Ctx() ctx: any) {
    const fieldId = parseInt(ctx.match[1]);
    const field = await this.fieldService.findOne(fieldId);

    if (!field) {
      await ctx.answerCbQuery('❌ Field topilmadi');
      return;
    }

    const message = `
📁 **Field Ma'lumotlari**

🏷 Nomi: ${field.name}
🆔 ID: ${field.id}
📢 Kanal ID: ${field.channelId}
🔗 Kanal linki: ${field.channelLink || "Yo'q"}
📅 Yaratilgan: ${field.createdAt.toLocaleDateString('uz-UZ')}
✅ Faol: ${field.isActive ? 'Ha' : "Yo'q"}
    `.trim();

    const buttons = [
      [Markup.button.callback("🗑 O'chirish", `delete_field_${field.id}`)],
      [Markup.button.callback('🔙 Orqaga', 'back_to_fields')],
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
    await ctx.answerCbQuery();
  }

  @Action('back_to_fields')
  async backToFieldsList(@Ctx() ctx: Context) {
    await this.showFieldsList(ctx);
  }

  @Action(/^delete_field_(\d+)$/)
  async deleteField(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const match = (ctx.callbackQuery as any).data.match(/^delete_field_(\d+)$/);
    const fieldId = parseInt(match[1]);

    await this.fieldService.delete(fieldId);
    await ctx.answerCbQuery('✅ Field ochirildi');
    await ctx.editMessageText('✅ Field muvaffaqiyatli ochirildi');
  }

  // ==================== CONTENT (MOVIE/SERIAL) ====================
  @Hears('🎬 Kino yuklash')
  async startMovieCreation(@Ctx() ctx: Context) {
    this.logger.log(`Admin ${ctx.from?.id} starting movie creation`);

    const admin = await this.getAdmin(ctx);
    if (!admin || !ctx.from) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.sessionService.createSession(ctx.from.id, AdminState.CREATING_MOVIE);

    await ctx.reply(
      '🎬 Kino yuklash boshlandi!\n\n' +
        '1️⃣ Kino kodini kiriting:\n' +
        "⚠️ Kod FAQAT raqamlardan iborat bo'lishi kerak!\n" +
        'Masalan: 12345',
      AdminKeyboard.getCancelButton(),
    );
  }

  @Hears('📺 Serial yuklash')
  async startSerialCreation(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin || !ctx.from) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.sessionService.createSession(ctx.from.id, AdminState.CREATING_SERIAL);

    await ctx.reply(
      '📺 Serial yuklash boshlandi!\n\n' +
        '1️⃣ Serial kodini kiriting:\n' +
        "⚠️ Kod FAQAT raqamlardan iborat bo'lishi kerak!\n" +
        'Masalan: 54321',
      AdminKeyboard.getCancelButton(),
    );
  }

  // ==================== CHANNELS ====================
  @Hears('📢 Majburiy kanallar')
  async showMandatoryChannels(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const channels = await this.channelService.findAllMandatory();

    if (channels.length === 0) {
      await ctx.reply(
        "📢 Hech qanday majburiy kanal yo'q.",
        Markup.keyboard([
          ["➕ Majburiy kanal qo'shish"],
          ['🔙 Orqaga'],
        ]).resize(),
      );
      return;
    }

    let message = '📢 Majburiy kanallar:\n\n';
    channels.forEach((ch, i) => {
      message += `${i + 1}. ${ch.channelName}\n`;
      message += `   Link: ${ch.channelLink}\n`;
      message += `   ID: ${ch.channelId}\n\n`;
    });

    const buttons = channels.map((ch) => [
      Markup.button.callback(
        `🗑 ${ch.channelName}`,
        `delete_mandatory_${ch.id}`,
      ),
    ]);

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
    await ctx.reply(
      "Yangi kanal qo'shish:",
      Markup.keyboard([["➕ Majburiy kanal qo'shish"], ['🔙 Orqaga']]).resize(),
    );
  }

  @Hears("➕ Majburiy kanal qo'shish")
  async startAddMandatoryChannel(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    await this.sessionService.startSession(
      Number(admin.telegramId),
      AdminState.ADD_MANDATORY_CHANNEL,
    );
    await ctx.reply(
      '📝 Majburiy kanalning ID sini yuboring:\n\n' +
        'Masalan: -1001234567890\n\n' +
        "❌ Bekor qilish uchun 'Bekor qilish' tugmasini bosing",
      Markup.keyboard([['❌ Bekor qilish']]).resize(),
    );
  }

  @Action(/^delete_mandatory_(\d+)$/)
  async deleteMandatoryChannel(@Ctx() ctx: any) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const channelId = parseInt(ctx.match[1]);
    await this.channelService.delete(channelId);

    await ctx.answerCbQuery('✅ Majburiy kanal ochirildi');
    await this.showMandatoryChannels(ctx);
  }

  @Hears('💾 Database kanallar')
  async showDatabaseChannels(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const channels = await this.channelService.findAllDatabase();

    if (channels.length === 0) {
      await ctx.reply(
        "💾 Hech qanday database kanal yo'q.",
        Markup.keyboard([
          ["➕ Database kanal qo'shish"],
          ['🔙 Orqaga'],
        ]).resize(),
      );
      return;
    }

    let message = '💾 Database kanallar:\n\n';
    channels.forEach((ch, i) => {
      message += `${i + 1}. ${ch.channelName}\n`;
      message += `   ID: ${ch.channelId}\n\n`;
    });

    const buttons = channels.map((ch) => [
      Markup.button.callback(
        `🗑 ${ch.channelName}`,
        `delete_db_channel_${ch.id}`,
      ),
    ]);

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
    await ctx.reply(
      "Yangi kanal qo'shish:",
      Markup.keyboard([["➕ Database kanal qo'shish"], ['🔙 Orqaga']]).resize(),
    );
  }

  @Hears("➕ Database kanal qo'shish")
  async startAddDatabaseChannel(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    await this.sessionService.startSession(
      Number(admin.telegramId),
      AdminState.ADD_DATABASE_CHANNEL,
    );
    await ctx.reply(
      '📝 Database kanalning ID sini yuboring:\n\n' +
        'Masalan: -1001234567890\n\n' +
        "❌ Bekor qilish uchun 'Bekor qilish' tugmasini bosing",
      Markup.keyboard([['❌ Bekor qilish']]).resize(),
    );
  }

  @Action(/^delete_db_channel_(\d+)$/)
  async deleteDatabaseChannel(@Ctx() ctx: any) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const channelId = parseInt(ctx.match[1]);
    await this.channelService.deleteDatabaseChannel(channelId);

    await ctx.answerCbQuery('✅ Database kanal ochirildi');
    await this.showDatabaseChannels(ctx);
  }

  // ==================== PAYMENTS ====================
  @Hears("💳 To'lovlar")
  async showPaymentsMenu(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    await ctx.reply(
      "💳 To'lovlar bo'limi",
      AdminKeyboard.getPaymentManagementMenu(),
    );
  }

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
      const message = `
💳 **To'lov #${payment.id}**

👤 Foydalanuvchi: ${payment.user.firstName || 'N/A'}
💰 Summa: ${payment.amount} ${payment.currency}
📅 Davomiyligi: ${payment.duration} kun
🕐 Sana: ${payment.createdAt.toLocaleString('uz-UZ')}
      `;

      const buttons = Markup.inlineKeyboard([
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
        ...buttons,
      });
    }
  }

  @Action(/^approve_payment_(\d+)$/)
  async approvePayment(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const match = (ctx.callbackQuery as any).data.match(
      /^approve_payment_(\d+)$/,
    );
    const paymentId = parseInt(match[1]);

    const payment = await this.paymentService.findById(paymentId);
    await this.paymentService.approve(paymentId, admin.id, payment.duration);
    await ctx.answerCbQuery('✅ Tolov tasdiqlandi');
    await ctx.editMessageCaption('✅ Tolov tasdiqlandi va premium berildi');
  }

  @Action(/^reject_payment_(\d+)$/)
  async rejectPayment(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const match = (ctx.callbackQuery as any).data.match(
      /^reject_payment_(\d+)$/,
    );
    const paymentId = parseInt(match[1]);

    await this.paymentService.reject(
      paymentId,
      admin.id,
      'Admin tomonidan rad etildi',
    );
    await ctx.answerCbQuery('❌ Tolov rad etildi');
    await ctx.editMessageCaption('❌ Tolov rad etildi');
  }

  // ==================== BROADCAST ====================
  @Hears('📣 Reklama yuborish')
  async startBroadcast(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin || admin.role !== 'SUPERADMIN') {
      await ctx.reply("❌ Sizda reklama yuborish huquqi yo'q.");
      return;
    }

    await ctx.reply(
      '📣 Reklama yuborish funksiyasi hozircha ishlab chiqilmoqda.\n\n' +
        "Bu funksiya tez orada qo'shiladi.",
    );
  }

  // ==================== ADMINS ====================
  @Hears('👥 Adminlar')
  async showAdminsList(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin || admin.role !== 'SUPERADMIN') {
      await ctx.reply("❌ Sizda admin boshqarish huquqi yo'q.");
      return;
    }

    const admins = await this.adminService.findAll();

    let message = '👥 Adminlar royxati:\n\n';
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
    const admin = await this.getAdmin(ctx);
    if (!admin || admin.role !== 'SUPERADMIN') {
      await ctx.answerCbQuery("❌ Sizda admin qo'shish huquqi yo'q.");
      return;
    }

    await this.sessionService.startSession(
      Number(admin.telegramId),
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
    const admin = await this.getAdmin(ctx);
    if (!admin || admin.role !== 'SUPERADMIN') {
      await ctx.answerCbQuery("❌ Sizda admin o'chirish huquqi yo'q.");
      return;
    }

    const adminTelegramId = ctx.match[1];
    await this.adminService.deleteAdmin(adminTelegramId);

    await ctx.answerCbQuery('✅ Admin ochirildi');
    await this.showAdminsList(ctx);
  }

  // ==================== SETTINGS ====================
  @Hears('⚙️ Sozlamalar')
  async showSettings(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin || admin.role !== 'SUPERADMIN') {
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
    `;

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
    const admin = await this.getAdmin(ctx);
    if (!admin || admin.role !== 'SUPERADMIN') {
      await ctx.answerCbQuery("❌ Ruxsat yo'q");
      return;
    }

    await this.sessionService.startSession(
      Number(admin.telegramId),
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
    const admin = await this.getAdmin(ctx);
    if (!admin || admin.role !== 'SUPERADMIN') {
      await ctx.answerCbQuery("❌ Ruxsat yo'q");
      return;
    }

    await this.sessionService.startSession(
      Number(admin.telegramId),
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

    await ctx.editMessageText('🏠 Asosiy menyu');
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

  // ==================== SESSION HANDLER ====================
  @On('text')
  async handleSessionText(@Ctx() ctx: Context, @Message('text') text: string) {
    if (!ctx.from) return;

    const session = this.sessionService.getSession(ctx.from.id);

    // Log for debugging
    this.logger.debug(
      `[TEXT] User ${ctx.from.id} sent: "${text}" | Has session: ${!!session}`,
    );

    // Handle button commands even without session
    if (text === '🎬 Kino yuklash') {
      await this.startMovieCreation(ctx);
      return;
    }

    if (text === '📺 Serial yuklash') {
      await this.startSerialCreation(ctx);
      return;
    }

    if (!session) return; // No active session, let @Hears handlers work

    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    // Cancel button
    if (text === '❌ Bekor qilish') {
      this.sessionService.clearSession(ctx.from.id);
      await ctx.reply(
        '❌ Bekor qilindi.',
        AdminKeyboard.getAdminMainMenu(admin.role),
      );
      return;
    }

    // Handle based on session state
    switch (session.state) {
      case AdminState.CREATING_MOVIE:
        await this.handleMovieCreation(ctx, text, session);
        break;
      case AdminState.CREATING_SERIAL:
        await this.handleSerialCreation(ctx, text, session);
        break;
      case 'ADDING_FIELD' as any:
        await this.handleFieldCreation(ctx, text, session);
        break;
      case AdminState.ADD_DATABASE_CHANNEL:
        await this.handleDatabaseChannelCreation(ctx, text, session);
        break;
      case AdminState.ADD_MANDATORY_CHANNEL:
        await this.handleMandatoryChannelCreation(ctx, text, session);
        break;
      case 'add_admin' as any:
        await this.handleAdminCreation(ctx, text, session);
        break;
      case 'edit_premium_prices' as any:
        await this.handlePriceEditing(ctx, text, session);
        break;
      case 'edit_card_info' as any:
        await this.handleCardEditing(ctx, text, session);
        break;
      case AdminState.PAYMENT_RECEIPT:
        await this.handlePaymentReceipt(ctx, text, session);
        break;
      default:
        break;
    }
  }

  private async handleMovieCreation(ctx: Context, text: string, session: any) {
    const data = session.data as MovieCreationData;

    switch (session.step) {
      case MovieCreateStep.CODE: // Movie Code (must be numeric)
        const code = parseInt(text);
        if (isNaN(code) || code <= 0) {
          await ctx.reply(
            "❌ Kod faqat raqamlardan iborat bo'lishi kerak!\nMasalan: 12345\n\nIltimos, qaytadan kiriting:",
            AdminKeyboard.getCancelButton(),
          );
          return;
        }

        // Check if code is available
        const isAvailable = await this.movieService.isCodeAvailable(code);
        if (!isAvailable) {
          // Code is taken, suggest nearest available codes
          const nearestCodes =
            await this.movieService.findNearestAvailableCodes(code, 5);

          let message = `❌ Kechirasiz, ${code} kodi band!\n\n`;
          if (nearestCodes.length > 0) {
            message += "✅ Eng yaqin bo'sh kodlar:\n";
            nearestCodes.forEach((c, i) => {
              message += `${i + 1}. ${c}\n`;
            });
            message +=
              '\nYuqoridagi kodlardan birini tanlang yoki boshqa kod kiriting:';
          } else {
            message += 'Boshqa kod kiriting:';
          }

          await ctx.reply(message, AdminKeyboard.getCancelButton());
          return;
        }

        this.sessionService.updateSessionData(ctx.from!.id, { code });
        this.sessionService.setStep(ctx.from!.id, MovieCreateStep.TITLE);
        await ctx.reply(
          'Kino nomini kiriting:\nMasalan: Avatar 2',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case MovieCreateStep.TITLE: // Title (Required)
        this.sessionService.updateSessionData(ctx.from!.id, { title: text });
        this.sessionService.setStep(ctx.from!.id, MovieCreateStep.GENRE);
        await ctx.reply(
          '🎭 Janr kiriting:\nMasalan: Action, Drama',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case MovieCreateStep.GENRE: // Genre (Required)
        this.sessionService.updateSessionData(ctx.from!.id, { genre: text });
        this.sessionService.setStep(ctx.from!.id, MovieCreateStep.DESCRIPTION);
        await ctx.reply(
          "📝 Tavsif kiriting:\n\n⏭ O'tkazib yuborish uchun 'Next' yozing",
          Markup.keyboard([['Next'], ['❌ Bekor qilish']]).resize(),
        );
        break;

      case MovieCreateStep.DESCRIPTION: // Description (optional)
        if (text.toLowerCase() === 'next') {
          this.sessionService.updateSessionData(ctx.from!.id, {
            description: null,
          });
        } else {
          this.sessionService.updateSessionData(ctx.from!.id, {
            description: text,
          });
        }
        this.sessionService.setStep(ctx.from!.id, MovieCreateStep.FIELD);

        // Show fields list with numbers
        const allFields = await this.fieldService.findAll();
        if (allFields.length === 0) {
          await ctx.reply(
            '❌ Hech qanday field topilmadi. Avval field yarating.',
          );
          this.sessionService.clearSession(ctx.from!.id);
          return;
        }

        let message = '📁 Qaysi fieldni tanlaysiz?\n\n';
        allFields.forEach((field, index) => {
          message += `${index + 1}. ${field.name}\n`;
        });
        message += '\nRaqamini kiriting (masalan: 1)';

        this.sessionService.updateSessionData(ctx.from!.id, {
          fields: allFields,
        });
        await ctx.reply(message, AdminKeyboard.getCancelButton());
        break;

      case MovieCreateStep.FIELD: // Field selection
        const fieldIndex = parseInt(text) - 1;
        const userFields = session.data.fields;

        if (
          isNaN(fieldIndex) ||
          fieldIndex < 0 ||
          fieldIndex >= userFields.length
        ) {
          await ctx.reply("❌ Noto'g'ri raqam. Iltimos qaytadan kiriting:");
          return;
        }

        this.sessionService.updateSessionData(ctx.from!.id, {
          selectedField: userFields[fieldIndex],
        });
        this.sessionService.setStep(ctx.from!.id, MovieCreateStep.PHOTO);
        await ctx.reply(
          '📸 Endi kino rasmini yuboring:',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case MovieCreateStep.PHOTO:
        // Photo faqat @On('photo') da ishlanadi
        break;

      default:
        break;
    }
  }

  @On('photo')
  async handlePhoto(@Ctx() ctx: Context) {
    if (!ctx.from || !('photo' in ctx.message!)) return;

    const session = this.sessionService.getSession(ctx.from.id);
    if (!session) return;

    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const photo = ctx.message.photo[ctx.message.photo.length - 1];

    // Handle Movie Photo
    if (
      session.state === AdminState.CREATING_MOVIE &&
      session.step === MovieCreateStep.PHOTO
    ) {
      this.sessionService.updateSessionData(ctx.from.id, {
        posterFileId: photo.file_id,
      });
      this.sessionService.setStep(ctx.from.id, MovieCreateStep.VIDEO);

      await ctx.reply(
        '🎬 Endi kino videosini yuboring:',
        AdminKeyboard.getCancelButton(),
      );
      return; // IMPORTANT: Exit after handling
    }

    // Handle Serial Photo
    if (
      session.state === AdminState.CREATING_SERIAL &&
      session.step === SerialCreateStep.PHOTO
    ) {
      const data = session.data;

      try {
        const field = data.selectedField;

        // Create serial caption with button
        const caption = `
📺 **${data.title}**
🎬 Sezon: ${data.season}
📺 Qismlar: ${data.episodeCount}
🎭 Janr: ${data.genre}
${data.description ? `📝 ${data.description}\n` : ''}
🆔 Kod: ${data.code}
        `.trim();

        const button = Markup.inlineKeyboard([
          [
            Markup.button.url(
              "🤖 Botga o'tish",
              `https://t.me/${process.env.BOT_USERNAME}?start=serial_${data.code}`,
            ),
          ],
        ]);

        // Send poster with info to field channel
        const sentPoster = await ctx.telegram.sendPhoto(
          field.channelId,
          photo.file_id,
          {
            caption,
            parse_mode: 'Markdown',
            ...button,
          },
        );

        // Save serial to database
        await this.serialService.create({
          code: data.code,
          title: data.title,
          genre: data.genre,
          description: data.description,
          season: data.season,
          episodeCount: data.episodeCount,
          fieldId: field.id,
          posterFileId: photo.file_id,
          channelMessageId: sentPoster.message_id,
        });

        this.sessionService.clearSession(ctx.from.id);

        await ctx.reply(
          `✅ Serial muvaffaqiyatli yaratildi!\n\n📦 Field kanal: ${field.name}\n🔗 Message ID: ${sentPoster.message_id}`,
          AdminKeyboard.getAdminMainMenu(admin.role),
        );
      } catch (error) {
        console.error('Error creating serial:', error);
        await ctx.reply(
          `❌ Xatolik yuz berdi. Botni kanallarga admin qiling va qaytadan urinib ko'ring.\n\nXatolik: ${error.message}`,
        );
      }
      return; // IMPORTANT: Exit after handling
    }

    // If we reach here, photo was sent in wrong state
    await ctx.reply('❌ Bu holatda rasm yuklashning kerak emas.');
  }

  @On('video')
  async handleMovieVideo(@Ctx() ctx: Context) {
    if (!ctx.from || !('video' in ctx.message!)) return;

    const session = this.sessionService.getSession(ctx.from.id);
    if (
      !session ||
      session.state !== AdminState.CREATING_MOVIE ||
      session.step !== MovieCreateStep.VIDEO
    ) {
      return; // Not in movie creation video step
    }

    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const video = ctx.message.video;
    const data = session.data;

    try {
      // Get all database channels
      const dbChannels = await this.channelService.findAllDatabase();
      if (dbChannels.length === 0) {
        await ctx.reply(
          '❌ Hech qanday database kanal topilmadi. Avval database kanal yarating.',
        );
        this.sessionService.clearSession(ctx.from.id);
        return;
      }

      await ctx.reply('⏳ Kino yuklanmoqda, iltimos kuting...');

      // Send video to all database channels and collect message IDs
      const videoMessages: { channelId: string; messageId: number }[] = [];

      for (const dbChannel of dbChannels) {
        try {
          const sentVideo = await ctx.telegram.sendVideo(
            dbChannel.channelId,
            video.file_id,
            {
              caption: `🎬 ${data.title || 'Kino'}\n🆔 Kod: ${data.code}`,
            },
          );
          videoMessages.push({
            channelId: dbChannel.channelId,
            messageId: sentVideo.message_id,
          });
        } catch (error) {
          console.error(
            `Error sending to database channel ${dbChannel.channelName}:`,
            error,
          );
        }
      }

      if (videoMessages.length === 0) {
        await ctx.reply(
          "❌ Videoni hech qanday kanalga yuklash imkoni bo'lmadi. Botni kanallarga admin qiling.",
        );
        return;
      }

      // Create movie caption with button for field channel
      const caption = `
🎬 **${data.title}**
🎭 Janr: ${data.genre}
${data.description ? `📝 ${data.description}\n` : ''}
🆔 Kod: ${data.code}
      `.trim();

      const button = Markup.inlineKeyboard([
        [
          Markup.button.url(
            "🤖 Botga o'tish",
            `https://t.me/${process.env.BOT_USERNAME}?start=movie_${data.code}`,
          ),
        ],
      ]);

      // Send poster with info to field channel
      const field = data.selectedField;
      const sentPoster = await ctx.telegram.sendPhoto(
        field.channelId,
        data.posterFileId,
        {
          caption,
          parse_mode: 'Markdown',
          ...button,
        },
      );

      // Save movie to database
      await this.movieService.create({
        code: data.code,
        title: data.title,
        genre: data.genre,
        description: data.description,
        fieldId: field.id,
        posterFileId: data.posterFileId,
        videoFileId: video.file_id,
        channelMessageId: sentPoster.message_id,
        videoMessageId: JSON.stringify(videoMessages), // Store all video message IDs
      });

      this.sessionService.clearSession(ctx.from.id);

      let successMessage = `✅ Kino muvaffaqiyatli yuklandi!\n\n`;
      successMessage += `📦 Field kanal: ${field.name}\n`;
      successMessage += `🔗 Poster Message ID: ${sentPoster.message_id}\n\n`;
      successMessage += `📹 Video yuklangan kanallar:\n`;
      videoMessages.forEach((vm, i) => {
        const channel = dbChannels.find((ch) => ch.channelId === vm.channelId);
        successMessage += `${i + 1}. ${channel?.channelName || vm.channelId} - Message ID: ${vm.messageId}\n`;
      });

      await ctx.reply(
        successMessage,
        AdminKeyboard.getAdminMainMenu(admin.role),
      );
    } catch (error) {
      console.error('Error uploading movie:', error);
      await ctx.reply(
        `❌ Xatolik yuz berdi. Botni barcha kanallarga admin qiling va qaytadan urinib ko'ring.\n\nXatolik: ${error.message}`,
      );
    }
  }

  // ==================== SERIAL CREATION HANDLER ====================
  private async handleSerialCreation(ctx: Context, text: string, session: any) {
    switch (session.step) {
      case SerialCreateStep.CODE: // Code (Required)
        const code = parseInt(text);
        if (isNaN(code)) {
          await ctx.reply(
            "❌ Notog'ri format. Iltimos, faqat raqamlardan iborat kod kiriting!\nMasalan: 54321",
            AdminKeyboard.getCancelButton(),
          );
          return;
        }

        // Check if code already exists
        const existingSerial = await this.serialService.findByCode(
          String(code),
        );
        if (existingSerial) {
          await ctx.reply(
            '❌ Bu kod band! Boshqa kod kiriting.',
            AdminKeyboard.getCancelButton(),
          );
          return;
        }

        this.sessionService.updateSessionData(ctx.from!.id, { code });
        this.sessionService.setStep(ctx.from!.id, SerialCreateStep.TITLE);
        await ctx.reply(
          'Serial nomini kiriting:\nMasalan: Money Heist',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case SerialCreateStep.TITLE: // Title (Required)
        this.sessionService.updateSessionData(ctx.from!.id, { title: text });
        this.sessionService.setStep(ctx.from!.id, SerialCreateStep.GENRE);
        await ctx.reply(
          '🎭 Janr kiriting:\nMasalan: Crime, Drama',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case SerialCreateStep.GENRE: // Genre (Required)
        this.sessionService.updateSessionData(ctx.from!.id, { genre: text });
        this.sessionService.setStep(ctx.from!.id, SerialCreateStep.DESCRIPTION);
        await ctx.reply(
          "📝 Tavsif kiriting:\n\n⏭ O'tkazib yuborish uchun 'Next' yozing",
          Markup.keyboard([['Next'], ['❌ Bekor qilish']]).resize(),
        );
        break;

      case SerialCreateStep.DESCRIPTION: // Description (optional)
        if (text.toLowerCase() === 'next') {
          this.sessionService.updateSessionData(ctx.from!.id, {
            description: null,
          });
        } else {
          this.sessionService.updateSessionData(ctx.from!.id, {
            description: text,
          });
        }
        this.sessionService.setStep(ctx.from!.id, SerialCreateStep.SEASON);
        await ctx.reply(
          '🎬 Sezon raqamini kiriting:\nMasalan: 1',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case SerialCreateStep.SEASON: // Season (Required)
        const season = parseInt(text);
        if (isNaN(season) || season < 1) {
          await ctx.reply(
            "❌ Notog'ri format. Musbat son kiriting!",
            AdminKeyboard.getCancelButton(),
          );
          return;
        }
        this.sessionService.updateSessionData(ctx.from!.id, { season });
        this.sessionService.setStep(
          ctx.from!.id,
          SerialCreateStep.EPISODE_COUNT,
        );
        await ctx.reply(
          '📺 Qismlar sonini kiriting:\nMasalan: 10',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case SerialCreateStep.EPISODE_COUNT: // Episode count (Required)
        const episodeCount = parseInt(text);
        if (isNaN(episodeCount) || episodeCount < 1) {
          await ctx.reply(
            "❌ Notog'ri format. Musbat son kiriting!",
            AdminKeyboard.getCancelButton(),
          );
          return;
        }
        this.sessionService.updateSessionData(ctx.from!.id, { episodeCount });
        this.sessionService.setStep(ctx.from!.id, SerialCreateStep.FIELD);

        // Show fields list with numbers
        const allFields = await this.fieldService.findAll();
        if (allFields.length === 0) {
          await ctx.reply(
            '❌ Hech qanday field topilmadi. Avval field yarating.',
          );
          this.sessionService.clearSession(ctx.from!.id);
          return;
        }

        const userFields = allFields.filter((f) => f.isActive);
        if (userFields.length === 0) {
          await ctx.reply(
            '❌ Faol field topilmadi. Avval faol field yarating.',
          );
          this.sessionService.clearSession(ctx.from!.id);
          return;
        }

        let fieldsMessage = '📁 Qaysi fieldga joylashtirmoqchisiz?\n\n';
        userFields.forEach((field, index) => {
          fieldsMessage += `${index + 1}. ${field.name}\n`;
        });
        fieldsMessage += '\n\nRaqamini kiriting (masalan: 1)';

        this.sessionService.updateSessionData(ctx.from!.id, {
          fields: userFields,
        });
        await ctx.reply(fieldsMessage, AdminKeyboard.getCancelButton());
        break;

      case SerialCreateStep.FIELD: // Field selection
        const fieldIndex = parseInt(text) - 1;
        const fields = session.data.fields;

        if (
          isNaN(fieldIndex) ||
          fieldIndex < 0 ||
          fieldIndex >= fields.length
        ) {
          await ctx.reply(
            "❌ Notog'ri raqam. Yuqoridagi ro'yxatdan tanlang.",
            AdminKeyboard.getCancelButton(),
          );
          return;
        }

        this.sessionService.updateSessionData(ctx.from!.id, {
          selectedField: fields[fieldIndex],
        });
        this.sessionService.setStep(ctx.from!.id, SerialCreateStep.PHOTO);
        await ctx.reply(
          '📸 Endi serial rasmini yuboring:',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case SerialCreateStep.PHOTO:
        // Photo faqat @On('photo') da ishlanadi
        break;

      default:
        break;
    }
  }

  // ==================== FIELD CREATION HANDLER ====================
  private async handleFieldCreation(ctx: Context, text: string, session: any) {
    switch (session.step) {
      case 0: // Field name
        this.sessionService.updateSessionData(ctx.from!.id, { name: text });
        this.sessionService.setStep(ctx.from!.id, 1);
        await ctx.reply(
          "📝 Ommaviy kanal ID yoki username kiriting (userlar bu kanaldan kinolarni ko'radilar):\nMasalan: @channel_username yoki -1001234567890",
          AdminKeyboard.getCancelButton(),
        );
        break;

      case 1: // Public Channel ID
        this.sessionService.updateSessionData(ctx.from!.id, {
          channelId: text,
          channelLink: text.startsWith('@')
            ? `https://t.me/${text.slice(1)}`
            : undefined,
        });
        this.sessionService.setStep(ctx.from!.id, 2);

        // Show database channels list
        const dbChannels = await this.channelService.findAllDatabase();
        if (dbChannels.length === 0) {
          await ctx.reply(
            '❌ Hech qanday database kanal topilmadi. Avval database kanal yarating.',
          );
          this.sessionService.clearSession(ctx.from!.id);
          return;
        }

        let message = '📦 Qaysi database kanaldan foydalanasiz?\n\n';
        dbChannels.forEach((channel, index) => {
          message += `${index + 1}. ${channel.channelName}\n`;
        });
        message += '\nRaqamini kiriting (masalan: 1)';

        this.sessionService.updateSessionData(ctx.from!.id, {
          dbChannels,
        });
        await ctx.reply(message, AdminKeyboard.getCancelButton());
        break;

      case 2: // Database Channel selection
        const dbChannelIndex = parseInt(text) - 1;
        const availableChannels = session.data.dbChannels;

        if (
          isNaN(dbChannelIndex) ||
          dbChannelIndex < 0 ||
          dbChannelIndex >= availableChannels.length
        ) {
          await ctx.reply('❌ Notogri raqam. Iltimos qaytadan kiriting:');
          return;
        }

        const selectedDbChannel = availableChannels[dbChannelIndex];

        try {
          await this.fieldService.create({
            name: session.data.name,
            channelId: session.data.channelId,
            channelLink: session.data.channelLink,
            databaseChannelId: selectedDbChannel.id,
          });

          this.sessionService.clearSession(ctx.from!.id);
          const admin = await this.getAdmin(ctx);
          await ctx.reply(
            '✅ Field muvaffaqiyatli qoshildi!',
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          await ctx.reply(
            '❌ Xatolik yuz berdi. Iltimos qaytadan urinib koring.',
          );
        }
        break;

      default:
        break;
    }
  }

  private async handleDatabaseChannelCreation(
    ctx: Context,
    text: string,
    session: any,
  ) {
    switch (session.step) {
      case 0: // Channel ID
        this.sessionService.updateSessionData(ctx.from!.id, {
          channelId: text,
        });
        this.sessionService.setStep(ctx.from!.id, 1);
        await ctx.reply('📝 Kanal nomini kiriting:');
        break;

      case 1: // Channel Name
        try {
          await this.channelService.createDatabaseChannel(
            session.data.channelId,
            text,
          );

          this.sessionService.clearSession(ctx.from!.id);
          const admin = await this.getAdmin(ctx);
          await ctx.reply(
            '✅ Database kanal muvaffaqiyatli qoshildi!',
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          await ctx.reply(
            '❌ Xatolik yuz berdi. Iltimos qaytadan urinib koring.',
          );
        }
        break;

      default:
        break;
    }
  }

  private async handleMandatoryChannelCreation(
    ctx: Context,
    text: string,
    session: any,
  ) {
    switch (session.step) {
      case 0: // Channel ID
        this.sessionService.updateSessionData(ctx.from!.id, {
          channelId: text,
        });
        this.sessionService.setStep(ctx.from!.id, 1);
        await ctx.reply('📝 Kanal nomini kiriting:');
        break;

      case 1: // Channel Name
        this.sessionService.updateSessionData(ctx.from!.id, {
          channelName: text,
        });
        this.sessionService.setStep(ctx.from!.id, 2);
        await ctx.reply('🔗 Kanal linkini kiriting (https://t.me/...):');
        break;

      case 2: // Channel Link
        try {
          await this.channelService.create(
            session.data.channelId,
            session.data.channelName,
            text,
          );

          this.sessionService.clearSession(ctx.from!.id);
          const admin = await this.getAdmin(ctx);
          await ctx.reply(
            '✅ Majburiy kanal muvaffaqiyatli qoshildi!',
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          await ctx.reply(
            '❌ Xatolik yuz berdi. Iltimos qaytadan urinib koring.',
          );
        }
        break;

      default:
        break;
    }
  }

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
            '✅ Admin muvaffaqiyatli qoshildi!',
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          await ctx.reply(
            '❌ Xatolik yuz berdi. Iltimos qaytadan urinib koring.',
          );
        }
        break;

      default:
        break;
    }
  }

  private async handlePriceEditing(ctx: Context, text: string, session: any) {
    switch (session.step) {
      case 0: // 1 month price
        const monthly = parseInt(text);
        if (isNaN(monthly)) {
          await ctx.reply('❌ Notogri format. Raqam kiriting:');
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
        if (isNaN(threeMonth)) {
          await ctx.reply('❌ Notogri format. Raqam kiriting:');
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
        if (isNaN(sixMonth)) {
          await ctx.reply('❌ Notogri format. Raqam kiriting:');
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
        if (isNaN(yearly)) {
          await ctx.reply('❌ Notogri format. Raqam kiriting:');
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
          await ctx.reply('❌ Xatolik yuz berdi.');
        }
        break;

      default:
        break;
    }
  }

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
            '✅ Karta malumotlari yangilandi!',
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          await ctx.reply('❌ Xatolik yuz berdi.');
        }
        break;

      default:
        break;
    }
  }

  // ==================== PAYMENT RECEIPT HANDLER ====================
  private async handlePaymentReceipt(ctx: Context, text: string, session: any) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    const amount = parseInt(text.replace(/\s/g, ''));
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(
        "❌ Notog'ri summa. Faqat raqamlarni kiriting.\nMasalan: 50000",
      );
      return;
    }

    const receiptFileId = session.data.receiptFileId;
    if (!receiptFileId) {
      await ctx.reply(
        '❌ Chek rasmi topilmadi. Iltimos, qaytadan chek yuboring.',
      );
      this.sessionService.clearSession(ctx.from!.id);
      return;
    }

    try {
      // Send payment notification to admins
      const admins = await this.adminService.listAdmins();

      const message = `
🔔 **Yangi to'lov cheki**

👤 Foydalanuvchi: ${user.firstName || "Noma'lum"}
🆔 ID: ${user.telegramId}
${user.username ? `📱 Username: @${user.username}\n` : ''}
💰 Summa: ${amount.toLocaleString('uz-UZ')} so'm

📝 To'lovni tekshiring va tasdiqlang.
      `;

      const buttons = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            '✅ Tasdiqlash',
            `approve_payment_${user.id}_${amount}`,
          ),
          Markup.button.callback('❌ Rad etish', `reject_payment_${user.id}`),
        ],
      ]);

      // Send to all admins
      for (const admin of admins) {
        try {
          await ctx.telegram.sendPhoto(admin.telegramId, receiptFileId, {
            caption: message,
            parse_mode: 'Markdown',
            ...buttons,
          });
        } catch (error) {
          this.logger.error(
            `Failed to send payment notification to admin ${admin.telegramId}`,
            error,
          );
        }
      }

      this.sessionService.clearSession(ctx.from!.id);

      await ctx.reply(
        '✅ Chek yuborildi!\n\nAdminlar tekshirib, tez orada javob berishadi.\n\n⏳ Iltimos, kuting...',
      );
    } catch (error) {
      this.logger.error('Error processing payment receipt', error);
      await ctx.reply(
        "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
      );
    }
  }
}
