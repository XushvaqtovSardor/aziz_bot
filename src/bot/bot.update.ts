import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Context } from 'telegraf';
import { Update, Ctx, Action } from 'nestjs-telegraf';
@Update()
@Injectable()
export class BotUpdate {
  private readonly logger = new Logger(BotUpdate.name);
  constructor(private prisma: PrismaService) {}
  @Action('check_subscription')
  async checkSubscription(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    this.logger.debug(`User ${ctx.from.id} checking subscription`);
    await ctx.answerCbQuery();
    const channels = await this.prisma.mandatoryChannel.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    if (channels.length === 0) {
      await ctx.reply("✅ Hech qanday majburiy kanal yo'q!");
      return;
    }
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
      } catch (error) {
        this.logger.error(
          `Error checking subscription for channel ${channel.channelId}:`,
          error.message,
        );
        notJoined.push(channel);
      }
    }
    if (notJoined.length === 0) {
      this.logger.log(`User ${ctx.from.id} is subscribed to all channels`);
      await ctx.editMessageText("✅ Siz barcha kanallarga obuna bo'lgansiz!");
    } else {
      this.logger.log(
        `User ${ctx.from.id} not subscribed to ${notJoined.length} channels`,
      );
    }
  }
}
