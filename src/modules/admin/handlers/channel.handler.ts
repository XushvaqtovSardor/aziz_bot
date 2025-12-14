import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { ChannelService } from '../../channel/services/channel.service';
import { DatabaseChannelService } from '../../field/services/database-channel.service';

@Update()
@Injectable()
export class ChannelHandler {
  private readonly logger = new Logger(ChannelHandler.name);

  constructor(
    private adminService: AdminService,
    private channelService: ChannelService,
    private databaseChannelService: DatabaseChannelService,
  ) {}

  private async getAdminFromContext(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  @Hears('📢 Majburiy kanallar')
  async showMandatoryChannels(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.logger.log(`Admin ${admin.telegramId} opened mandatory channels`);

    const channels = await this.channelService.findAll();

    if (!channels.length) {
      await ctx.reply(
        "📭 Majburiy kanallar topilmadi.\n\nKanal qo'shish uchun:\n/add_mandatory_channel @channel_username Kanal nomi",
      );
      return;
    }

    let message = "📢 **Majburiy kanallar ro'yxati:**\n\n";

    for (const channel of channels) {
      message += `📍 **${channel.channelName}**\n`;
      message += `├ ID: ${channel.channelId}\n`;
      message += `├ Link: ${channel.channelLink}\n`;
      message += `├ Tartib: ${channel.order}\n`;
      message += `└ Holat: ${channel.isActive ? '✅ Faol' : '❌ Nofaol'}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  @Hears('💾 Database kanallar')
  async showDatabaseChannels(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.logger.log(`Admin ${admin.telegramId} opened database channels`);

    const channels = await this.databaseChannelService.findAll();

    if (!channels.length) {
      await ctx.reply('📭 Database kanallar topilmadi.');
      return;
    }

    let message = "💾 **Database kanallar ro'yxati:**\n\n";

    for (const channel of channels) {
      message += `📂 **${channel.channelName}**\n`;
      message += `├ ID: ${channel.channelId}\n`;
      message += `└ Holat: ${channel.isActive ? '✅ Faol' : '❌ Nofaol'}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
}
