import { Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { TelegrafArgumentsHost } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Catch()
export class TelegrafExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TelegrafExceptionFilter.name);

  async catch(exception: Error, host: TelegrafArgumentsHost) {
    const ctx = host.getContext<Context>();

    // Log detailed error information
    this.logger.error('❌ Telegram Bot Error occurred');
    this.logger.error(`Error: ${exception.message}`);
    this.logger.error(`Stack:`, exception.stack);

    // Log user information if available
    if (ctx.from) {
      this.logger.error(`User ID: ${ctx.from.id}`);
      this.logger.error(`Username: @${ctx.from.username || 'N/A'}`);
      this.logger.error(
        `Name: ${ctx.from.first_name} ${ctx.from.last_name || ''}`,
      );
    }

    // Log message information if available
    if ('message' in ctx && ctx.message) {
      this.logger.error(`Message: ${JSON.stringify(ctx.message)}`);
    }

    // Log callback query if available
    if ('callbackQuery' in ctx && ctx.callbackQuery) {
      this.logger.error(`Callback Query: ${JSON.stringify(ctx.callbackQuery)}`);
    }

    // Try to send error message to user
    try {
      if (ctx.chat?.id) {
        await ctx.reply(
          "❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring yoki qo'llab-quvvatlash bilan bog'laning.",
        );
      }
    } catch (replyError) {
      this.logger.error('Failed to send error message to user:', replyError);
    }
  }
}
