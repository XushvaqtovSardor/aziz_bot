import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MovieData } from '../interfaces/content-data.interface';
import { Telegraf } from 'telegraf';

@Injectable()
export class MovieService {
  constructor(private prisma: PrismaService) {}

  async create(data: MovieData) {
    const { thumbnailFileId, ...movieData } = data;
    return this.prisma.movie.create({
      data: {
        ...movieData,
        posterFileId: data.posterFileId || data.thumbnailFileId || '',
        videoMessageId: data.videoMessageId || '',
        shareLink: this.generateShareLink(data.code),
      },
      include: {
        field: true,
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.movie.findUnique({
      where: { code },
      include: {
        field: true,
      },
    });
  }

  async findAll(fieldId?: number) {
    return this.prisma.movie.findMany({
      where: fieldId ? { fieldId } : undefined,
      include: {
        field: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: number, data: Partial<Omit<MovieData, 'code' | 'fieldId'>>) {
    return this.prisma.movie.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.movie.delete({
      where: { id },
    });
  }

  async incrementViews(code: string) {
    return this.prisma.movie.update({
      where: { code },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  }

  async getTopMovies(limit: number = 10) {
    return this.prisma.movie.findMany({
      take: limit,
      orderBy: { views: 'desc' },
      include: {
        field: true,
      },
    });
  }

  async search(query: string) {
    return this.prisma.movie.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { code: { contains: query } },
          { genre: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        field: true,
      },
      take: 20,
    });
  }

  formatMovieCaption(movie: any): string {
    let caption = `#${movie.code} ${movie.title}\n\n`;

    if (movie.genre) caption += `🎭 Жанр: ${movie.genre}\n`;
    if (movie.language) caption += `🗣 Тил: ${movie.language}\n`;
    if (movie.quality) caption += `📹 Сифат: ${movie.quality}\n`;
    if (movie.year) caption += `📅 Йил: ${movie.year}\n`;
    caption += `📁 Field: ${movie.field.name}\n`;
    if (movie.description) caption += `\n${movie.description}`;

    return caption;
  }

  private generateShareLink(code: string): string {
    return `https://t.me/share/url?url=🎬 Кино: ${code}`;
  }

  async postToChannel(
    bot: Telegraf,
    channelId: string,
    movie: any,
    posterFileId: string,
  ) {
    const caption = this.formatMovieCaption(movie);

    return bot.telegram.sendPhoto(channelId, posterFileId, {
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '▶️ Томоша қилиш',
              callback_data: `watch_movie_${movie.code}`,
            },
          ],
        ],
      },
    });
  }
}
