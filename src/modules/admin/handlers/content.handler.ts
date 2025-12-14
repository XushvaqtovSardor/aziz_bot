import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx, On, Message } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { MovieService } from '../../content/services/movie.service';
import { SerialService } from '../../content/services/serial.service';
import { FieldService } from '../../field/services/field.service';
import { SessionService } from '../services/session.service';
import { AdminState, MovieCreationData } from '../types/session.interface';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';

@Update()
@Injectable()
export class ContentHandler {
  private readonly logger = new Logger(ContentHandler.name);

  constructor(
    private adminService: AdminService,
    private movieService: MovieService,
    private serialService: SerialService,
    private fieldService: FieldService,
    private sessionService: SessionService,
  ) {}

  private async getAdminFromContext(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  @Hears('🎬 Kino yuklash')
  async startMovieCreation(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin || !ctx.from) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.sessionService.createSession(ctx.from.id, AdminState.CREATING_MOVIE);

    await ctx.reply(
      '🎬 Kino yuklash boshlandi!\n\n' +
        '1️⃣ Kino nomini kiriting:\n' +
        'Masalan: Avatar 2',
      Markup.keyboard([[{ text: '❌ Bekor qilish' }]]).resize(),
    );
  }

  @On('text')
  async handleMovieCreationText(
    @Ctx() ctx: Context,
    @Message('text') text: string,
  ) {
    if (!ctx.from) return;

    const session = this.sessionService.getSession(ctx.from.id);
    if (!session || session.state !== AdminState.CREATING_MOVIE) return;

    // Handle cancel
    if (text === '❌ Bekor qilish') {
      this.sessionService.clearSession(ctx.from.id);
      const admin = await this.getAdminFromContext(ctx);
      if (admin) {
        await ctx.reply(
          '❌ Bekor qilindi.',
          AdminKeyboard.getAdminMainMenu(admin.role),
        );
      }
      return;
    }

    const data = session.data as MovieCreationData;

    switch (session.step) {
      case 0:
        // Step 1: Title
        this.sessionService.updateSessionData(ctx.from.id, { title: text });
        this.sessionService.nextStep(ctx.from.id);

        await ctx.reply(
          '2️⃣ Yilini kiriting:\n' + 'Masalan: 2024',
          Markup.keyboard([
            [{ text: "⏭️ O'tkazish" }],
            [{ text: '❌ Bekor qilish' }],
          ]).resize(),
        );
        break;

      case 1:
        // Step 2: Year
        if (text !== "⏭️ O'tkazish") {
          const year = parseInt(text);
          if (!isNaN(year) && year > 1900 && year <= 2030) {
            this.sessionService.updateSessionData(ctx.from.id, { year });
          } else {
            await ctx.reply("❌ Noto'g'ri yil. Iltimos qaytadan kiriting:");
            return;
          }
        }
        this.sessionService.nextStep(ctx.from.id);

        await ctx.reply(
          '3️⃣ Janrini kiriting:\n' + 'Masalan: Action, Adventure, Sci-Fi',
          Markup.keyboard([
            [{ text: "⏭️ O'tkazish" }],
            [{ text: '❌ Bekor qilish' }],
          ]).resize(),
        );
        break;

      case 2:
        // Step 3: Genre
        if (text !== "⏭️ O'tkazish") {
          this.sessionService.updateSessionData(ctx.from.id, { genre: text });
        }
        this.sessionService.nextStep(ctx.from.id);

        await ctx.reply(
          '4️⃣ IMDb reytingini kiriting:\n' + 'Masalan: 8.5',
          Markup.keyboard([
            [{ text: "⏭️ O'tkazish" }],
            [{ text: '❌ Bekor qilish' }],
          ]).resize(),
        );
        break;

      case 3:
        // Step 4: IMDb rating
        if (text !== "⏭️ O'tkazish") {
          const imdb = parseFloat(text);
          if (!isNaN(imdb) && imdb >= 0 && imdb <= 10) {
            this.sessionService.updateSessionData(ctx.from.id, { imdb });
          } else {
            await ctx.reply(
              "❌ Noto'g'ri reyting (0-10). Iltimos qaytadan kiriting:",
            );
            return;
          }
        }
        this.sessionService.nextStep(ctx.from.id);

        await ctx.reply(
          '5️⃣ Tavsifini kiriting:\n' + "Kino haqida qisqacha ma'lumot",
          Markup.keyboard([
            [{ text: "⏭️ O'tkazish" }],
            [{ text: '❌ Bekor qilish' }],
          ]).resize(),
        );
        break;

      case 4:
        // Step 5: Description
        if (text !== "⏭️ O'tkazish") {
          this.sessionService.updateSessionData(ctx.from.id, {
            description: text,
          });
        }
        this.sessionService.nextStep(ctx.from.id);

        // Show available fields
        const fields = await this.fieldService.findAll();
        if (fields.length === 0) {
          await ctx.reply(
            '❌ Hech qanday field mavjud emas. Avval field yarating!',
          );
          this.sessionService.clearSession(ctx.from.id);
          return;
        }

        let fieldsMessage = '6️⃣ Field tanlang:\n\n';
        fields.forEach((field, index) => {
          fieldsMessage += `${index + 1}. ${field.name} (ID: ${field.id})\n`;
        });
        fieldsMessage += '\nField ID raqamini kiriting:';

        await ctx.reply(
          fieldsMessage,
          Markup.keyboard([[{ text: '❌ Bekor qilish' }]]).resize(),
        );
        break;

      case 5:
        // Step 6: Field ID
        const fieldId = parseInt(text);
        if (isNaN(fieldId)) {
          await ctx.reply("❌ Noto'g'ri ID. Iltimos raqam kiriting:");
          return;
        }

        const field = await this.fieldService.findOne(fieldId);
        if (!field) {
          await ctx.reply(
            "❌ Bunday field topilmadi. Iltimos to'g'ri ID kiriting:",
          );
          return;
        }

        this.sessionService.updateSessionData(ctx.from.id, { fieldId });
        this.sessionService.nextStep(ctx.from.id);

        await ctx.reply(
          '7️⃣ Kino rasmini yuboring:\n' + '(Rasm yoki photo)',
          Markup.keyboard([
            [{ text: "⏭️ O'tkazish" }],
            [{ text: '❌ Bekor qilish' }],
          ]).resize(),
        );
        break;

      default:
        break;
    }
  }

  @On('photo')
  async handleMovieThumbnail(@Ctx() ctx: Context) {
    if (!ctx.from) return;

    const session = this.sessionService.getSession(ctx.from.id);
    if (!session || session.state !== AdminState.CREATING_MOVIE) return;

    if (session.step === 6) {
      // Step 7: Thumbnail
      const photo = (ctx.message as any).photo;
      const fileId = photo[photo.length - 1].file_id;

      this.sessionService.updateSessionData(ctx.from.id, {
        thumbnailFileId: fileId,
      });
      this.sessionService.nextStep(ctx.from.id);

      await ctx.reply(
        '8️⃣ Kino videosini yuboring:\n' + '(Video fayl)',
        Markup.keyboard([[{ text: '❌ Bekor qilish' }]]).resize(),
      );
    }
  }

  @On('video')
  async handleMovieVideo(@Ctx() ctx: Context) {
    if (!ctx.from) return;

    const session = this.sessionService.getSession(ctx.from.id);
    if (!session || session.state !== AdminState.CREATING_MOVIE) return;

    if (session.step === 7) {
      // Step 8: Video
      const video = (ctx.message as any).video;
      const fileId = video.file_id;

      this.sessionService.updateSessionData(ctx.from.id, {
        videoFileId: fileId,
      });

      const data = this.sessionService.getSession(ctx.from.id)
        ?.data as MovieCreationData;

      try {
        // Generate unique code
        const code = `MOVIE_${Date.now()}`;

        const movie = await this.movieService.create({
          code,
          title: data.title!,
          year: data.year,
          genre: data.genre,
          imdb: data.imdb,
          description: data.description,
          fieldId: data.fieldId!,
          posterFileId: data.thumbnailFileId,
          thumbnailFileId: data.thumbnailFileId,
          videoFileId: fileId,
          videoMessageId: '', // Will be set later when posting to channel
          duration: video.duration,
        });

        this.sessionService.clearSession(ctx.from.id);
        const admin = await this.getAdminFromContext(ctx);

        await ctx.reply(
          '✅ Kino muvaffaqiyatli yuklandi!\n\n' +
            `🎬 Nom: ${movie.title}\n` +
            `📅 Yil: ${movie.year || 'N/A'}\n` +
            `🎭 Janr: ${movie.genre || 'N/A'}\n` +
            `⭐ IMDb: ${movie.imdb || 'N/A'}\n` +
            `🆔 Kod: ${movie.code}`,
          admin ? AdminKeyboard.getAdminMainMenu(admin.role) : undefined,
        );
      } catch (error: any) {
        await ctx.reply(
          `❌ Xatolik: ${error.message}\n\n` +
            "Iltimos qaytadan urinib ko'ring.",
        );
        this.sessionService.clearSession(ctx.from.id);
      }
    }
  }
}
