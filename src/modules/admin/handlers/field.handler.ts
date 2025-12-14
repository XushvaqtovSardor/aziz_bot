import { Injectable, Logger } from '@nestjs/common';
import { Action, Ctx, Hears, Message, On, Update } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { FieldService } from '../../field/services/field.service';
import { SessionService } from '../services/session.service';
import { AdminState, FieldCreationData } from '../types/session.interface';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';

@Update()
@Injectable()
export class FieldHandler {
  private readonly logger = new Logger(FieldHandler.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly fieldService: FieldService,
    private readonly sessionService: SessionService,
  ) {}

  private async getAdmin(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  private async sendFieldsList(ctx: Context) {
    const fields = await this.fieldService.findAll();
    if (!fields.length) {
      await ctx.reply(
        "📭 Fieldlar topilmadi. Avval `➕ Field qo'shish` orqali yarating.",
      );
      return;
    }

    let message = '📋 Mavjud fieldlar:\n\n';
    for (const field of fields) {
      message += `• ${field.name}\n`;
      message += `  - Kanal: ${field.channelLink || field.channelId}\n`;
      message += `  - ID: ${field.id}\n\n`;
    }

    const buttons = fields.map((field) => [
      Markup.button.callback(`🗑 ${field.name}`, `delete_field_${field.id}`),
    ]);

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
  }

  @Hears('📁 Fieldlar')
  async openFieldsMenu(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    await ctx.reply(
      '📁 Fieldlar bo‘limi',
      AdminKeyboard.getFieldManagementMenu(),
    );
  }

  @Hears("➕ Field qo'shish")
  async startFieldCreation(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin || !ctx.from) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.sessionService.createSession(ctx.from.id, AdminState.CREATING_FIELD);
    await ctx.reply(
      '1️⃣ Field nomini kiriting:',
      AdminKeyboard.getCancelButton(),
    );
  }

  @On('text')
  async handleFieldCreationText(
    @Ctx() ctx: Context,
    @Message('text') text: string,
  ) {
    if (!ctx.from) return;

    const session = this.sessionService.getSession(ctx.from.id);
    if (!session || session.state !== AdminState.CREATING_FIELD) return;

    if (text === '❌ Bekor qilish') {
      this.sessionService.clearSession(ctx.from.id);
      await ctx.reply(
        '❌ Bekor qilindi.',
        AdminKeyboard.getFieldManagementMenu(),
      );
      return;
    }

    const data = session.data as FieldCreationData;

    if (session.step === 0) {
      this.sessionService.updateSessionData(ctx.from.id, { name: text.trim() });
      this.sessionService.nextStep(ctx.from.id);
      await ctx.reply(
        '2️⃣ Kanal linkini kiriting (masalan: https://t.me/kanal_nomi yoki @kanal_nomi):',
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    if (session.step === 1) {
      try {
        await this.fieldService.create({
          name: (data.name || '').trim(),
          channelLink: text.trim(),
        });
        await ctx.reply(
          '✅ Field yaratildi!',
          AdminKeyboard.getFieldManagementMenu(),
        );
      } catch (error: any) {
        await ctx.reply(
          `❌ Xatolik: ${error?.message || 'Noma’lum xatolik'}`,
          AdminKeyboard.getFieldManagementMenu(),
        );
      } finally {
        this.sessionService.clearSession(ctx.from.id);
      }
    }
  }

  @Hears("📋 Fieldlar ro'yxati")
  async getFieldsList(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    await this.sendFieldsList(ctx);
  }

  @Action(/^delete_field_(\d+)$/)
  async askDeleteConfirm(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) {
      await ctx.answerCbQuery("❌ Sizda admin huquqi yo'q.", {
        show_alert: true,
      });
      return;
    }

    const fieldId = Number((ctx as any).match?.[1]);
    if (!fieldId) return;

    const field = await this.fieldService.findOne(fieldId);
    if (!field) {
      await ctx.answerCbQuery('❌ Field topilmadi!', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();

    await ctx.reply(
      `❓ "${field.name}" fieldini o‘chirasizmi?`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Ha', `confirm_delete_field_${fieldId}`),
          Markup.button.callback("❌ Yo'q", `cancel_delete_field_${fieldId}`),
        ],
      ]),
    );
  }

  @Action(/^confirm_delete_field_(\d+)$/)
  async confirmDelete(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) {
      await ctx.answerCbQuery("❌ Sizda admin huquqi yo'q.", {
        show_alert: true,
      });
      return;
    }

    const fieldId = Number((ctx as any).match?.[1]);
    if (!fieldId) return;

    try {
      await this.fieldService.delete(fieldId);
      await ctx.answerCbQuery('✅ O‘chirildi!');
      await ctx.deleteMessage();
      await this.sendFieldsList(ctx);
    } catch (error: any) {
      this.logger.error(`Delete field failed: ${error?.message || error}`);
      await ctx.answerCbQuery('❌ O‘chirishda xatolik!', { show_alert: true });
    }
  }

  @Action(/^cancel_delete_field_(\d+)$/)
  async cancelDelete(@Ctx() ctx: Context) {
    await ctx.answerCbQuery('Bekor qilindi');
    await ctx.deleteMessage();
  }
}
