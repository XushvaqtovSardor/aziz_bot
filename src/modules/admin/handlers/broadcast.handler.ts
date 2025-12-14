import { Injectable } from '@nestjs/common';
import { Update, Hears, Action, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { BroadcastService } from '../../broadcast/services/broadcast.service';
import { BroadcastType } from '@prisma/client';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';
import { Markup } from 'telegraf';

interface BroadcastSession {
  type?: BroadcastType;
  message?: string;
  photoFileId?: string;
  videoFileId?: string;
  buttonText?: string;
  buttonUrl?: string;
}

@Update()
@Injectable()
export class BroadcastHandler {
  constructor(
    private adminService: AdminService,
    private broadcastService: BroadcastService,
  ) {}

  @Hears('📣 Reklama yuborish')
  async startBroadcast(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    const hasPermission = await this.adminService.hasPermission(
      String(admin.telegramId),
      'SEND_BROADCAST',
    );

    if (!hasPermission) {
      await ctx.reply("❌ Sizda reklama yuborish huquqi yo'q.");
      return;
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📢 Hammaga', 'broadcast_type_ALL')],
      [
        Markup.button.callback('💎 Premium', 'broadcast_type_PREMIUM'),
        Markup.button.callback('🆓 Oddiy', 'broadcast_type_FREE'),
      ],
    ]);

    await ctx.reply('📣 Kimga yubormoqchisiz?', keyboard);
  }

  @Action(/^broadcast_type_(.+)$/)
  async selectBroadcastType(@Ctx() ctx: Context) {
    const match = (ctx.callbackQuery as any).data.match(
      /^broadcast_type_(.+)$/,
    );
    const type = match[1] as BroadcastType;
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    // TODO: Implement session management with Redis or memory store

    await ctx.editMessageText(
      `✅ Tanlandi: ${this.getTypeName(type)}\n\n📝 Endi xabar matnini yuboring (yoki rasm/video bilan):`,
    );

    await ctx.answerCbQuery();
  }

  async handleBroadcastMessage(ctx: Context, text: string) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    // TODO: Implement session management
    // const session = ctx.session as any;
    const session = { broadcast: { type: 'AD' } } as any;
    if (!session?.broadcast?.type) {
      await ctx.reply('❌ Avval reklama turini tanlang.');
      return;
    }

    const broadcastSession: BroadcastSession = session.broadcast;
    broadcastSession.message = text;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('📤 Yuborish', 'broadcast_send'),
        Markup.button.callback("🔗 Tugma qo'shish", 'broadcast_add_button'),
      ],
      [Markup.button.callback('❌ Bekor qilish', 'broadcast_cancel')],
    ]);

    await ctx.reply(
      `📝 Xabar:\n${text}\n\n✅ Tayyor. Yuborishni tasdiqlang:`,
      keyboard,
    );
  }

  async handleBroadcastPhoto(
    ctx: Context,
    photoFileId: string,
    caption?: string,
  ) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    // TODO: Implement session management
    // const session = ctx.session as any;
    const session = { broadcast: { type: 'AD' } } as any;
    if (!session?.broadcast?.type) {
      await ctx.reply('❌ Avval reklama turini tanlang.');
      return;
    }

    const broadcastSession: BroadcastSession = session.broadcast;
    broadcastSession.photoFileId = photoFileId;
    broadcastSession.message = caption || '';

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('📤 Yuborish', 'broadcast_send'),
        Markup.button.callback("🔗 Tugma qo'shish", 'broadcast_add_button'),
      ],
      [Markup.button.callback('❌ Bekor qilish', 'broadcast_cancel')],
    ]);

    await ctx.reply('✅ Rasm qabul qilindi. Yuborishni tasdiqlang:', keyboard);
  }

  async sendBroadcast(ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    // TODO: Implement session management with Redis or memory store
    await ctx.editMessageText('❌ Session not implemented');
    return;

    // const session = ctx.session as any;
    // const broadcastSession: BroadcastSession = session?.broadcast;

    // if (!broadcastSession?.type || !broadcastSession?.message) {
    //   await ctx.answerCbQuery("❌ Ma'lumotlar to'liq emas.");
    //   return;
    // }

    // await ctx.answerCbQuery('⏳ Yuborilmoqda...');
    // await ctx.editMessageText('⏳ Reklama yuborilmoqda...');

    // try {
    //   // Create broadcast in database
    //   const broadcast = await this.broadcastService.create({
    //     type: broadcastSession.type,
    //     messageText: broadcastSession.message,
    //     createdBy: String(admin.telegramId),
    //     mediaFileId: broadcastSession.photoFileId || broadcastSession.videoFileId,
    //   });

    //   // Send broadcast
    //   const result = await this.broadcastService.sendBroadcast(
    //     ctx.telegram as any,
    //     broadcast.id,
    //   );

    //   await ctx.editMessageText(
    //     `✅ Reklama yuborildi!\n\n` +
    //       `📊 Statistika:\n` +
    //       `├ Jami: ${result.total}\n` +
    //       `├ Muvaffaqiyatli: ${result.success}\n` +
    //       `└ Xatolik: ${result.failed}`,
    //   );

    //   // Clear session
    //   delete session.broadcast;
    // } catch (error) {
    //   await ctx.editMessageText('❌ Xatolik yuz berdi.');
    // }
  }

  private getTypeName(type: BroadcastType): string {
    switch (type) {
      case BroadcastType.ALL:
        return 'Barcha foydalanuvchilar';
      case BroadcastType.PREMIUM:
        return 'Premium foydalanuvchilar';
      case BroadcastType.FREE:
        return 'Oddiy foydalanuvchilar';
      default:
        return "Noma'lum";
    }
  }

  private async getAdminFromContext(ctx: Context) {
    const telegramUser = ctx.from;
    if (!telegramUser) return null;

    const isAdmin = await this.adminService.isAdmin(String(telegramUser.id));
    if (!isAdmin) return null;

    return { telegramId: telegramUser.id };
  }
}
