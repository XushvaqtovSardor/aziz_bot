/**
 * Example: How to Use Premium Guard in Your Handlers
 *
 * This file demonstrates how to protect premium features using the PremiumGuard
 */
import { Injectable } from '@nestjs/common';
import { Update, Hears, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { PremiumRequired } from '../decorators/premium.decorator';
import { UserService } from '../../user/services/user.service';
import { PaymentService } from '../services/payment.service';
@Update()
@Injectable()
export class PremiumExamplesHandler {
  constructor(
    private readonly userService: UserService,
    private readonly paymentService: PaymentService,
  ) {}
  /**
   * Example 1: Using @PremiumRequired decorator
   * The easiest way to protect a handler
   */
  @PremiumRequired()
  @Hears('Watch HD')
  async watchHDMovie(@Ctx() ctx: Context) {
    await ctx.reply('🎬 Enjoy your HD movie!');
  }
  /**
   * Example 2: Manual premium check
   * For more control over the flow
   */
  @Hears('Download Movie')
  async downloadMovie(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    const hasPremium = await this.paymentService.checkPremiumStatus(
      user.telegramId,
    );
    if (!hasPremium) {
      await ctx.reply(
        '❌ Bu funksiya faqat Premium foydalanuvchilar uchun\n\n' +
          "💎 Premium sotib olish uchun /premium buyrug'idan foydalaning",
      );
      return;
    }
    await ctx.reply('⬇️ Yuklab olish boshlandi...');
  }
  /**
   * Example 3: Conditional premium features
   * Show different content based on premium status
   */
  @Hears('Search Movies')
  async searchMovies(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    const hasPremium = await this.paymentService.checkPremiumStatus(
      user.telegramId,
    );
    if (hasPremium) {
      await ctx.reply(
        '🔍 Advanced search: Enter movie name, year, genre, or IMDB rating',
      );
    } else {
      await ctx.reply('🔍 Basic search: Enter movie name');
      await ctx.reply('💡 Upgrade to Premium for advanced filters! /premium');
    }
  }
  /**
   * Example 4: Premium-only movie quality
   * Note: Requires MovieService implementation
   */
  /*
  @Hears(/watch_movie_(.+)/)
  async watchMovie(@Ctx() ctx: Context) {
    const movieCode = (ctx.message as any).text.split('_')[2];
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    const hasPremium = await this.paymentService.checkPremiumStatus(
      user.telegramId,
    );
    const movie = await this.movieService.findByCode(parseInt(movieCode));
    if (movie.quality === '4K' || movie.quality === '1080p') {
      if (!hasPremium) {
        await ctx.reply(
          '🎬 Bu kino faqat Premium foydalanuvchilar uchun\n\n' +
            `📹 Sifat: ${movie.quality}\n` +
            '💎 Premium sotib olish: /premium',
        );
        return;
      }
    }
    await ctx.replyWithVideo(movie.videoFileId);
  }
  */
  /**
   * Example 5: Premium feature with trial
   * Give users a taste before requiring premium
   * Note: Requires getAdFreeViewCount and incrementAdFreeViewCount methods in UserService
   */
  /*
  @Hears('Ad-free Experience')
  async adFreeExperience(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    const hasPremium = await this.paymentService.checkPremiumStatus(
      user.telegramId,
    );
    if (!hasPremium) {
      const viewCount = await this.userService.getAdFreeViewCount(user.id);
      if (viewCount < 3) {
        await ctx.reply(`✨ Reklamasiz ko'rish (${3 - viewCount} ta qoldi)`);
        await this.userService.incrementAdFreeViewCount(user.id);
      } else {
        await ctx.reply(
          "❌ Reklamasiz ko'rish uchun Premium kerak\n\n" +
            '💎 Premium sotib olish: /premium',
        );
        return;
      }
    }
    await ctx.reply('🎬 Enjoy ad-free viewing!');
  }
  */
  /**
   * Example 6: Premium status in content listing
   * Show premium badge for premium content
   * Note: Requires MovieService implementation
   */
  /*
  @Hears('Browse Movies')
  async browseMovies(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    const hasPremium = await this.paymentService.checkPremiumStatus(
      user.telegramId,
    );
    const movies = await this.movieService.getLatestMovies(10);
    let message = '🎬 **Latest Movies**\n\n';
    for (const movie of movies) {
      const isPremiumContent =
        movie.quality === '4K' || movie.quality === '1080p';
      const premiumBadge = isPremiumContent ? '💎' : '';
      const lockIcon = isPremiumContent && !hasPremium ? '🔒' : '';
      message += `${lockIcon}${premiumBadge} ${movie.title} (${movie.year})\n`;
      message += `   📹 ${movie.quality} | ⭐ ${movie.imdb}\n\n`;
    }
    if (!hasPremium) {
      message += '\n💡 🔒 = Premium content\n';
      message += '💎 Unlock all with Premium: /premium';
    }
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
  */
}
/**
 * Usage in Movie Service:
 * Note: This is a conceptual example. Requires Movie, User types and MovieService implementation
 */
/*
export class MovieServiceExample {
  constructor(private readonly paymentService: PaymentService) {}
  async sendMovie(ctx: Context, movie: any, user: any) {
    const hasPremium = await this.paymentService.checkPremiumStatus(
      user.telegramId,
    );
    const caption = hasPremium
      ? `🎬 ${movie.title}`
      : `🎬 ${movie.title}\n\n💎 Premium sotib oling va reklamasiz tomosha qiling: /premium`;
    await ctx.replyWithVideo(movie.videoFileId, {
      caption,
      parse_mode: 'Markdown',
    });
    if (!hasPremium) {
      await this.showAd(ctx);
    }
  }
  private async showAd(ctx: Context) {
    await ctx.reply(
      '📢 Reklama\n\n' +
        "Bu yerda reklama bo'ladi...\n\n" +
        '💡 Reklamadan qutulish uchun: /premium',
    );
  }
}
*/
