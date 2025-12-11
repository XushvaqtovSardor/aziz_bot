import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Context, Markup } from 'telegraf';
import { Update, Start, On, Ctx, Command, Action } from 'nestjs-telegraf';

@Update()
@Injectable()
export class BotUpdate {
  private adminIds: number[];
  private moviesChannelId: string;

  constructor(private prisma: PrismaService) {
    this.adminIds = (process.env.ADMIN_CHAT_IDS || '')
      .split(',')
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    this.moviesChannelId = process.env.MOVIES_CHANNEL_ID || '';
  }

  private isAdmin(chatId: number): boolean {
    return this.adminIds.includes(chatId);
  }

  @Start()
  async handleStart(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const chatId = String(from.id);

    await this.prisma.user.upsert({
      where: { chatId },
      update: {},
      create: {
        chatId,
        username: from.username || null,
        isAdmin: this.isAdmin(from.id),
      },
    });

    const hasAccess = await this.checkSubscription(ctx);
    if (!hasAccess) return;

    await ctx.reply(
      ' Assalomu alaykum! Kino botga xush kelibsiz!\n\n' +
        'Kinoni kod orqali olish uchun kodni yuboring (masalan: 345)',
      this.getMainMenu(from.id),
    );
  }

  private getMainMenu(userId: number) {
    const buttons = [[Markup.button.callback(' Qidirish', 'search_menu')]];

    if (this.isAdmin(userId)) {
      buttons.push([Markup.button.callback('Admin Panel', 'admin_panel')]);
    }

    return Markup.inlineKeyboard(buttons);
  }

  @Action('search_menu')
  async searchMenu(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '��� Qidirish turi tanlang:',
      Markup.inlineKeyboard([
        [Markup.button.callback(" Reyting bo'yicha", 'search_rating')],
        [Markup.button.callback(" Nomi bo'yicha", 'search_name')],
        [Markup.button.callback(" Yili bo'yicha", 'search_year')],
        [Markup.button.callback(' Orqaga', 'back_main')],
      ]),
    );
  }

  @Action('search_rating')
  async searchByRating(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      "Reyting oralig'ini tanlang:",
      Markup.inlineKeyboard([
        [
          Markup.button.callback('0-2', 'rating_0_2'),
          Markup.button.callback('2-4', 'rating_2_4'),
        ],
        [
          Markup.button.callback('4-6', 'rating_4_6'),
          Markup.button.callback('6-8', 'rating_6_8'),
        ],
        [Markup.button.callback('8-10', 'rating_8_10')],
        [Markup.button.callback(' Orqaga', 'search_menu')],
      ]),
    );
  }

  @Action(/^rating_(\d+)_(\d+)$/)
  async handleRatingSearch(@Ctx() ctx: Context) {
    const match = (ctx as any).match as RegExpExecArray;
    const minRating = parseFloat(match[1]);
    const maxRating = parseFloat(match[2]);

    await ctx.answerCbQuery();

    const videos = await this.prisma.video.findMany({
      where: {
        rating: {
          gte: minRating,
          lte: maxRating,
        },
      },
      take: 10,
      orderBy: { rating: 'desc' },
    });

    if (videos.length === 0) {
      await ctx.reply("❌ Bu reyting oralig'ida kinolar topilmadi.");
      return;
    }

    for (const video of videos) {
      await ctx.replyWithVideo(video.fileId, {
        caption: this.formatVideoCaption(video),
      });
    }
  }

  @Action('search_name')
  async searchByName(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(' Kino nomini yuboring:');
    // User will send text message
  }

  @Action('search_year')
  async searchByYear(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await ctx.reply(' Yilni kiriting (masalan: 2020):');
    // User will send text message
  }

  @Action('back_main')
  async backToMain(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      'Asosiy menyu\n\nKinoni kod orqali olish uchun kodni yuboring',
      this.getMainMenu(ctx.from.id),
    );
  }

  @Action('admin_panel')
  async adminPanel(@Ctx() ctx: Context) {
    if (!ctx.from || !this.isAdmin(ctx.from.id)) {
      await ctx.answerCbQuery("Sizda admin huquqi yo'q!");
      return;
    }

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '��� Admin Panel',
      Markup.inlineKeyboard([
        [Markup.button.callback('��� Kanallar', 'admin_channels')],
        [Markup.button.callback('��� Statistika', 'admin_stats')],
        [Markup.button.callback('��� Orqaga', 'back_main')],
      ]),
    );
  }

  @Action('admin_channels')
  async adminChannels(@Ctx() ctx: Context) {
    if (!ctx.from || !this.isAdmin(ctx.from.id)) return;

    await ctx.answerCbQuery();

    const channels = await this.prisma.channel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    let text = "��� Kanallar ro'yxati:\n\n";
    if (channels.length === 0) {
      text += "Hozircha kanallar yo'q.\n\n";
    } else {
      channels.forEach((ch, i) => {
        text += `${i + 1}. ${ch.channelName} (${ch.channelId})\n`;
      });
    }

    text += "\n��� Kanal qo'shish: /addchannel @channel | Nomi | Link\n";
    text += "��� Kanal o'chirish: /delchannel @channel";

    await ctx.editMessageText(
      text,
      Markup.inlineKeyboard([
        [Markup.button.callback('��� Admin Panel', 'admin_panel')],
      ]),
    );
  }

  @Action('admin_stats')
  async adminStats(@Ctx() ctx: Context) {
    if (!ctx.from || !this.isAdmin(ctx.from.id)) return;

    await ctx.answerCbQuery();

    const totalUsers = await this.prisma.user.count();
    const totalChannels = await this.prisma.channel.count({
      where: { isActive: true },
    });
    const totalVideos = await this.prisma.video.count();

    const topVideos = await this.prisma.video.findMany({
      take: 5,
      orderBy: { views: 'desc' },
    });

    let text = '��� Statistika:\n\n';
    text += `��� Foydalanuvchilar: ${totalUsers}\n`;
    text += `��� Kanallar: ${totalChannels}\n`;
    text += `��� Kinolar: ${totalVideos}\n\n`;
    text += "��� TOP 5 ko'rilgan kinolar:\n";

    topVideos.forEach((v, i) => {
      text += `${i + 1}. ${v.title || v.code} (${v.views} ko\'rishlar)\n`;
    });

    await ctx.editMessageText(
      text,
      Markup.inlineKeyboard([
        [Markup.button.callback('Admin Panel', 'admin_panel')],
      ]),
    );
  }

  @Command('addchannel')
  async addChannel(@Ctx() ctx: Context) {
    if (!ctx.from || !this.isAdmin(ctx.from.id)) return;

    const message: any = ctx.message;
    const parts = message.text
      .split(' ')
      .slice(1)
      .join(' ')
      .split('|')
      .map((p: string) => p.trim());

    if (parts.length < 2) {
      await ctx.reply(
        " Noto'g'ri format!\n\n" +
          "To'g'ri format:\n" +
          '/addchannel @channel | Kanal nomi | https://t.me/+invite (ixtiyoriy)',
      );
      return;
    }

    const [channelId, channelName, inviteLink] = parts;

    try {
      await this.prisma.channel.create({
        data: {
          channelId,
          channelName,
          inviteLink: inviteLink || null,
        },
      });
      await ctx.reply(`Kanal qo'shildi: ${channelName}`);
    } catch (error) {
      await ctx.reply("Xatolik! Kanal allaqachon mavjud bo'lishi mumkin.");
    }
  }

  @Command('delchannel')
  async deleteChannel(@Ctx() ctx: Context) {
    if (!ctx.from || !this.isAdmin(ctx.from.id)) return;

    const message: any = ctx.message;
    const channelId = message.text.split(' ')[1];

    if (!channelId) {
      await ctx.reply(
        '❌ Kanal ID ni kiriting!\n\nMisol: /delchannel @mychannel',
      );
      return;
    }

    try {
      await this.prisma.channel.update({
        where: { channelId },
        data: { isActive: false },
      });
      await ctx.reply("Kanal o'chirildi!");
    } catch (error) {
      await ctx.reply('Kanal topilmadi!');
    }
  }

  @On('channel_post')
  async handleChannelPost(@Ctx() ctx: Context) {
    const update: any = ctx.update;
    const post = update.channel_post;

    if (!post || !post.video || !post.caption) return;
    if (String(post.chat.id) !== this.moviesChannelId) return;

    const caption = post.caption;
    const match = caption.match(/#(\d+)\s+(.+)/s);

    if (!match) return;

    const code = match[1];
    const details = match[2];

    const ratingMatch = details.match(/⭐️\s*Reyting:\s*([\d.]+)/);
    const yearMatch = details.match(/s*Yil:\s*(\d+)/);
    const genreMatch = details.match(/\s*Janr:\s*([^\n]+)/);
    const durationMatch = details.match(/⏱\s*Davomiyligi:\s*([^\n]+)/);
    const titleMatch = details.match(/^(.+?)(?=\n|$)/);

    const title = titleMatch ? titleMatch[1].trim() : null;
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
    const year = yearMatch ? parseInt(yearMatch[1]) : null;
    const genre = genreMatch ? genreMatch[1].trim() : null;
    const duration = durationMatch ? durationMatch[1].trim() : null;

    try {
      await this.prisma.video.create({
        data: {
          code,
          fileId: post.video.file_id,
          title,
          rating,
          year,
          genre,
          duration,
          description: details,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const nextCode = await this.findNextAvailableCode(parseInt(code));
        await ctx.telegram.sendMessage(
          this.moviesChannelId,
          `⚠️ Kod #${code} band! Keyingi bo'sh kod: #${nextCode}`,
          { reply_parameters: { message_id: post.message_id } },
        );
      }
    }
  }

  private async findNextAvailableCode(startCode: number): Promise<number> {
    let code = startCode + 1;
    while (true) {
      const existing = await this.prisma.video.findUnique({
        where: { code: String(code) },
      });
      if (!existing) return code;
      code++;
    }
  }

  @On('text')
  async onText(@Ctx() ctx: Context) {
    const message: any = ctx.message;
    const text = message.text;

    if (!text || text.startsWith('/')) return;

    const hasAccess = await this.checkSubscription(ctx);
    if (!hasAccess) return;

    if (/^\d+$/.test(text)) {
      await this.sendVideoByCode(ctx, text);
    } else {
      await this.searchVideoByName(ctx, text);
    }
  }

  private async sendVideoByCode(ctx: Context, code: string) {
    const video = await this.prisma.video.findUnique({
      where: { code },
    });

    if (!video) {
      await ctx.reply("❌ Bu kod bo'yicha kino topilmadi.");
      return;
    }

    await this.prisma.video.update({
      where: { code },
      data: { views: { increment: 1 } },
    });

    await ctx.replyWithVideo(video.fileId, {
      caption: this.formatVideoCaption(video),
    });
  }

  private async searchVideoByName(ctx: Context, query: string) {
    const videos = await this.prisma.video.findMany({
      where: {
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: 5,
    });

    if (videos.length === 0) {
      await ctx.reply('❌ Bunday nomli kino topilmadi.');
      return;
    }

    for (const video of videos) {
      await ctx.replyWithVideo(video.fileId, {
        caption: this.formatVideoCaption(video),
      });
    }
  }

  private formatVideoCaption(video: any): string {
    let caption = `#${video.code} ${video.title || 'Nomsiz'}\n\n`;

    if (video.rating) caption += `⭐️ Reyting: ${video.rating}/10\n`;
    if (video.year) caption += `��� Yil: ${video.year}\n`;
    if (video.genre) caption += `��� Janr: ${video.genre}\n`;
    if (video.duration) caption += `⏱ Davomiyligi: ${video.duration}\n`;
    if (video.description) caption += `\n${video.description}`;

    return caption;
  }

  private async checkSubscription(ctx: Context): Promise<boolean> {
    if (!ctx.from) return false;

    const channels = await this.prisma.channel.findMany({
      where: { isActive: true },
    });

    if (channels.length === 0) return true;

    const notJoined: typeof channels = [];

    for (const channel of channels) {
      try {
        const member = await ctx.telegram.getChatMember(
          channel.channelId,
          ctx.from.id,
        );
        if (!['member', 'administrator', 'creator'].includes(member.status)) {
          notJoined.push(channel);
        }
      } catch {
        notJoined.push(channel);
      }
    }

    if (notJoined.length > 0) {
      const buttons: any[] = notJoined.map((ch) => [
        Markup.button.url(
          `📢 ${ch.channelName}`,
          ch.inviteLink || `https://t.me/${ch.channelId.replace('@', '')}`,
        ),
      ]);

      buttons.push([Markup.button.callback('✅ Tekshirish', 'check_sub')]);

      await ctx.reply(
        "❗️ Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:\n\n" +
          '��� Barcha kanallarga a\'zo bo\'lib, "Tekshirish" tugmasini bosing.',
        Markup.inlineKeyboard(buttons),
      );

      return false;
    }

    return true;
  }

  @Action('check_sub')
  async checkSub(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();

    const hasAccess = await this.checkSubscription(ctx);

    if (hasAccess) {
      await ctx.deleteMessage();
      await ctx.reply(
        '✅ Tabriklaymiz! Endi botdan foydalanishingiz mumkin.\n\n' +
          'Kodni yuboring yoki qidirish tugmasini bosing.',
        this.getMainMenu(ctx.from?.id || 0),
      );
    }
  }
}
