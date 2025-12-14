import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { Action, Update, Ctx, Hears } from 'nestjs-telegraf';
import { UserService } from '../services/user.service';
import { LanguageService } from '../../language/language.service';
import { MovieService } from '../../content/services/movie.service';
import { SerialService } from '../../content/services/serial.service';
import { WatchHistoryService } from '../../content/services/watch-history.service';
import { MainMenuKeyboard } from '../keyboards/main-menu.keyboard';
import { Markup } from 'telegraf';

@Update()
@Injectable()
export class SearchHandler {
  private readonly logger = new Logger(SearchHandler.name);

  constructor(
    private userService: UserService,
    private languageService: LanguageService,
    private movieService: MovieService,
    private serialService: SerialService,
    private watchHistoryService: WatchHistoryService,
  ) {}

  @Hears(['🔍 Kino qidirish', '🔍 Поиск фильма', '🔍 Search Movie'])
  async handleSearch(@Ctx() ctx: Context) {
    this.logger.log(`User ${ctx.from?.id} opened search`);
    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);

    await ctx.reply(texts.searchByCode, MainMenuKeyboard.getBackButton(texts));
  }

  @Hears(/^[A-Za-z0-9]+$/)
  async handleMovieCode(@Ctx() ctx: Context) {
    if (!('text' in ctx.message)) return;
    const code = ctx.message.text;
    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);

    // Search for movie
    const movie = await this.movieService.findByCode(code);

    if (movie) {
      await this.sendMovieInfo(ctx, movie, user, texts);
      return;
    }

    // Search for serial
    const serial = await this.serialService.findByCode(code);

    if (serial) {
      await this.sendSerialInfo(ctx, serial, user, texts);
      return;
    }

    // Not found
    await ctx.reply(
      texts.movieNotFound,
      MainMenuKeyboard.getMainMenu(texts, user.isPremium),
    );
  }

  private async sendMovieInfo(ctx: Context, movie: any, user: any, texts: any) {
    const caption = this.movieService.formatMovieCaption(movie);

    await ctx.replyWithPhoto(movie.posterFileId, {
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: texts.watchMovie,
              callback_data: `watch_movie_${movie.code}`,
            },
          ],
          [
            {
              text: texts.shareButton,
              switch_inline_query: movie.code,
            },
          ],
        ],
      },
    });
  }

  private async sendSerialInfo(
    ctx: Context,
    serial: any,
    user: any,
    texts: any,
  ) {
    const caption = this.serialService.formatSerialCaption(serial);

    await ctx.replyWithPhoto(serial.posterFileId, {
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: texts.viewEpisodes,
              callback_data: `view_serial_${serial.code}`,
            },
          ],
          [
            {
              text: texts.shareButton,
              switch_inline_query: serial.code,
            },
          ],
        ],
      },
    });
  }

  @Action(/^watch_movie_(.+)$/)
  async handleWatchMovie(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    const code = callbackQuery.data.replace('watch_movie_', '');
    this.logger.log(`User ${ctx.from?.id} watching movie: ${code}`);
    await ctx.answerCbQuery();

    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);
    const movie = await this.movieService.findByCode(code);

    if (!movie) {
      await ctx.answerCbQuery(texts.movieNotFound);
      return;
    }

    // Check if user is premium or show ads
    if (!user.isPremium) {
      await ctx.reply(texts.adMessage);
      // Here you can add ad display logic
    }

    // Get the video from field's database channel
    const field = movie.field;
    // Field with databaseChannel relation needs to be loaded separately
    const databaseChannel = field.databaseChannelId
      ? { channelId: field.channelId }
      : null;

    if (!databaseChannel) {
      await ctx.answerCbQuery(texts.videoNotAvailable);
      return;
    }

    // Forward video from database channel
    await ctx.telegram.copyMessage(
      ctx.chat!.id,
      databaseChannel.channelId,
      Number(movie.videoMessageId),
    );

    // Record watch history
    await this.watchHistoryService.recordMovieWatch(user.id, movie.id);
    await this.movieService.incrementViews(code);

    await ctx.answerCbQuery();
  }

  @Action(/^view_serial_(.+)$/)
  async handleViewSerial(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    const code = callbackQuery.data.replace('view_serial_', '');
    this.logger.log(`User ${ctx.from?.id} viewing serial: ${code}`);
    await ctx.answerCbQuery();

    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);
    const serial = await this.serialService.findByCode(code);

    if (!serial || !serial.episodes.length) {
      await ctx.answerCbQuery(texts.serialNotFound);
      return;
    }

    const keyboard = this.serialService.generateEpisodesKeyboard(
      serial.episodes,
      serial.code,
    );

    await ctx.editMessageReplyMarkup(keyboard);
    await ctx.answerCbQuery();
  }

  @Action(/^episode_(.+)_(\d+)$/)
  async handleWatchEpisode(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || !('data' in callbackQuery)) return;

    const match = callbackQuery.data.match(/^episode_(.+)_(\d+)$/);
    if (!match) return;

    const serialCode = match[1];
    const episodeNumber = parseInt(match[2]);
    this.logger.log(
      `User ${ctx.from?.id} watching episode ${episodeNumber} of ${serialCode}`,
    );
    await ctx.answerCbQuery();

    const user = await this.getUserFromContext(ctx);
    if (!user) return;

    const texts = await this.languageService.getTexts(user.language);
    const serial = await this.serialService.findByCode(serialCode);

    if (!serial) {
      await ctx.answerCbQuery(texts.serialNotFound);
      return;
    }

    const episode = serial.episodes.find(
      (ep) => ep.episodeNumber === episodeNumber,
    );

    if (!episode) {
      await ctx.answerCbQuery(texts.episodeNotFound);
      return;
    }

    // Check if user is premium or show ads
    if (!user.isPremium) {
      await ctx.reply(texts.adMessage);
    }

    // Get the video from field's database channel or custom channel
    const channelId = serial.hasCustomChannel
      ? serial.customChannelId!
      : serial.field.databaseChannelId
        ? String(serial.field.databaseChannelId)
        : null;

    if (!channelId) {
      await ctx.answerCbQuery(texts.videoNotAvailable);
      return;
    }

    // Forward video from database channel
    await ctx.telegram.copyMessage(
      ctx.chat!.id,
      channelId,
      Number(episode.videoMessageId),
    );

    // Record watch history
    await this.watchHistoryService.recordSerialWatch(
      user.id,
      serial.id,
      episode.id,
    );
    await this.serialService.incrementViews(serialCode);

    await ctx.answerCbQuery();
  }

  private async getUserFromContext(ctx: Context) {
    const telegramUser = ctx.from;
    if (!telegramUser) return null;

    const user = await this.userService.findByTelegramId(
      String(telegramUser.id),
    );
    if (!user || user.isBlocked) return null;

    await this.userService.updateLastActivity(String(user.telegramId));
    return user;
  }
}
