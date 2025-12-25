import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx, On, Message, Action } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { MovieService } from '../../content/services/movie.service';
import { FieldService } from '../../field/services/field.service';
import { ChannelService } from '../../channel/services/channel.service';
import { SessionService } from '../services/session.service';
import { AdminKeyboard } from '../keyboards/admin-menu.keyboard';
import {
  AdminState,
  MovieCreateStep,
  MovieCreationData,
} from '../types/session.interface';

/**
 * Admin Content Handler - Kino va Field boshqaruvi
 * Bu handler faqat kino yuklash, field boshqarish va video biriktirish uchun mas'ul
 */
@Update()
@Injectable()
export class AdminContentHandler {
  private readonly logger = new Logger(AdminContentHandler.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly movieService: MovieService,
    private readonly fieldService: FieldService,
    private readonly channelService: ChannelService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Admin tekshirish - yordamchi metod
   */
  private async getAdmin(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  // ==================== FIELD BOSHQARUVI ====================

  @Hears('📁 Fieldlar')
  async openFieldsMenu(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    await ctx.reply(
      '📁 Fieldlar bolimi',
      AdminKeyboard.getFieldManagementMenu(),
    );
  }

  @Hears("➕ Field qo'shish")
  async startAddingField(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin || !ctx.from) return;

    this.sessionService.createSession(ctx.from.id, AdminState.ADDING_FIELD);
    await ctx.reply(
      '📝 Field nomini kiriting:\nMasalan: Yangi kinolar',
      AdminKeyboard.getCancelButton(),
    );
  }

  @Hears("📋 Fieldlar ro'yxati")
  async showFieldsList(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const fields = await this.fieldService.findAll();
    if (fields.length === 0) {
      await ctx.reply('📂 Hech qanday field topilmadi.');
      return;
    }

    let message = '📋 Mavjud fieldlar:\n\n';
    fields.forEach((field, index) => {
      message += `${index + 1}. ${field.name}\n`;
    });
    message += "\n👇 Batafsil ma'lumot olish uchun raqamni bosing:";

    const buttons = [];
    const row = [];
    fields.forEach((field, index) => {
      row.push(
        Markup.button.callback(String(index + 1), `field_detail_${field.id}`),
      );
      if (row.length === 5) {
        buttons.push([...row]);
        row.length = 0;
      }
    });
    if (row.length > 0) buttons.push(row);

    await ctx.reply(message, Markup.inlineKeyboard(buttons));
  }

  @Action(/^field_detail_(\d+)$/)
  async showFieldDetail(@Ctx() ctx: any) {
    const fieldId = parseInt(ctx.match[1]);
    const field = await this.fieldService.findOne(fieldId);

    if (!field) {
      await ctx.answerCbQuery('❌ Field topilmadi');
      return;
    }

    const message = `
📁 **Field Ma'lumotlari**
🏷 Nomi: ${field.name}
🆔 ID: ${field.id}
📢 Kanal ID: ${field.channelId}
🔗 Kanal linki: ${field.channelLink || "Yo'q"}
📅 Yaratilgan: ${field.createdAt.toLocaleDateString('uz-UZ')}
✅ Faol: ${field.isActive ? 'Ha' : "Yo'q"}
    `.trim();

    const buttons = [
      [Markup.button.callback("🗑 O'chirish", `delete_field_${field.id}`)],
      [Markup.button.callback('🔙 Orqaga', 'back_to_fields')],
    ];

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
    await ctx.answerCbQuery();
  }

  @Action('back_to_fields')
  async backToFieldsList(@Ctx() ctx: Context) {
    await this.showFieldsList(ctx);
  }

  @Action(/^delete_field_(\d+)$/)
  async deleteField(@Ctx() ctx: Context) {
    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const match = (ctx.callbackQuery as any).data.match(/^delete_field_(\d+)$/);
    const fieldId = parseInt(match[1]);

    await this.fieldService.delete(fieldId);
    await ctx.answerCbQuery('✅ Field ochirildi');
    await ctx.editMessageText('✅ Field muvaffaqiyatli ochirildi');
  }

  // ==================== KINO YUKLASH ====================

  @Hears('🎬 Kino yuklash')
  async startMovieCreation(@Ctx() ctx: Context) {
    this.logger.log(`Admin ${ctx.from?.id} starting movie creation`);
    const admin = await this.getAdmin(ctx);
    if (!admin || !ctx.from) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.sessionService.createSession(ctx.from.id, AdminState.CREATING_MOVIE);
    await ctx.reply(
      '🎬 Kino yuklash boshlandi!\n\n' +
        '1️⃣ Kino kodini kiriting:\n' +
        "⚠️ Kod FAQAT raqamlardan iborat bo'lishi kerak!\n" +
        'Masalan: 12345',
      AdminKeyboard.getCancelButton(),
    );
  }

  // ==================== VIDEO BIRIKTIRISH ====================

  @Hears('📹 Kinoga video biriktirish')
  async startVideoAttachment(@Ctx() ctx: Context) {
    this.logger.log(`Admin ${ctx.from?.id} starting video attachment`);
    const admin = await this.getAdmin(ctx);
    if (!admin || !ctx.from) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.sessionService.createSession(ctx.from.id, AdminState.ATTACHING_VIDEO);
    await ctx.reply(
      '📹 Kinoga video biriktirish boshlandi!\n\n' + '🔢 Kino kodini kiriting:',
      AdminKeyboard.getCancelButton(),
    );
  }

  // ==================== TEXT HANDLER ====================

  @On('text')
  async handleMovieText(@Ctx() ctx: Context, @Message('text') text: string) {
    if (!ctx.from) return;

    // Photo message'larni o'tkazib yuborish
    if ('photo' in ctx.message!) {
      return;
    }

    const session = this.sessionService.getSession(ctx.from.id);
    if (!session) return;

    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    // Bekor qilish
    if (text === '❌ Bekor qilish') {
      this.sessionService.clearSession(ctx.from.id);
      return ctx.reply(
        '❌ Bekor qilindi.',
        AdminKeyboard.getAdminMainMenu(admin.role),
      );
    }

    const currentState = String(session.state);

    // Faqat content bilan bog'liq state'larni handle qilish
    switch (currentState) {
      case String(AdminState.CREATING_MOVIE):
        await this.handleMovieCreation(ctx, text, session);
        break;
      case String(AdminState.ATTACHING_VIDEO):
        await this.handleVideoAttachment(ctx, text, session);
        break;
      case String(AdminState.ADDING_FIELD):
        await this.handleFieldCreation(ctx, text, session);
        break;
    }
  }

  // ==================== PHOTO HANDLER ====================

  @On('photo')
  async handlePhoto(@Ctx() ctx: Context) {
    this.logger.log('[PHOTO] Photo received');

    if (!ctx.from || !ctx.message || !('photo' in ctx.message)) {
      return;
    }

    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    const session = this.sessionService.getSession(ctx.from.id);

    // Agar session yo'q bo'lsa, yangi kino yaratishni boshlash
    if (!session) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];

      this.sessionService.createSession(ctx.from.id, AdminState.CREATING_MOVIE);
      this.sessionService.updateSessionData(ctx.from.id, {
        posterFileId: photo.file_id,
        posterMessageId: String(ctx.message.message_id),
      });
      this.sessionService.setStep(ctx.from.id, MovieCreateStep.CODE);

      await ctx.reply(
        '🎬 Kino yuklash boshlandi!\n\n' +
          '1️⃣ Kino kodini kiriting:\n' +
          "⚠️ Kod FAQAT raqamlardan iborat bo'lishi kerak!\n" +
          'Masalan: 12345',
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    const currentState = String(session.state);
    const currentStep = Number(session.step);

    // Faqat kino yaratishda rasm qabul qilish
    if (
      currentState === String(AdminState.CREATING_MOVIE) &&
      currentStep === MovieCreateStep.PHOTO
    ) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];

      this.sessionService.updateSessionData(ctx.from.id, {
        posterFileId: photo.file_id,
        posterMessageId: String(ctx.message.message_id),
      });

      // Field tanlash
      const allFields = await this.fieldService.findAll();
      if (!allFields || allFields.length === 0) {
        await ctx.reply('❌ Avval field yarating.');
        return;
      }

      let message = '📁 Qaysi fieldga joylashtirasiz?\n\n';
      allFields.forEach((field, index) => {
        message += `${index + 1}. ${field.name}\n`;
      });
      message += '\nRaqamini kiriting (masalan: 1)';

      this.sessionService.updateSessionData(ctx.from.id, {
        fields: allFields,
        waitingForField: true,
      });
      this.sessionService.setStep(ctx.from.id, 5);

      await ctx.reply(message, AdminKeyboard.getCancelButton());
    }
  }

  // ==================== VIDEO HANDLER ====================

  @On('video')
  async handleMovieVideo(@Ctx() ctx: Context) {
    if (!ctx.from || !('video' in ctx.message)) return;

    const admin = await this.getAdmin(ctx);
    if (!admin) return;

    let session = this.sessionService.getSession(ctx.from.id);

    // Agar session yo'q bo'lsa, yangi video biriktirish sessiyasini boshlash
    if (!session) {
      this.sessionService.createSession(
        ctx.from.id,
        AdminState.ATTACHING_VIDEO,
      );
      this.sessionService.updateSessionData(ctx.from.id, {
        pendingVideo: ctx.message.video,
      });

      await ctx.reply(
        '📹 Video qabul qilindi!\n\n' + '🔢 Kino kodini kiriting:',
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    if (session.state !== AdminState.ATTACHING_VIDEO) {
      return;
    }

    const video = ctx.message.video;
    const data = session.data;

    if (!data.movieCode) {
      this.sessionService.updateSessionData(ctx.from.id, {
        pendingVideo: video,
      });
      await ctx.reply(
        '🔢 Kino kodini kiriting:',
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    await this.uploadVideoToDatabaseChannel(ctx, video, data);
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Kino yaratish jarayonini boshqarish
   */
  private async handleMovieCreation(ctx: Context, text: string, session: any) {
    const currentStep = Number(session.step);

    switch (currentStep) {
      case MovieCreateStep.CODE:
        await this.processMovieCode(ctx, text);
        break;

      case MovieCreateStep.TITLE:
        this.sessionService.updateSessionData(ctx.from!.id, { title: text });
        this.sessionService.setStep(ctx.from!.id, MovieCreateStep.GENRE);
        await ctx.reply(
          '3️⃣ Janr kiriting (Action, Drama...):',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case MovieCreateStep.GENRE:
        this.sessionService.updateSessionData(ctx.from!.id, { genre: text });
        this.sessionService.setStep(ctx.from!.id, MovieCreateStep.DESCRIPTION);
        await ctx.reply(
          "4️⃣ Tavsif kiriting:\n\n⏭ O'tkazib yuborish uchun 'Next' deb yozing",
          Markup.keyboard([['Next'], ['❌ Bekor qilish']]).resize(),
        );
        break;

      case MovieCreateStep.DESCRIPTION:
        const description = text.toLowerCase() === 'next' ? null : text;
        this.sessionService.updateSessionData(ctx.from!.id, { description });
        this.sessionService.setStep(ctx.from!.id, MovieCreateStep.PHOTO);
        await ctx.reply(
          '5️⃣ Endi kino rasmini (Poster) yuboring:',
          Markup.removeKeyboard(),
        );
        break;

      case 5: // Field selection
        await this.processFieldSelection(ctx, text, session);
        break;
    }
  }

  /**
   * Kino kodini tekshirish va saqlash
   */
  private async processMovieCode(ctx: Context, text: string) {
    const code = parseInt(text);
    if (isNaN(code) || code <= 0) {
      await ctx.reply(
        "❌ Kod raqam bo'lishi kerak!",
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    const isAvailable = await this.movieService.isCodeAvailable(code);
    if (!isAvailable) {
      const nearest = await this.movieService.findNearestAvailableCodes(
        code,
        5,
      );
      await ctx.reply(`❌ Kod band. Bo'sh kodlar: ${nearest.join(', ')}`);
      return;
    }

    this.sessionService.updateSessionData(ctx.from!.id, { code });
    this.sessionService.setStep(ctx.from!.id, MovieCreateStep.TITLE);
    await ctx.reply(
      '2️⃣ Kino nomini kiriting:',
      AdminKeyboard.getCancelButton(),
    );
  }

  /**
   * Field tanlash va kinoni saqlash
   */
  private async processFieldSelection(
    ctx: Context,
    text: string,
    session: any,
  ) {
    const data = session.data;
    if (!data.waitingForField || !data.fields) return;

    const fieldIndex = parseInt(text) - 1;
    if (
      isNaN(fieldIndex) ||
      fieldIndex < 0 ||
      fieldIndex >= data.fields.length
    ) {
      await ctx.reply("❌ Noto'g'ri raqam. Iltimos qaytadan kiriting:");
      return;
    }

    const selectedField = data.fields[fieldIndex];

    try {
      // Database kanalga rasmni yuborish
      const dbChannels = await this.channelService.findAllDatabase();
      if (!dbChannels || dbChannels.length === 0) {
        await ctx.reply('❌ Database kanal mavjud emas.');
        return;
      }

      const dbChannel = dbChannels[0];
      const sentPhoto = await ctx.telegram.sendPhoto(
        dbChannel.channelId,
        data.posterFileId,
        { caption: `🎬 ${data.title}\n🆔 Kod: ${data.code}` },
      );

      // Kinoni bazaga saqlash
      await this.movieService.create({
        code: String(data.code),
        title: data.title,
        genre: data.genre,
        description: data.description || '',
        posterFileId: data.posterFileId,
        posterMessageId: String(sentPhoto.message_id),
        fieldId: selectedField.id,
        partsCount: 0,
      } as any);

      this.sessionService.clearSession(ctx.from!.id);
      const admin = await this.getAdmin(ctx);

      await ctx.reply(
        `✅ Kino muvaffaqiyatli saqlandi!\n\n` +
          `📁 Field: ${selectedField.name}\n` +
          `🎬 Kino: ${data.title}\n` +
          `🆔 Kod: ${data.code}\n\n` +
          'Endi videolarni yuklash uchun kinoning kodini bilgan holda video yuboring.',
        AdminKeyboard.getAdminMainMenu(admin!.role),
      );
    } catch (error) {
      this.logger.error(`Kinoni saqlashda xatolik: ${error.message}`);
      await ctx.reply(`❌ Xatolik: ${error.message}`);
    }
  }

  /**
   * Video biriktirish jarayonini boshqarish
   */
  private async handleVideoAttachment(
    ctx: Context,
    text: string,
    session: any,
  ) {
    const data = session.data;

    if (text === '➡️ Davom etish') {
      const newPartNumber = (data.partNumber || 1) + 1;
      this.sessionService.updateSessionData(ctx.from!.id, {
        partNumber: newPartNumber,
      });
      await ctx.reply(
        `${newPartNumber}-qism videosini yuboring:`,
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    if (text === '✅ Tugatish') {
      await this.finalizeMovieUpload(ctx, session);
      return;
    }

    if (data.waitingForField && data.fields) {
      await this.publishMovieToField(ctx, text, session);
      return;
    }

    // Kino kodini qabul qilish
    if (!data.movieCode) {
      await this.processMovieCodeForVideo(ctx, text, session);
    }
  }

  /**
   * Video uchun kino kodini tekshirish
   */
  private async processMovieCodeForVideo(
    ctx: Context,
    text: string,
    session: any,
  ) {
    const code = parseInt(text);
    if (isNaN(code) || code <= 0) {
      await ctx.reply(
        "❌ Kod faqat raqamlardan iborat bo'lishi kerak!\nMasalan: 12345",
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    const movie = await this.movieService.findByCode(String(code));
    if (!movie) {
      await ctx.reply(
        `❌ ${code} kodli kino topilmadi!\n\nIltimos, to'g'ri kod kiriting:`,
        AdminKeyboard.getCancelButton(),
      );
      return;
    }

    this.sessionService.updateSessionData(ctx.from!.id, {
      movieCode: String(code),
      movieId: movie.id,
      movieData: movie,
      partNumber: 1,
      videoFileIds: [],
      videoMessageIds: [],
    });

    const data = session.data;

    // Pending video mavjud bo'lsa, uni yuklash
    if (data.pendingVideo) {
      await this.uploadVideoToDatabaseChannel(ctx, data.pendingVideo, {
        ...data,
        movieCode: String(code),
      });
      this.sessionService.updateSessionData(ctx.from!.id, {
        pendingVideo: null,
      });
    } else {
      await ctx.reply(
        `✅ ${movie.title} topildi!\n\n1-qism videosini yuboring:`,
        AdminKeyboard.getCancelButton(),
      );
    }
  }

  /**
   * Videoni database kanalga yuklash
   */
  private async uploadVideoToDatabaseChannel(
    ctx: Context,
    video: any,
    data: any,
  ) {
    try {
      const dbChannels = await this.channelService.findAllDatabase();
      if (dbChannels.length === 0) {
        await ctx.reply('❌ Database kanal mavjud emas.');
        return;
      }

      await ctx.reply('⏳ Video yuklanmoqda...');

      const dbChannel = dbChannels[0];
      const sentVideo = await ctx.telegram.sendVideo(
        dbChannel.channelId,
        video.file_id,
        {
          caption: `🎬 Kod: ${data.movieCode} - ${data.partNumber || 1}-qism`,
        },
      );

      const videoFileIds = data.videoFileIds || [];
      const videoMessageIds = data.videoMessageIds || [];
      videoFileIds.push(video.file_id);
      videoMessageIds.push(String(sentVideo.message_id));

      this.sessionService.updateSessionData(ctx.from!.id, {
        videoFileIds,
        videoMessageIds,
      });

      await ctx.reply(
        `✅ ${data.partNumber || 1}-qism yuklandi!\n\nDavom etasizmi?`,
        Markup.keyboard([
          ['➡️ Davom etish', '✅ Tugatish'],
          ['❌ Bekor qilish'],
        ]).resize(),
      );
    } catch (error) {
      this.logger.error(`Video yuklashda xatolik: ${error.message}`);
      await ctx.reply(
        `❌ Xatolik: ${error.message}\n\nBotni database kanalga admin qiling.`,
      );
    }
  }

  /**
   * Kino yuklashni yakunlash
   */
  private async finalizeMovieUpload(ctx: Context, session: any) {
    const data = session.data;

    try {
      // Barcha qismlarni bazaga qo'shish
      for (let i = 0; i < data.videoFileIds.length; i++) {
        await this.movieService.addMoviePart(
          data.movieId,
          i + 1,
          data.videoFileIds[i],
          data.videoMessageIds[i],
        );
      }

      await this.movieService.updatePartsCount(
        data.movieId,
        data.videoFileIds.length,
      );

      // Field tanlash
      const allFields = await this.fieldService.findAll();
      if (allFields.length === 0) {
        await ctx.reply('❌ Field topilmadi. Avval field yarating.');
        this.sessionService.clearSession(ctx.from!.id);
        return;
      }

      let message = '📁 Qaysi fieldga joylashtirasiz?\n\n';
      allFields.forEach((field, index) => {
        message += `${index + 1}. ${field.name}\n`;
      });
      message += '\nRaqamini kiriting (masalan: 1)';

      this.sessionService.updateSessionData(ctx.from!.id, {
        fields: allFields,
        waitingForField: true,
      });

      await ctx.reply(message, AdminKeyboard.getCancelButton());
    } catch (error) {
      this.logger.error(`Finalize error: ${error.message}`);
      await ctx.reply(`❌ Xatolik: ${error.message}`);
    }
  }

  /**
   * Kinoni fieldga nashr etish
   */
  private async publishMovieToField(ctx: Context, text: string, session: any) {
    const data = session.data;
    const fieldIndex = parseInt(text) - 1;

    if (
      isNaN(fieldIndex) ||
      fieldIndex < 0 ||
      fieldIndex >= data.fields.length
    ) {
      await ctx.reply("❌ Noto'g'ri raqam. Iltimos qaytadan kiriting:");
      return;
    }

    const selectedField = data.fields[fieldIndex];
    const movie = data.movieData;

    try {
      let caption = `🎬 **${movie.title}**\n`;
      if (movie.genre) caption += `🎭 Janr: ${movie.genre}\n`;
      if (movie.description) caption += `📝 ${movie.description}\n`;
      if (data.videoFileIds.length > 1) {
        caption += `📊 Qismlar soni: ${data.videoFileIds.length}\n`;
      }
      caption += `🆔 Kod: ${movie.code}`;

      const button = Markup.inlineKeyboard([
        [
          Markup.button.url(
            '🎬 Tomosha qilish',
            `https://t.me/${process.env.BOT_USERNAME}?start=movie_${movie.code}`,
          ),
        ],
      ]);

      const sentPoster = await ctx.telegram.sendPhoto(
        selectedField.channelId,
        movie.posterFileId,
        {
          caption,
          parse_mode: 'Markdown',
          ...button,
        },
      );

      await this.movieService.update(movie.id, {
        channelMessageId: sentPoster.message_id,
        fieldId: selectedField.id,
      } as any);

      this.sessionService.clearSession(ctx.from!.id);
      const admin = await this.getAdmin(ctx);

      await ctx.reply(
        `✅ Kino muvaffaqiyatli nashr etildi!\n\n` +
          `📦 Field: ${selectedField.name}\n` +
          `🎬 Nomi: ${movie.title}\n` +
          `📊 Qismlar: ${data.videoFileIds.length}\n` +
          `🔗 Message ID: ${sentPoster.message_id}`,
        AdminKeyboard.getAdminMainMenu(admin!.role),
      );
    } catch (error) {
      this.logger.error(`Publish error: ${error.message}`);
      await ctx.reply(
        `❌ Xatolik: ${error.message}\n\nBotni field kanalga admin qiling.`,
      );
    }
  }

  /**
   * Field yaratish jarayonini boshqarish
   */
  private async handleFieldCreation(ctx: Context, text: string, session: any) {
    switch (session.step) {
      case 0: // Field name
        this.sessionService.updateSessionData(ctx.from!.id, { name: text });
        this.sessionService.setStep(ctx.from!.id, 1);
        await ctx.reply(
          '📝 Kanal ID yoki username kiriting:\nMasalan: @channel_username yoki -1001234567890',
          AdminKeyboard.getCancelButton(),
        );
        break;

      case 1: // Channel ID
        this.sessionService.updateSessionData(ctx.from!.id, {
          channelId: text,
          channelLink: text.startsWith('@')
            ? `https://t.me/${text.slice(1)}`
            : undefined,
        });
        this.sessionService.setStep(ctx.from!.id, 2);

        const dbChannels = await this.channelService.findAllDatabase();
        if (dbChannels.length === 0) {
          await ctx.reply('❌ Avval database kanal yarating.');
          this.sessionService.clearSession(ctx.from!.id);
          return;
        }

        let message = '📦 Database kanalini tanlang:\n\n';
        dbChannels.forEach((channel, index) => {
          message += `${index + 1}. ${channel.channelName}\n`;
        });
        message += '\nRaqamini kiriting:';

        this.sessionService.updateSessionData(ctx.from!.id, { dbChannels });
        await ctx.reply(message, AdminKeyboard.getCancelButton());
        break;

      case 2: // Database Channel selection
        const dbChannelIndex = parseInt(text) - 1;
        const availableChannels = session.data.dbChannels;

        if (
          isNaN(dbChannelIndex) ||
          dbChannelIndex < 0 ||
          dbChannelIndex >= availableChannels.length
        ) {
          await ctx.reply("❌ Noto'g'ri raqam. Qaytadan kiriting:");
          return;
        }

        const selectedDbChannel = availableChannels[dbChannelIndex];

        try {
          await this.fieldService.create({
            name: session.data.name,
            channelId: session.data.channelId,
            channelLink: session.data.channelLink,
            databaseChannelId: selectedDbChannel.id,
          });

          this.sessionService.clearSession(ctx.from!.id);
          const admin = await this.getAdmin(ctx);

          await ctx.reply(
            "✅ Field muvaffaqiyatli qo'shildi!",
            AdminKeyboard.getAdminMainMenu(admin!.role),
          );
        } catch (error) {
          await ctx.reply(`❌ Xatolik: ${error.message}`);
        }
        break;
    }
  }
}
