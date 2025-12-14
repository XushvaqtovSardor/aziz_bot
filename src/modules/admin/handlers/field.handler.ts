import { Injectable } from '@nestjs/common';
import { Update, Hears, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { FieldService } from '../../field/services/field.service';
import { DatabaseChannelService } from '../../field/services/database-channel.service';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';

@Update()
@Injectable()
export class FieldHandler {
  constructor(
    private adminService: AdminService,
    private fieldService: FieldService,
    private databaseChannelService: DatabaseChannelService,
  ) {}

  private async getAdminFromContext(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  @Hears('📁 Fieldlar')
  async showFieldMenu(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    await ctx.reply(
      '📁 Field boshqaruvi',
      AdminKeyboard.getFieldManagementMenu(),
    );
  }

  @Hears("📋 Fieldlar ro'yxati")
  async showAllFields(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    const fields = await this.fieldService.findAll();

    if (!fields.length) {
      await ctx.reply('Hech qanday field topilmadi.');
      return;
    }

    let message = "📁 **Fieldlar ro'yxati:**\n\n";

    for (const field of fields) {
      const movieCount = await this.fieldService.getContentCount(
        field.id,
        'MOVIE',
      );
      const serialCount = await this.fieldService.getContentCount(
        field.id,
        'SERIAL',
      );

      message += `📂 **${field.name}**\n`;
      message += `├ ID: ${field.id}\n`;
      message += `├ Kinolar: ${movieCount}\n`;
      message += `├ Seriallar: ${serialCount}\n`;
      message += `├ Database kanal: ${field.databaseChannel?.channelName || "Yo'q"}\n`;
      message += `└ Holat: ${field.databaseChannel?.isActive ? '✅ Faol' : '❌ Nofaol'}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  async createField(
    ctx: Context,
    name: string,
    channelId: string,
    channelTitle: string,
  ) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    try {
      // First create database channel
      const dbChannel = await this.databaseChannelService.create(
        channelId,
        channelTitle,
      );

      // Then create field
      const field = await this.fieldService.create({
        name,
        channelId: channelId,
        databaseChannelId: dbChannel.id,
      });

      await ctx.reply(`✅ Field "${name}" muvaffaqiyatli yaratildi!`);
    } catch (error) {
      await ctx.reply("❌ Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    }
  }

  async deleteField(ctx: Context, fieldId: number) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    const hasPermission = await this.adminService.hasPermission(
      admin.telegramId,
      'DELETE_FIELD',
    );

    if (!hasPermission) {
      await ctx.reply("❌ Sizda bu amalni bajarish uchun ruxsat yo'q.");
      return;
    }

    try {
      await this.fieldService.delete(fieldId);
      await ctx.reply("✅ Field muvaffaqiyatli o'chirildi!");
    } catch (error) {
      await ctx.reply(
        "❌ Xatolik yuz berdi. Field ichida kontent bo'lishi mumkin.",
      );
    }
  }
}
