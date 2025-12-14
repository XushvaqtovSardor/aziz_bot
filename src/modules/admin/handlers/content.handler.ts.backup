import { Injectable, Logger } from '@nestjs/common';
import { Update, Hears, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { AdminService } from '../services/admin.service';
import { MovieService } from '../../content/services/movie.service';
import { SerialService } from '../../content/services/serial.service';

@Update()
@Injectable()
export class ContentHandler {
  private readonly logger = new Logger(ContentHandler.name);

  constructor(
    private adminService: AdminService,
    private movieService: MovieService,
    private serialService: SerialService,
  ) {}

  private async getAdminFromContext(ctx: Context) {
    if (!ctx.from) return null;
    return this.adminService.getAdminByTelegramId(String(ctx.from.id));
  }

  @Hears('🎬 Kino yuklash')
  async uploadMovie(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.logger.log(`Admin ${admin.telegramId} opened movie upload`);

    const message = `
🎬 *Kino yuklash*

Kino yuklash uchun quyidagi formatda ma'lumot yuboring:

/upload_movie
Kod: MOVIE123
Nomi: Film nomi
Yili: 2024
Janr: Action, Drama
IMDb: 8.5
Tavsif: Film haqida qisqacha
Field ID: 1
File ID: AgADBAADr6cxG...

📝 Eslatma: Avval kino faylini botga yuborib, uning file_id'sini oling.
    `.trim();

    await ctx.reply(message);
  }

  @Hears('📺 Serial yuklash')
  async uploadSerial(@Ctx() ctx: Context) {
    const admin = await this.getAdminFromContext(ctx);
    if (!admin) {
      await ctx.reply("❌ Sizda admin huquqi yo'q.");
      return;
    }

    this.logger.log(`Admin ${admin.telegramId} opened serial upload`);

    const message = `
📺 *Serial yuklash*

Serial yuklash uchun quyidagi formatda ma'lumot yuboring:

/upload_serial
Kod: SERIAL123
Nomi: Serial nomi
Yili: 2024
Janr: Drama, Crime
IMDb: 9.0
Tavsif: Serial haqida qisqacha
Mavsum: 1
Qismlar soni: 10
Field ID: 1

Keyin har bir qism uchun:

/upload_episode
Serial kod: SERIAL123
Qism: 1
File ID: AgADBAADr6cxG...

📝 Eslatma: Avval serial qismlarini botga yuborib, ularning file_id'larini oling.
    `.trim();

    await ctx.reply(message);
  }
}
