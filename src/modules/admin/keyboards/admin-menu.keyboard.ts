import { Markup } from 'telegraf';
import { AdminRole } from '@prisma/client';
import type { InlineKeyboardMarkup, ReplyKeyboardMarkup } from 'telegraf/types';

export class AdminKeyboard {
  static getAdminMainMenu(role: AdminRole): Markup.Markup<ReplyKeyboardMarkup> {
    const keyboard: any[] = [];

    // All admins can manage content
    keyboard.push([{ text: '🎬 Kino yuklash' }, { text: '📺 Serial yuklash' }]);

    keyboard.push([{ text: '📊 Statistika' }, { text: '📁 Fieldlar' }]);

    // Managers and SuperAdmins can manage channels
    if (role === AdminRole.MANAGER || role === AdminRole.SUPERADMIN) {
      keyboard.push([
        { text: '📢 Majburiy kanallar' },
        { text: '💾 Database kanallar' },
      ]);
    }

    // Only SuperAdmins can manage admins and broadcasts
    if (role === AdminRole.SUPERADMIN) {
      keyboard.push([{ text: '👥 Adminlar' }, { text: '📣 Reklama yuborish' }]);

      keyboard.push([{ text: "💳 To'lovlar" }, { text: '⚙️ Sozlamalar' }]);
    }

    keyboard.push([{ text: '🔙 Orqaga' }]);

    return Markup.keyboard(keyboard).resize();
  }

  static getFieldManagementMenu(): Markup.Markup<ReplyKeyboardMarkup> {
    return Markup.keyboard([
      [{ text: "➕ Field qo'shish" }, { text: "📋 Fieldlar ro'yxati" }],
      [{ text: '🔙 Orqaga' }],
    ]).resize();
  }

  static getChannelManagementMenu(): Markup.Markup<ReplyKeyboardMarkup> {
    return Markup.keyboard([
      [{ text: "➕ Kanal qo'shish" }, { text: "📋 Kanallar ro'yxati" }],
      [{ text: '🔙 Orqaga' }],
    ]).resize();
  }

  static getPaymentManagementMenu(): Markup.Markup<ReplyKeyboardMarkup> {
    return Markup.keyboard([
      [{ text: "📥 Yangi to'lovlar" }, { text: '✅ Tasdiqlangan' }],
      [{ text: '❌ Rad etilgan' }, { text: "📊 To'lov statistikasi" }],
      [{ text: '🔙 Orqaga' }],
    ]).resize();
  }

  static getCancelButton(): Markup.Markup<ReplyKeyboardMarkup> {
    return Markup.keyboard([[{ text: '❌ Bekor qilish' }]]).resize();
  }

  static getConfirmKeyboard(
    itemId: number,
    action: string,
  ): Markup.Markup<InlineKeyboardMarkup> {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Ha', `${action}_yes_${itemId}`),
        Markup.button.callback("❌ Yo'q", `${action}_no_${itemId}`),
      ],
    ]);
  }
}
