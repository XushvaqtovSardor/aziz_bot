import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx, On, Message, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { AdminService } from './services/admin.service';
import { UserService } from '../user/services/user.service';
import { MovieService } from '../content/services/movie.service';
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
🎬 **Eng ko'p ko'rilgan kinolar:** ${topContent.movies.length}
    `;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
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
  @Hears('� Kinoga video biriktirish')
  async startVideoAttachment(@Ctx() ctx: Context) {
    this.logger.log(`Admin ${ctx.from?.id} starting video attachment`);
    const admin = await this.getAdmin(ctx);
    if (!admin || !ctx.from) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }
    this.sessionService.createSession(ctx.from.id, AdminState.ATTACHING_VIDEO);
    await ctx.reply(
      '📹 Kinoga video biriktirish boshlandi!\n\n' + '🔢 Kino kodini kiriting:',
      AdminKeyboard.getCancelButton(),
    );
  }
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
    await ctx.editMessageText(' Asosiy menyu');
    await ctx.reply(
      '👨‍💼 Admin panel',
      AdminKeyboard.getAdminMainMenu(admin.role),
    );
  }
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
  @On('text')
  async handleSessionText(@Ctx() ctx: Context, @Message('text') text: string) {
    try {
      if (!ctx.from) return;

      if ('photo' in ctx.message!) {
        this.logger.debug('[TEXT] Photo message skipped in text handler');
        return;
      }

      const session = this.sessionService.getSession(ctx.from.id);

      this.logger.debug(
        `[TEXT] User: ${ctx.from.id} | Msg: "${text}" | Session: ${!!session}`,
      );

      if (text === '🎬 Kino yuklash') return this.startMovieCreation(ctx);
      if (text === 'Kinoga video biriktirish')
        return this.startVideoAttachment(ctx);

      if (!session) return;
      const admin = await this.getAdmin(ctx);
      if (!admin) return;

      if (text === '❌ Bekor qilish') {
        this.sessionService.clearSession(ctx.from.id);
        return ctx.reply(
          '❌ Bekor qilindi.',
          AdminKeyboard.getAdminMainMenu(admin.role),
        );
      }

      // ENUM string yoki number bo'lishidan qat'iy nazar solishtirish
      const currentState = String(session.state);

      switch (currentState) {
        case String(AdminState.CREATING_MOVIE):
          await this.handleMovieCreation(ctx, text, session);
          break;
        case String(AdminState.ATTACHING_VIDEO):
          await this.handleVideoAttachment(ctx, text, session);
          break;
        // ... qolgan case'lar
        default:
          this.logger.warn(
            `[TEXT] State uchun handler topilmadi: ${currentState}`,
          );
          break;
      }
    } catch (error) {
      this.logger.error('CRITICAL ERROR in handleSessionText:', error);
      await ctx.reply('❌ Tizimda xatolik: ' + error.message);
    }
  }
  private async handleMovieCreation(ctx: Context, text: string, session: any) {
    try {
      // Stepni raqamga o'tkazamiz (Type mismatch oldini olish uchun)
      const currentStep = Number(session.step);
      this.logger.debug(
        `[MOVIE_CREATE] Qadam: ${currentStep}, Kelgan matn: "${text}"`,
      );

      switch (currentStep) {
        case MovieCreateStep.CODE: {
          const code = parseInt(text);
          if (isNaN(code) || code <= 0) {
            return await ctx.reply(
              "❌ Kod raqam bo'lishi kerak!",
              AdminKeyboard.getCancelButton(),
            );
          }
          const isAvailable = await this.movieService.isCodeAvailable(code);
          if (!isAvailable) {
            const nearest = await this.movieService.findNearestAvailableCodes(
              code,
              5,
            );
            return await ctx.reply(
              `❌ Kod band. Bo'shlari: ${nearest.join(', ')}`,
            );
          }
          this.sessionService.updateSessionData(ctx.from!.id, { code });
          this.sessionService.setStep(ctx.from!.id, MovieCreateStep.TITLE);
          await ctx.reply(
            '2️⃣ Kino nomini kiriting:',
            AdminKeyboard.getCancelButton(),
          );
          break;
        }

        case MovieCreateStep.TITLE: {
          this.sessionService.updateSessionData(ctx.from!.id, { title: text });
          this.sessionService.setStep(ctx.from!.id, MovieCreateStep.GENRE);
          await ctx.reply(
            '3️⃣ Janr kiriting (Action, Drama...):',
            AdminKeyboard.getCancelButton(),
          );
          break;
        }

        case MovieCreateStep.GENRE: {
          this.sessionService.updateSessionData(ctx.from!.id, { genre: text });
          this.sessionService.setStep(
            ctx.from!.id,
            MovieCreateStep.DESCRIPTION,
          );
          // Bu yerda keyboardni oddiyroq qilib ko'ramiz
          await ctx.reply(
            "4️⃣ Tavsif kiriting:\n\n⏭ O'tkazib yuborish uchun 'Next' deb yozing",
            Markup.keyboard([['Next'], ['❌ Bekor qilish']]).resize(),
          );
          break;
        }

        case MovieCreateStep.DESCRIPTION: {
          this.logger.log(`[MOVIE] DESCRIPTION step - qabul qilindi`);

          const description = text.toLowerCase() === 'next' ? null : text;
          this.sessionService.updateSessionData(ctx.from!.id, { description });
          this.sessionService.setStep(ctx.from!.id, 4);
          this.sessionService.setStep(ctx.from!.id, MovieCreateStep.PHOTO);
          this.logger.log(`[MOVIE] Step o'zgartirildi: 3 -> 4 (PHOTO)`);

          await ctx.reply(
            '5️⃣ Endi kino rasmini (Poster) yuboring:',
            Markup.removeKeyboard(),
          );
          this.logger.log(`[MOVIE] Rasm so'ralgan xabar yuborildi`);
          break;
        }

        case 5: {
          // Field selection
          const data = session.data;
          if (data.waitingForField && data.fields) {
            const fieldIndex = parseInt(text) - 1;
            if (
              isNaN(fieldIndex) ||
              fieldIndex < 0 ||
              fieldIndex >= data.fields.length
            ) {
              await ctx.reply("❌ Noto'g'ri raqam. Iltimos qaytadan kiriting:");
              return;
            }

            const selectedField = data.fields[fieldIndex];

            // Database kanalga rasmni yuborish
            const dbChannels = await this.channelService.findAllDatabase();
            if (!dbChannels || dbChannels.length === 0) {
              this.logger.error(`[PHOTO] Database kanal topilmadi!`);
              return ctx.reply('❌ Database kanal mavjud emas.');
            }

            const dbChannel = dbChannels[0];
            this.logger.log(
              `[PHOTO] Rasm kanalga yuborilmoqda: ${dbChannel.channelId}`,
            );

            let sentPhoto;
            try {
              sentPhoto = await ctx.telegram.sendPhoto(
                dbChannel.channelId,
                data.posterFileId,
                { caption: `🎬 ${data.title}\n🆔 Kod: ${data.code}` },
              );
              this.logger.log(
                `[PHOTO] Rasm kanalga yuborildi, message_id=${sentPhoto.message_id}`,
              );
            } catch (tgErr) {
              this.logger.error(`[PHOTO] Telegram xatosi: ${tgErr.message}`);
              return ctx.reply(
                `❌ Bot rasm yubora olmadi. Botni kanalga admin qiling!`,
              );
            }

            // Kinoni bazaga saqlash
            try {
              await this.movieService.create({
                code: String(data.code),
                title: data.title,
                genre: data.genre,
                description: data.description || '',
                posterFileId: data.posterFileId,
                posterMessageId: String(sentPhoto.message_id),
                fieldId: selectedField.id,
                partsCount: 0,
              } as any);

              this.logger.log(`[PHOTO] Kinо bazaga saqlandi!`);
            } catch (dbErr) {
              this.logger.error(
                `[PHOTO] Bazaga saqlash xatosi: ${dbErr.message}`,
              );
              return ctx.reply(
                `❌ Ma'lumotlarni saqlashda xatolik: ${dbErr.message}`,
              );
            }

            this.sessionService.clearSession(ctx.from!.id);
            const admin = await this.getAdmin(ctx);

            await ctx.reply(
              `✅ Kino muvaffaqiyatli saqlandi!\n\n` +
                `📁 Field: ${selectedField.name}\n` +
                `🎬 Kino: ${data.title}\n` +
                `🆔 Kod: ${data.code}\n\n` +
                'Endi videolarni yuklash uchun kinoning kodini bilgan holda video yuboring.',
              AdminKeyboard.getAdminMainMenu(admin!.role),
            );
          }
          break;
        }

        default:
          this.logger.warn(`[MOVIE_CREATE] Noma'lum step: ${currentStep}`);
          break;
      }
    } catch (error) {
      this.logger.error(`[MOVIE_CREATE ERROR]`, error);
      await ctx.reply(`❌ Xatolik: ${error.message}`);
    }
  }
  @On('photo')
  async handlePhoto(@Ctx() ctx: Context) {
    this.logger.log(
      '[PHOTO-HANDLER] ======================= PHOTO RECEIVED =======================',
    );

    try {
      if (!ctx.from) {
        this.logger.warn('[PHOTO-HANDLER] ctx.from is null');
        return;
      }
      if (!ctx.message || !('photo' in ctx.message)) {
        this.logger.warn(
          '[PHOTO-HANDLER] ctx.message or ctx.message.photo is missing',
        );
        return;
      }

      this.logger.log(`[PHOTO-HANDLER] User ID: ${ctx.from.id}`);

      const admin = await this.getAdmin(ctx);
      if (!admin) {
        this.logger.warn('[PHOTO-HANDLER] User is not admin');
        return;
      }

      const session = this.sessionService.getSession(ctx.from.id);

      // Agar session mavjud bo'lmasa, yangi session yaratamiz va kod so'raymiz
      if (!session) {
        this.logger.log(
          '[PHOTO-HANDLER] No session found, starting new movie creation',
        );

        const photo = ctx.message.photo[ctx.message.photo.length - 1];

        // Sessiyani yaratamiz va rasmni saqlaymiz
        this.sessionService.createSession(
          ctx.from.id,
          AdminState.CREATING_MOVIE,
        );
        this.sessionService.updateSessionData(ctx.from.id, {
          posterFileId: photo.file_id,
          posterMessageId: String(ctx.message.message_id),
        });
        this.sessionService.setStep(ctx.from.id, MovieCreateStep.CODE);

        await ctx.reply(
          '🎬 Kino yuklash boshlandi!\n\n' +
            '1️⃣ Kino kodini kiriting:\n' +
            "⚠️ Kod FAQAT raqamlardan iborat bo'lishi kerak!\n" +
            'Masalan: 12345',
          AdminKeyboard.getCancelButton(),
        );
        return;
      }

      this.logger.log(
        `[PHOTO-HANDLER] Session found - State: ${session.state}, Step: ${session.step}`,
      );

      const currentState = String(session.state);
      const currentStep = Number(session.step);

      this.logger.log(
        `[PHOTO-HANDLER] Checking: state="${currentState}" vs CREATING_MOVIE="${AdminState.CREATING_MOVIE}", step=${currentStep} vs 4`,
      );

      if (currentState !== String(AdminState.CREATING_MOVIE)) {
        this.logger.warn(`[PHOTO-HANDLER] Wrong state: ${currentState}`);
        return;
      }

      if (currentStep !== 4) {
        this.logger.warn(
          `[PHOTO-HANDLER] Wrong step: ${currentStep}, expected 4`,
        );
        return;
      }

      this.logger.log(
        `[PHOTO-HANDLER] ✅ Validation passed! Processing photo...`,
      );

      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const data = session.data as MovieCreationData;

      // Rasmni yangilash
      this.sessionService.updateSessionData(ctx.from.id, {
        posterFileId: photo.file_id,
        posterMessageId: String(ctx.message.message_id),
      });

      this.logger.log(`[PHOTO] Photo saved, now asking for field selection`);

      // Field tanlash
      const allFields = await this.fieldService.findAll();
      if (!allFields || allFields.length === 0) {
        this.logger.error(`[PHOTO] Field topilmadi!`);
        return ctx.reply('❌ Avval field yarating.');
      }

      let message = '📁 Qaysi fieldga joylashtirasiz?\n\n';
      allFields.forEach((field, index) => {
        message += `${index + 1}. ${field.name}\n`;
      });
      message += '\nRaqamini kiriting (masalan: 1)';

      this.sessionService.updateSessionData(ctx.from.id, {
        fields: allFields,
        waitingForField: true,
      });
      this.sessionService.setStep(ctx.from.id, 5); // Field selection step

      await ctx.reply(message, AdminKeyboard.getCancelButton());
    } catch (error) {
      this.logger.error(`[PHOTO] CRITICAL ERROR:`, error);
      await ctx.reply(`❌ Kutilmagan xatolik: ${error.message}`);
    }
  }

  @On('video')
  async handleMovieVideo(@Ctx() ctx: Context) {
    if (!ctx.from || !('video' in ctx.message)) return;

    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    let session = this.sessionService.getSession(ctx.from.id);

    // Agar session mavjud bo'lmasa, yangi session yaratamiz va kod so'raymiz
    if (!session) {
      this.logger.log('[VIDEO] No session found, starting video attachment');

      this.sessionService.createSession(
        ctx.from.id,
        AdminState.ATTACHING_VIDEO,
      );
      this.sessionService.updateSessionData(ctx.from.id, {
        pendingVideo: ctx.message.video,
      });

      await ctx.reply(
        '📹 Video qabul qilindi!\n\n' + '🔢 Kino kodini kiriting:',
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    if (session.state !== AdminState.ATTACHING_VIDEO) {
      return; // Not in video attachment mode
    }

    const video = ctx.message.video;
    const data = session.data;

    // Agar movieCode mavjud bo'lsa, videoni yuklash
    if (!data.movieCode) {
      // Video keldi lekin kod yo'q - bu xato holat
      this.sessionService.updateSessionData(ctx.from.id, {
        pendingVideo: video,
      });
      await ctx.reply(
        '🔢 Kino kodini kiriting:',
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    try {
      const dbChannels = await this.channelService.findAllDatabase();
      if (dbChannels.length === 0) {
        await ctx.reply(
          '❌ Hech qanday database kanal topilmadi. Avval database kanal yarating.',
        );
        this.sessionService.clearSession(ctx.from.id);
        return;
      }
      await ctx.reply('⏳ Video yuklanmoqda, iltimos kuting...');
      const dbChannel = dbChannels[0];
      const sentVideo = await ctx.telegram.sendVideo(
        dbChannel.channelId,
        video.file_id,
        {
          caption: `🎬 Kod: ${data.movieCode} - ${data.partNumber}-qism`,
        },
      );
      const videoFileIds = data.videoFileIds || [];
      const videoMessageIds = data.videoMessageIds || [];
      videoFileIds.push(video.file_id);
      videoMessageIds.push(String(sentVideo.message_id));
      this.sessionService.updateSessionData(ctx.from.id, {
        videoFileIds,
        videoMessageIds,
      });
      await ctx.reply(
        `✅ ${data.partNumber}-qism yuklandi!\n\n` + 'Davom etasizmi?',
        Markup.keyboard([
          ['➡️ Davom etish', '✅ Tugatish'],
          ['❌ Bekor qilish'],
        ]).resize(),
      );
    } catch (error) {
      console.error('Error uploading video:', error);
      await ctx.reply(
        `❌ Xatolik yuz berdi. Botni database kanalga admin qiling.\n\nXatolik: ${error.message}`,
      );
    }
  }
  private async handleVideoAttachment(
    ctx: Context,
    text: string,
    session: any,
  ) {
    const data = session.data;
    if (text === '➡️ Davom etish') {
      const newPartNumber = (data.partNumber || 1) + 1;
      this.sessionService.updateSessionData(ctx.from!.id, {
        partNumber: newPartNumber,
      });
      await ctx.reply(
        `${newPartNumber}-qism videosini yuboring:`,
        AdminKeyboard.getCancelButton(),
      );
      return;
    }
    if (text === '✅ Tugatish') {
      await this.finalizeMovieUpload(ctx, session);
      return;
    }
    if (data.waitingForField && data.fields) {
      const fieldIndex = parseInt(text) - 1;
      if (
        isNaN(fieldIndex) ||
        fieldIndex < 0 ||
        fieldIndex >= data.fields.length
      ) {
        await ctx.reply("❌ Noto'g'ri raqam. Iltimos qaytadan kiriting:");
        return;
      }
      const selectedField = data.fields[fieldIndex];
      await this.publishMovieToChannel(ctx, session, selectedField);
      return;
    }

    // Kod kiritilgan
    if (!data.movieCode) {
      const code = parseInt(text);
      if (isNaN(code) || code <= 0) {
        await ctx.reply(
          "❌ Kod faqat raqamlardan iborat bo'lishi kerak!\nMasalan: 12345\n\nIltimos, qaytadan kiriting:",
          AdminKeyboard.getCancelButton(),
        );
        return;
      }
      const movie = await this.movieService.findByCode(String(code));
      if (!movie) {
        await ctx.reply(
          `❌ ${code} kodli kino topilmadi!\n\nIltimos, to'g'ri kod kiriting:`,
          AdminKeyboard.getCancelButton(),
        );
        return;
      }
      this.sessionService.updateSessionData(ctx.from!.id, {
        movieCode: String(code),
        movieId: movie.id,
        movieData: movie,
        partNumber: 1,
        videoFileIds: [],
        videoMessageIds: [],
      });

      // Agar pending video mavjud bo'lsa, uni yuklash
      if (data.pendingVideo) {
        const video = data.pendingVideo;
        try {
          const dbChannels = await this.channelService.findAllDatabase();
          if (dbChannels.length === 0) {
            await ctx.reply('❌ Hech qanday database kanal topilmadi.');
            return;
          }
          await ctx.reply('⏳ Video yuklanmoqda...');
          const dbChannel = dbChannels[0];
          const sentVideo = await ctx.telegram.sendVideo(
            dbChannel.channelId,
            video.file_id,
            {
              caption: `🎬 Kod: ${code} - 1-qism`,
            },
          );
          this.sessionService.updateSessionData(ctx.from!.id, {
            videoFileIds: [video.file_id],
            videoMessageIds: [String(sentVideo.message_id)],
            pendingVideo: null,
          });
          await ctx.reply(
            `✅ ${movie.title} topildi va 1-qism yuklandi!\n\n` +
              'Davom etasizmi?',
            Markup.keyboard([
              ['➡️ Davom etish', '✅ Tugatish'],
              ['❌ Bekor qilish'],
            ]).resize(),
          );
        } catch (error) {
          console.error('Error uploading pending video:', error);
          await ctx.reply(`❌ Video yuklashda xatolik: ${error.message}`);
        }
      } else {
        await ctx.reply(
          `✅ ${movie.title} topildi!\n\n1-qism videosini yuboring:`,
          AdminKeyboard.getCancelButton(),
        );
      }
    }
  }
  private async finalizeMovieUpload(ctx: Context, session: any) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;
    const data = session.data;
    try {
      const movie = data.movieData;
      for (let i = 0; i < data.videoFileIds.length; i++) {
        await this.movieService.addMoviePart(
          data.movieId,
          i + 1,
          data.videoFileIds[i],
          data.videoMessageIds[i],
        );
      }
      await this.movieService.updatePartsCount(
        data.movieId,
        data.videoFileIds.length,
      );
      const allFields = await this.fieldService.findAll();
      if (allFields.length === 0) {
        await ctx.reply(
          '❌ Hech qanday field topilmadi. Avval field yarating.',
        );
        this.sessionService.clearSession(ctx.from.id);
        return;
      }
      let message = '📁 Qaysi fieldga joylashtirasiz?\n\n';
      allFields.forEach((field, index) => {
        message += `${index + 1}. ${field.name}\n`;
      });
      message += '\nRaqamini kiriting (masalan: 1)';
      this.sessionService.updateSessionData(ctx.from.id, {
        fields: allFields,
        waitingForField: true,
      });
      await ctx.reply(message, AdminKeyboard.getCancelButton());
    } catch (error) {
      console.error('Error finalizing movie:', error);
      await ctx.reply(`❌ Xatolik yuz berdi.\n\nXatolik: ${error.message}`);
    }
  }
  private async publishMovieToChannel(ctx: Context, session: any, field: any) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;
    const data = session.data;
    const movie = data.movieData;
    try {
      let caption = `🎬 **${movie.title}**\n`;
      if (movie.genre) caption += `🎭 Janr: ${movie.genre}\n`;
      if (movie.description) caption += `📝 ${movie.description}\n`;
      if (data.videoFileIds.length > 1) {
        caption += `📊 Qismlar soni: ${data.videoFileIds.length}\n`;
      }
      caption += `🆔 Kod: ${movie.code}`;
      const button = Markup.inlineKeyboard([
        [
          Markup.button.url(
            '🎬 Tomosha qilish',
            `https://t.me/${process.env.BOT_USERNAME}?start=movie_${movie.code}`,
          ),
        ],
      ]);
      const sentPoster = await ctx.telegram.sendPhoto(
        field.channelId,
        movie.posterFileId,
        {
          caption,
          parse_mode: 'Markdown',
          ...button,
        },
      );
      await this.movieService.update(movie.id, {
        channelMessageId: sentPoster.message_id,
      });
      await this.movieService.update(movie.id, {
        fieldId: field.id,
      } as any);
      this.sessionService.clearSession(ctx.from.id);
      await ctx.reply(
        `✅ Kino muvaffaqiyatli nashr etildi!\n\n` +
          `📦 Field: ${field.name}\n` +
          `🎬 Nomi: ${movie.title}\n` +
          `📊 Qismlar: ${data.videoFileIds.length}\n` +
          `🔗 Message ID: ${sentPoster.message_id}`,
        AdminKeyboard.getAdminMainMenu(admin.role),
      );
    } catch (error) {
      console.error('Error publishing movie:', error);
      await ctx.reply(
        `❌ Xatolik yuz berdi. Botni field kanalga admin qiling.\n\nXatolik: ${error.message}`,
      );
    }
  }
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
