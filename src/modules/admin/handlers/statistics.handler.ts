import { Injectable } from '@nestjs/common';
import { Update, Hears, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { UserService } from '../../user/services/user.service';
import { MovieService } from '../../content/services/movie.service';
import { SerialService } from '../../content/services/serial.service';
import { PaymentService } from '../../payment/services/payment.service';
import { WatchHistoryService } from '../../content/services/watch-history.service';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';

@Update()
@Injectable()
export class StatisticsHandler {
  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private movieService: MovieService,
    private serialService: SerialService,
    private paymentService: PaymentService,
    private watchHistoryService: WatchHistoryService,
  ) {}

  @Hears('📊 Statistika')
  async showStatistics(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) return;

    // Gather all statistics
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
├ Kutilmoqda: ${paymentStats.pendingCount}
├ Rad etilgan: ${paymentStats.rejectedCount}
└ Jami daromad: ${paymentStats.totalRevenue.toLocaleString()} so'm

📈 **Yangi foydalanuvchilar (30 kun):** ${newUsers}

🎬 **Top 5 Kinolar:**
${topContent.movies.map((m, i) => `${i + 1}. ${m.title} - ${m.views} ko'rish`).join('\n')}

📺 **Top 5 Seriallar:**
${topContent.serials.map((s, i) => `${i + 1}. ${s.title} - ${s.views} ko'rish`).join('\n')}
    `.trim();

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  private async getAdminFromContext(ctx: Context) {
    const telegramUser = ctx.from;
    if (!telegramUser) return null;

    const isAdmin = await this.adminService.isAdmin(String(telegramUser.id));
    if (!isAdmin) return null;

    return { telegramId: telegramUser.id };
  }
}
