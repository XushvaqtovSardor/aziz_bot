import { Injectable, Logger } from '@nestjs/common';
import {
  Update,
  Hears,
  Ctx,
  Command,
  Action,
  On,
  Message,
} from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { AdminRole } from '@prisma/client';

@Update()
@Injectable()
export class AdminManagementHandler {
  private readonly logger = new Logger(AdminManagementHandler.name);
  private adminCreationSessions = new Map<
    number,
    { step: string; telegramId?: string; username?: string; role?: AdminRole }
  >();

  constructor(private adminService: AdminService) {}

  private async getAdminFromContext(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  @Hears('👥 Adminlar')
  async showAdmins(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    const isSuperAdmin = await this.adminService.isSuperAdmin(admin.telegramId);
    if (!isSuperAdmin) {
      await ctx.reply("❌ Faqat SuperAdmin bu bo'limga kirishi mumkin.");
      return;
    }

    this.logger.log(`SuperAdmin ${admin.telegramId} opened admin list`);

    const admins = await this.adminService.findAll();

    if (!admins.length) {
      await ctx.reply('📭 Adminlar topilmadi.');
      return;
    }

    let message = "👥 **Adminlar ro'yxati:**\n\n";

    for (const adm of admins) {
      message += `👤 **${adm.username || adm.telegramId}**\n`;
      message += `├ ID: ${adm.telegramId}\n`;
      message += `├ Rol: ${adm.role}\n`;
      message += `├ Admin qo\'shish: ${adm.canAddAdmin ? '✅' : '❌'}\n`;
      message += `├ Kontent o\'chirish: ${adm.canDeleteContent ? '✅' : '❌'}\n`;
      message += `└ Qo\'shilgan: ${adm.createdAt.toLocaleDateString()}\n\n`;
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("➕ Admin qo'shish", 'add_new_admin')],
    ]);

    await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
  }

  @Hears('⚙️ Sozlamalar')
  async showSettings(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    const isSuperAdmin = await this.adminService.isSuperAdmin(admin.telegramId);
    if (!isSuperAdmin) {
      await ctx.reply("❌ Faqat SuperAdmin bu bo'limga kirishi mumkin.");
      return;
    }

    this.logger.log(`SuperAdmin ${admin.telegramId} opened settings`);

    const message = `
⚙️ **Bot sozlamalari**

Bu bo'limda siz quyidagi sozlamalarni o'zgartirishingiz mumkin:

• Premium narxlari
• Karta raqami va egasi
• Bot haqida ma'lumot
• Support username
• Xush kelibsiz xabari

📝 Sozlamalarni o'zgartirish uchun /settings buyrug'idan foydalaning.
    `.trim();

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  @Hears('🔙 Orqaga')
  async handleBack(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    this.logger.log(
      `Admin ${admin.telegramId} going back to admin menu from submenu`,
    );

    const { AdminKeyboard } = await import('../keyboards/admin-menu.keyboard');
    await ctx.reply(
      '🔐 Admin panel',
      AdminKeyboard.getAdminMainMenu(admin.role),
    );
  }
}
