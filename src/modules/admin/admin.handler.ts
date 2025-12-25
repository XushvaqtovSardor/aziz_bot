import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { AdminService } from './services/admin.service';
import { UserService } from '../user/services/user.service';
import { PaymentService } from '../payment/services/payment.service';
import { WatchHistoryService } from '../content/services/watch-history.service';
import { BroadcastService } from '../broadcast/services/broadcast.service';
import { AdminKeyboard } from './keyboards/admin-menu.keyboard';

/**
 * Admin Main Handler - Asosiy admin funksiyalari
 * Statistika, reklama va asosiy menyu
 */
@Update()
@Injectable()
export class AdminHandler {
  private readonly logger = new Logger(AdminHandler.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly userService: UserService,
    private readonly paymentService: PaymentService,
    private readonly watchHistoryService: WatchHistoryService,
    private readonly broadcastService: BroadcastService,
  ) {}

  /**
   * Admin tekshirish - yordamchi metod
   */
  private async getAdmin(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  // ==================== ADMIN START COMMAND ====================

  @Command('admin')
  async showAdminPanel(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.logger.log(`Admin ${admin.telegramId} opened admin panel`);

    await ctx.reply(
      `👋 Assalomu alaykum, ${admin.username || 'Admin'}!\n\n🔐 Admin paneliga xush kelibsiz.`,
      AdminKeyboard.getAdminMainMenu(admin.role),
    );
  }

  // ==================== ORQAGA BUTTON ====================

  @Hears('🔙 Orqaga')
  async backToMainMenu(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    await ctx.reply(
      '👨‍💼 Asosiy menyu',
      AdminKeyboard.getAdminMainMenu(admin.role),
    );
  }

  // ==================== STATISTIKA ====================

  @Hears('📊 Statistika')
  async showStatistics(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    try {
      await ctx.reply('⏳ Statistika yuklanmoqda...');

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

🎬 **Eng ko'p ko'rilgan kinolar:** ${topContent.movies.length > 0 ? topContent.movies.length : 'Ma\'lumot yo\'q'}
      `.trim();

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Statistika olishda xatolik:', error);
      await ctx.reply('❌ Statistika olishda xatolik yuz berdi.');
    }
  }

  // ==================== REKLAMA YUBORISH ====================

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
}
