import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import {
  Command,
  Update,
  Ctx,
  Hears,
  Action,
  On,
  Message,
} from 'nestjs-telegraf';
import { UserService } from './services/user.service';
import { LanguageService } from '../language/language.service';
import { ChannelService } from '../channel/services/channel.service';
import { MainMenuKeyboard } from './keyboards/main-menu.keyboard';
import { AdminService } from '../admin/services/admin.service';
import { SessionService } from '../admin/services/session.service';
import { AdminKeyboard } from '../admin/keyboards/admin-menu.keyboard';
import { MovieService } from '../content/services/movie.service';
import { SerialService } from '../content/services/serial.service';
import { PaymentService } from '../payment/services/payment.service';
import { PremiumService } from '../payment/services/premium.service';
import { SettingsService } from '../settings/services/settings.service';
import { Markup } from 'telegraf';

@Update()
@Injectable()
export class UserHandler {
  private readonly logger = new Logger(UserHandler.name);

  constructor(
    private userService: UserService,
    private languageService: LanguageService,
    private channelService: ChannelService,
    private adminService: AdminService,
    private sessionService: SessionService,
    private movieService: MovieService,
    private serialService: SerialService,
    private paymentService: PaymentService,
    private premiumService: PremiumService,
    private settingsService: SettingsService,
  ) {}

  // ==================== START ====================
  @Command('start')
  async handleStart(@Ctx() ctx: any) {
    this.logger.log(`User ${ctx.from?.id} sent /start command`);
    const telegramUser = ctx.from;
    if (!telegramUser) return;

    // Parse deep link parameter (e.g., /start movie_avatar2024)
    const startPayload = ctx.message?.text?.split(' ')[1];

    // Clear any active admin sessions
    this.sessionService.clearSession(telegramUser.id);

    // Find or create user
    const user = await this.userService.findOrCreate(String(telegramUser.id), {
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
      languageCode: telegramUser.language_code,
    });

    // Check if user is blocked
    if (user.isBlocked) {
      const texts = await this.languageService.getTexts(user.language);
      await ctx.reply(texts.userBlocked);
      return;
    }

    // Update last activity
    await this.userService.updateLastActivity(String(user.telegramId));

    // Check if user is admin
    const admin = await this.adminService.getAdminByTelegramId(
      String(telegramUser.id),
    );
    if (admin) {
      this.logger.log(`Admin ${admin.telegramId} opened admin panel`);
      await ctx.reply(
        `👋 Assalomu alaykum, ${admin.username || 'Admin'}!\n\n🔐 Siz admin panelidasiz.`,
        AdminKeyboard.getAdminMainMenu(admin.role),
      );
      return;
    }

    // Handle deep link for movies
    if (startPayload && startPayload.startsWith('movie_')) {
      const movieCode = startPayload.replace('movie_', '');
      await this.sendMovieToUser(ctx, user, movieCode);
      return;
    }

    // Get texts in user's language
    const texts = await this.languageService.getTexts(user.language);

    // Check subscription to mandatory channels
    const subscriptionStatus = await this.channelService.checkSubscription(
      ctx.from!.id,
      ctx.telegram as any,
    );

    if (!subscriptionStatus.isSubscribed) {
      const buttons = subscriptionStatus.notSubscribedChannels.map(
        (channel) => [
          Markup.button.url(channel.channelName, channel.channelLink),
        ],
      );
      // buttons.push([Markup.button.callback(texts.checkSubscription, 'check_subscription')]);

      await ctx.reply(
        'Iltimos quyidagi kanallarga obuna boling:',
        Markup.inlineKeyboard(buttons),
      );
      return;
    }

    // User is subscribed, show main menu
    const welcomeMessage = texts.welcomeMessage
      .replace('{firstName}', user.firstName || '')
      .replace(
        '{isPremium}',
        user.isPremium ? texts.premiumUser : texts.freeUser,
      );

    await ctx.reply(
      welcomeMessage,
      MainMenuKeyboard.getMainMenu(texts, user.isPremium),
    );
  }

  @Hears(['🔙 Orqaga', '🔙 Назад', '🔙 Back'])
  async handleBack(@Ctx() ctx: Context) {
    this.logger.log(`User ${ctx.from?.id} going back to main menu`);
    await this.handleStart(ctx);
  }

  @Action('check_subscription')
  async handleCheckSubscription(@Ctx() ctx: Context) {
    const telegramUser = ctx.from;
    if (!telegramUser) return;

    const user = await this.userService.findByTelegramId(
      String(telegramUser.id),
    );
    if (!user || user.isBlocked) return;

    const texts = await this.languageService.getTexts(user.language);

    // Check subscription again
    const subscriptionStatus = await this.channelService.checkSubscription(
      ctx.from!.id,
      ctx.telegram as any,
    );

    if (!subscriptionStatus.isSubscribed) {
      await ctx.answerCbQuery(texts.notSubscribedYet);
      return;
    }

    await ctx.answerCbQuery(texts.subscriptionVerified);
    await ctx.deleteMessage();

    const welcomeMessage = texts.welcomeMessage
      .replace('{firstName}', user.firstName || '')
      .replace(
        '{isPremium}',
        user.isPremium ? texts.premiumUser : texts.freeUser,
      );

    await ctx.reply(
      welcomeMessage,
      MainMenuKeyboard.getMainMenu(texts, user.isPremium),
    );
  }

  // ==================== SEARCH ====================
  @Hears(['🔍 Qidirish', '🔍 Поиск', '🔍 Search'])
  async startSearch(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);
    await ctx.reply('🔍 Kino yoki serial nomini kiriting:');
  }

  // ==================== PREMIUM ====================
  @Command('premium')
  @Hears(['💎 Premium', '💎 Премиум'])
  async showPremium(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);
    const premiumSettings = await this.premiumService.getSettings();

    if (user.isPremium && user.premiumExpiresAt) {
      const expiryDate = user.premiumExpiresAt.toLocaleDateString('uz-UZ');
      await ctx.reply(
        `💎 Sizda premium obuna mavjud!\n\n📅 Amal qilish muddati: ${expiryDate}`,
      );
      return;
    }

    const message = `
💎 **PREMIUM OBUNA**

Premium obuna bilan:
✅ Reklamasiz tomosha
✅ Barcha kinolar va seriallar
✅ Yuqori sifat
✅ Tezkor yuklanish

💰 **Narxlar:**
├ 1 oy: ${premiumSettings.monthlyPrice} ${premiumSettings.currency}
├ 3 oy: ${premiumSettings.threeMonthPrice} ${premiumSettings.currency}
├ 6 oy: ${premiumSettings.sixMonthPrice} ${premiumSettings.currency}
└ 1 yil: ${premiumSettings.yearlyPrice} ${premiumSettings.currency}

💳 **To'lov qilish:**

🔹 **Online to'lov (Payme/Click):**
/buy_premium - Online to'lov orqali sotib olish

🔹 **Plastik karta orqali:**
${premiumSettings.description}

Karta: \`${premiumSettings.cardNumber}\`
Egasi: ${premiumSettings.cardHolder}

To'lovdan keyin chek rasmini yuboring!
    `;

    const buttons = Markup.keyboard([
      [{ text: '📤 Chek yuborish' }],
      [{ text: '🔙 Orqaga' }],
    ]).resize();

    await ctx.reply(message, { parse_mode: 'Markdown', ...buttons });
  }

  @Command('buy_premium')
  async buyPremium(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    const premiumSettings = await this.premiumService.getSettings();

    const message = `💎 **Online to'lov orqali Premium sotib olish**

Muddatni tanlang:`;

    const buttons = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          `1 oy - ${premiumSettings.monthlyPrice} ${premiumSettings.currency}`,
          'pay_1m',
        ),
      ],
      [
        Markup.button.callback(
          `3 oy - ${premiumSettings.threeMonthPrice} ${premiumSettings.currency}`,
          'pay_3m',
        ),
      ],
      [
        Markup.button.callback(
          `6 oy - ${premiumSettings.sixMonthPrice} ${premiumSettings.currency}`,
          'pay_6m',
        ),
      ],
      [
        Markup.button.callback(
          `1 yil - ${premiumSettings.yearlyPrice} ${premiumSettings.currency}`,
          'pay_1y',
        ),
      ],
    ]);

    await ctx.reply(message, { parse_mode: 'Markdown', ...buttons });
  }

  @Action(/^pay_(.+)$/)
  async processPremiumPayment(@Ctx() ctx: Context) {
    const duration = (ctx.callbackQuery as any).data.split('_')[1];
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    const premiumSettings = await this.premiumService.getSettings();

    // Determine amount and days based on duration
    let amount: number;
    let days: number;

    switch (duration) {
      case '1m':
        amount = premiumSettings.monthlyPrice;
        days = 30;
        break;
      case '3m':
        amount = premiumSettings.threeMonthPrice;
        days = 90;
        break;
      case '6m':
        amount = premiumSettings.sixMonthPrice;
        days = 180;
        break;
      case '1y':
        amount = premiumSettings.yearlyPrice;
        days = 365;
        break;
      default:
        await ctx.answerCbQuery("❌ Noto'g'ri tanlov");
        return;
    }

    try {
      // Create payment via API
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3000'}/payment/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: String(user.telegramId),
            amount,
            duration: days,
          }),
        },
      );

      const data = await response.json();

      if (data.success && data.paymentLink) {
        const message = `💳 **To'lov uchun havola**

📊 Summa: ${amount} ${premiumSettings.currency}
⏰ Muddat: ${days} kun

👇 Quyidagi tugmani bosib to'lovni amalga oshiring:`;

        const buttons = Markup.inlineKeyboard([
          [Markup.button.url("💳 To'lovni amalga oshirish", data.paymentLink)],
          [
            Markup.button.callback(
              "✅ To'lovni tekshirish",
              `check_payment_${data.paymentId}`,
            ),
          ],
        ]);

        await ctx.answerCbQuery("✅ To'lov yaratildi");
        await ctx.reply(message, { parse_mode: 'Markdown', ...buttons });
      } else {
        await ctx.answerCbQuery('❌ Xatolik yuz berdi');
        await ctx.reply(
          "❌ To'lovni yaratishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
        );
      }
    } catch (error) {
      this.logger.error('Error creating payment', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
      await ctx.reply(
        "❌ To'lovni yaratishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
      );
    }
  }

  @Action(/^check_payment_(.+)$/)
  async checkPaymentStatus(@Ctx() ctx: Context) {
    const paymentId = (ctx.callbackQuery as any).data.split('_')[2];

    try {
      const response = await fetch(
        `${process.env.API_URL || 'http://localhost:3000'}/payment/status/${paymentId}`,
      );

      const data = await response.json();

      if (data.success && data.payment) {
        if (data.payment.status === 'SUCCESS') {
          await ctx.answerCbQuery("✅ To'lov muvaffaqiyatli amalga oshirildi!");
          await ctx.reply(
            "✅ To'lov qabul qilindi!\n🎉 Premium faollashtirildi",
          );
        } else if (data.payment.status === 'PENDING') {
          await ctx.answerCbQuery("⏳ To'lov kutilmoqda...");
        } else {
          await ctx.answerCbQuery("❌ To'lov amalga oshirilmadi");
        }
      } else {
        await ctx.answerCbQuery("❌ To'lovni tekshirishda xatolik");
      }
    } catch (error) {
      this.logger.error('Error checking payment', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  @Hears('📤 Chek yuborish')
  async requestReceipt(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    await ctx.reply('📸 Chek rasmini yuboring:');
  }

  @On('photo')
  async handlePhoto(@Ctx() ctx: Context) {
    // Only handle if user has no active admin session
    const existingSession = this.sessionService.getSession(ctx.from!.id);
    if (existingSession) {
      return; // Let admin handler deal with it
    }

    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    const photo = (ctx.message as any).photo;
    if (!photo || photo.length === 0) return;

    const fileId = photo[photo.length - 1].file_id;

    // Ask for amount
    await ctx.reply(
      '💰 Tolov summasini kiriting:\nMasalan: 50000\n\nYoki bekor qilish uchun "❌ Bekor qilish" tugmasini bosing.',
      Markup.keyboard([['❌ Bekor qilish']]).resize(),
    );

    // Store file ID temporarily (you can use session service)
    this.sessionService.createSession(ctx.from!.id, 'PAYMENT_RECEIPT' as any);
    this.sessionService.updateSessionData(ctx.from!.id, {
      receiptFileId: fileId,
    });
  }

  // Payment receipt handling moved to admin.handler.ts

  // ==================== LANGUAGE ====================
  @Hears(['🌐 Til', '🌐 Язык', '🌐 Language'])
  async showLanguageMenu(@Ctx() ctx: Context) {
    const buttons = Markup.inlineKeyboard([
      [Markup.button.callback('🇺🇿 Ozbekcha', 'lang_UZ')],
      [Markup.button.callback('🇷🇺 Русский', 'lang_RU')],
      [Markup.button.callback('🇬🇧 English', 'lang_EN')],
    ]);

    await ctx.reply('🌐 Tilni tanlang:', buttons);
  }

  @Action(/^lang_(.+)$/)
  async changeLanguage(@Ctx() ctx: Context) {
    const lang = (ctx.callbackQuery as any).data.split('_')[1];
    await this.userService.updateLanguage(String(ctx.from!.id), lang);

    const texts = await this.languageService.getTexts(lang);
    await ctx.answerCbQuery('✅ Til ozgartirildi');
    await ctx.reply(texts.languageChanged);
  }

  // ==================== ABOUT ====================
  @Hears(['ℹ️ Bot haqida', 'ℹ️ О боте', 'ℹ️ About'])
  async showAbout(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    const botSettings = await this.settingsService.getSettings();
    const texts = await this.languageService.getTexts(user.language);

    await ctx.reply(
      `${botSettings.aboutBot}\n\n📱 Support: @${botSettings.supportUsername}`,
      { parse_mode: 'Markdown' },
    );
  }

  // ==================== PROFILE ====================
  @Hears(['👤 Profil', '👤 Профиль', '👤 Profile'])
  async showProfile(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);

    const premiumStatus = user.isPremium
      ? `✅ Faol (${user.premiumExpiresAt?.toLocaleDateString('uz-UZ')})`
      : '❌ Faol emas';

    const message = `
👤 **Profil**

👨‍💼 Ism: ${user.firstName || 'N/A'}
🆔 ID: ${user.telegramId}
💎 Premium: ${premiumStatus}
🌐 Til: ${user.language}
📅 Ro'yxatdan o'tgan: ${user.createdAt.toLocaleDateString('uz-UZ')}
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  // ==================== CONTENT DELIVERY ====================
  @Action(/^movie_(.+)$/)
  async sendMovie(@Ctx() ctx: Context) {
    const code = (ctx.callbackQuery as any).data.split('_')[1];
    const movie = await this.movieService.findByCode(code);

    if (!movie) {
      await ctx.answerCbQuery('❌ Kino topilmadi');
      return;
    }

    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    // Check premium for quality content
    if (!user.isPremium && movie.quality === 'HD') {
      await ctx.answerCbQuery('⚠️ HD sifat uchun premium kerak');
      return;
    }

    // Send movie
    try {
      await ctx.replyWithVideo(movie.videoFileId, {
        caption: `🎬 ${movie.title}\n\n${movie.description || ''}`,
        parse_mode: 'Markdown',
      });

      // Record view
      await this.movieService.incrementViews(String(movie.id));

      await ctx.answerCbQuery('✅');
    } catch (error) {
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  @Action(/^serial_(.+)$/)
  async sendSerial(@Ctx() ctx: Context) {
    const code = (ctx.callbackQuery as any).data.split('_')[1];
    const serial = await this.serialService.findByCode(code);

    if (!serial) {
      await ctx.answerCbQuery('❌ Serial topilmadi');
      return;
    }

    // Show episodes list
    // const episodes = await this.serialService.getEpisodes(serial.id);
    const episodes: any[] = [];
    const buttons = episodes.map((ep) => [
      Markup.button.callback(`${ep.episodeNumber}-qism`, `episode_${ep.id}`),
    ]);

    await ctx.replyWithPhoto(serial.posterFileId, {
      caption: `📺 ${serial.title}\n\n${serial.description || ''}\n\nQismni tanlang:`,
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });

    await ctx.answerCbQuery('✅');
  }

  @Action(/^episode_(\d+)$/)
  async sendEpisode(@Ctx() ctx: Context) {
    const episodeId = parseInt((ctx.callbackQuery as any).data.split('_')[1]);
    // const episode = await this.serialService.findEpisodeById(episodeId);
    const episode: any = null;

    if (!episode) {
      await ctx.answerCbQuery('❌ Qism topilmadi');
      return;
    }

    try {
      await ctx.replyWithVideo(episode.videoFileId, {
        caption: `📺 ${episode.serial.title} - ${episode.episodeNumber}-qism\n\n${episode.description || ''}`,
        parse_mode: 'Markdown',
      });

      await ctx.answerCbQuery('✅');
    } catch (error) {
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }

  // ==================== MOVIE DELIVERY ====================
  private async sendMovieToUser(ctx: any, user: any, movieCode: string) {
    const movie = await this.movieService.findByCode(movieCode);

    if (!movie) {
      await ctx.reply('❌ Kino topilmadi.');
      return;
    }

    // Check if user is premium
    if (user.isPremium) {
      // Premium users can watch without subscription check
      await this.deliverMovie(ctx, movie);
      return;
    }

    // Check subscription to mandatory channels
    const subscriptionStatus = await this.channelService.checkSubscription(
      ctx.from!.id,
      ctx.telegram as any,
    );

    if (!subscriptionStatus.isSubscribed) {
      // Show mandatory channels with buttons
      const buttons = subscriptionStatus.notSubscribedChannels.map(
        (channel) => [
          Markup.button.url(channel.channelName, channel.channelLink),
        ],
      );

      // Add check subscription and premium buttons
      const checkButtons: any[] = [
        [Markup.button.callback('✅ Tekshirish', `check_movie_${movieCode}`)],
        [Markup.button.callback('💎 Premium sotib olish', 'show_premium')],
      ];

      await ctx.reply(
        "❌ Kinoni ko'rish uchun quyidagi kanallarga obuna bo'ling:\n\n" +
          "Yoki Premium sotib olib, barcha kanallarni o'tkazib yuborishingiz mumkin!",
        Markup.inlineKeyboard([...buttons, ...checkButtons]),
      );
      return;
    }

    // User is subscribed, deliver movie
    await this.deliverMovie(ctx, movie);
  }

  private async deliverMovie(ctx: any, movie: any) {
    try {
      // Parse video message IDs from database channels
      let videoMessages = [];
      if (movie.videoMessageId) {
        try {
          videoMessages = JSON.parse(movie.videoMessageId);
        } catch (e) {
          // If not JSON, treat as single message ID (legacy format)
          videoMessages = [];
        }
      }

      // Try to forward video from database channels
      if (videoMessages.length > 0) {
        // Use the first available database channel
        const firstVideo = videoMessages[0];
        try {
          await ctx.telegram.forwardMessage(
            ctx.from!.id,
            firstVideo.channelId,
            firstVideo.messageId,
          );

          // Send poster with movie info to user
          if (movie.posterFileId) {
            const caption = `
🎬 **${movie.title}**
🎭 Janr: ${movie.genre}
${movie.description ? `📝 ${movie.description}\n` : ''}
🆔 Kod: ${movie.code}
            `.trim();

            await ctx.replyWithPhoto(movie.posterFileId, {
              caption,
              parse_mode: 'Markdown',
            });
          }

          // Increment views
          await this.movieService.incrementViews(String(movie.code));

          this.logger.log(
            `Movie ${movie.code} delivered to user ${ctx.from!.id}`,
          );
          return;
        } catch (error) {
          this.logger.error(`Error forwarding from database channel:`, error);
        }
      }

      // Fallback: try forwarding from field channel (old method)
      if (movie.channelMessageId && movie.field) {
        try {
          await ctx.telegram.forwardMessage(
            ctx.from!.id,
            movie.field.channelId,
            movie.channelMessageId,
          );

          await this.movieService.incrementViews(String(movie.code));
          this.logger.log(
            `Movie ${movie.code} delivered to user ${ctx.from!.id}`,
          );
          return;
        } catch (error) {
          this.logger.error(`Error forwarding from field channel:`, error);
        }
      }

      // Final fallback: send using fileId if available
      if (movie.videoFileId) {
        await ctx.replyWithVideo(movie.videoFileId, {
          caption: `🎬 ${movie.title}\n🎭 Janr: ${movie.genre}${movie.description ? `\n📝 ${movie.description}` : ''}`,
          parse_mode: 'Markdown',
        });

        await this.movieService.incrementViews(String(movie.code));
        this.logger.log(
          `Movie ${movie.code} delivered to user ${ctx.from!.id}`,
        );
        return;
      }

      // No video available
      await ctx.reply('❌ Kino fayli topilmadi.');
    } catch (error) {
      this.logger.error(`Error delivering movie ${movie.code}:`, error);
      await ctx.reply('❌ Kinoni yuborishda xatolik yuz berdi.');
    }
  }

  @Action(/^check_movie_(.+)$/)
  async recheckMovieSubscription(@Ctx() ctx: any) {
    const movieCode = ctx.match[1];
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));

    if (!user) return;

    await ctx.answerCbQuery('Tekshirilmoqda...');
    await this.sendMovieToUser(ctx, user, movieCode);
  }

  @Action('show_premium')
  async showPremiumFromAction(@Ctx() ctx: Context) {
    const user = await this.userService.findByTelegramId(String(ctx.from!.id));
    if (!user) return;

    const premiumSettings = await this.premiumService.getSettings();
    const texts = await this.languageService.getTexts(user.language);

    const message = `
💎 **PREMIUM OBUNA**

✅ Barcha kanallarni o'tkazib yuborish
✅ Reklama yo'q
✅ Tezkor ko'rish

**Narxlar:**
• 1 oy - ${premiumSettings.monthlyPrice} so'm
• 3 oy - ${premiumSettings.threeMonthPrice} so'm  
• 6 oy - ${premiumSettings.sixMonthPrice} so'm
• 1 yil - ${premiumSettings.yearlyPrice} so'm

**To'lov uchun:** ${premiumSettings.cardNumber}
    `.trim();

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📤 Chek yuborish', 'send_receipt')],
        [Markup.button.callback('🔙 Orqaga', 'back_to_start')],
      ]),
    });
    await ctx.answerCbQuery();
  }
}
