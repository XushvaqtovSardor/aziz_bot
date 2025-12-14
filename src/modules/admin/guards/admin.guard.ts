import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Context } from 'telegraf';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = context.getArgByIndex(0) as Context;

    if (!ctx.from) {
      return false;
    }

    const chatId = String(ctx.from.id);

    const admin = await this.prisma.admin.findUnique({
      where: { telegramId: chatId },
    });

    return !!admin;
  }
}
