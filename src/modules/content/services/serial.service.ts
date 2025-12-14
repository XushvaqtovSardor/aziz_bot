import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SerialData } from '../interfaces/content-data.interface';
import { Telegraf } from 'telegraf';

@Injectable()
export class SerialService {
  constructor(private prisma: PrismaService) {}

  async create(data: SerialData) {
    return this.prisma.serial.create({
      data: {
        ...data,
        shareLink: this.generateShareLink(data.code),
      },
      include: {
        field: true,
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.serial.findUnique({
      where: { code },
      include: {
        field: true,
        episodes: {
          orderBy: { episodeNumber: 'asc' },
        },
      },
    });
  }

  async findAll(fieldId?: number) {
    return this.prisma.serial.findMany({
      where: fieldId ? { fieldId } : undefined,
      include: {
        field: true,
        episodes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: number,
    data: Partial<Omit<SerialData, 'code' | 'fieldId'>>,
  ) {
    return this.prisma.serial.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    // This will cascade delete all episodes
    return this.prisma.serial.delete({
      where: { id },
    });
  }

  async incrementViews(code: string) {
    return this.prisma.serial.update({
      where: { code },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  }

  async incrementTotalEpisodes(id: number) {
    return this.prisma.serial.update({
      where: { id },
      data: {
        totalEpisodes: {
          increment: 1,
        },
      },
    });
  }

  async getTopSerials(limit: number = 10) {
    return this.prisma.serial.findMany({
      take: limit,
      orderBy: { views: 'desc' },
      include: {
        field: true,
        episodes: true,
      },
    });
  }

  async search(query: string) {
    return this.prisma.serial.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { code: { contains: query } },
          { genre: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        field: true,
        episodes: true,
      },
      take: 20,
    });
  }

  formatSerialCaption(serial: any): string {
    let caption = `#${serial.code} ${serial.title}\n\n`;

    if (serial.genre) caption += `🎭 Жанр: ${serial.genre}\n`;
    caption += `📺 Қисмлар: ${serial.totalEpisodes}\n`;
    caption += `📁 Field: ${serial.field.name}\n`;
    if (serial.description) caption += `\n${serial.description}`;

    return caption;
  }

  private generateShareLink(code: string): string {
    return `https://t.me/share/url?url=📺 Сериал: ${code}`;
  }

  async postToChannel(
    bot: Telegraf,
    channelId: string,
    serial: any,
    posterFileId: string,
  ) {
    const caption = this.formatSerialCaption(serial);

    return bot.telegram.sendPhoto(channelId, posterFileId, {
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📺 Қисмларни кўриш',
              callback_data: `view_serial_${serial.code}`,
            },
          ],
        ],
      },
    });
  }

  generateEpisodesKeyboard(episodes: any[], serialCode: string) {
    const buttons = [];
    const row = [];

    episodes.forEach((episode, index) => {
      row.push({
        text: `${episode.episodeNumber}`,
        callback_data: `episode_${serialCode}_${episode.episodeNumber}`,
      });

      // 5 episodes per row
      if ((index + 1) % 5 === 0 || index === episodes.length - 1) {
        buttons.push([...row]);
        row.length = 0;
      }
    });

    return {
      inline_keyboard: buttons,
    };
  }
}
