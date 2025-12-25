import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx, On, Message, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { ChannelService } from '../../channel/services/channel.service';
import { SessionService } from '../services/session.service';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';
import { AdminState } from '../types/session.interface';

/**
 * Admin Channels Handler - Kanal boshqaruvi
 * Majburiy va Database kanallarni boshqarish
 */
@Update()
@Injectable()
export class AdminChannelsHandler {
  private readonly logger = new Logger(AdminChannelsHandler.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly channelService: ChannelService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Admin tekshirish
   */
  private async getAdmin(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  // ==================== MAJBURIY KANALLAR ====================

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

  // ==================== DATABASE KANALLAR ====================

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

  // ==================== TEXT HANDLER - Sessiya boshqaruvi ====================

  @On('text')
  async handleChannelText(@Ctx() ctx: Context, @Message('text') text: string) {
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

    // Faqat kanal bilan bog'liq state'larni handle qilish
    switch (currentState) {
      case String(AdminState.ADD_MANDATORY_CHANNEL):
        await this.handleMandatoryChannelCreation(ctx, text, session);
        break;
      case String(AdminState.ADD_DATABASE_CHANNEL):
        await this.handleDatabaseChannelCreation(ctx, text, session);
        break;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Majburiy kanal yaratish jarayoni
   */
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
            "✅ Majburiy kanal muvaffaqiyatli qo'shildi!",
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          this.logger.error(
            `Majburiy kanal yaratishda xatolik: ${error.message}`,
          );
          await ctx.reply(`❌ Xatolik: ${error.message}`);
        }
        break;
    }
  }

  /**
   * Database kanal yaratish jarayoni
   */
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
            "✅ Database kanal muvaffaqiyatli qo'shildi!",
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          this.logger.error(
            `Database kanal yaratishda xatolik: ${error.message}`,
          );
          await ctx.reply(`❌ Xatolik: ${error.message}`);
        }
        break;
    }
  }
}
