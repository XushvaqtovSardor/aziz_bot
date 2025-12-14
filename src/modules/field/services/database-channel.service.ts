import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DatabaseChannelService {
  constructor(private prisma: PrismaService) {}

  async create(channelId: string, channelName: string) {
    return this.prisma.databaseChannel.create({
      data: {
        channelId,
        channelName,
      },
    });
  }

  async findActive() {
    return this.prisma.databaseChannel.findFirst({
      where: { isActive: true },
    });
  }

  async setActive(channelId: string) {
    // Deactivate all others
    await this.prisma.databaseChannel.updateMany({
      data: { isActive: false },
    });

    // Activate the selected one
    return this.prisma.databaseChannel.update({
      where: { channelId },
      data: { isActive: true },
    });
  }

  async findAll() {
    return this.prisma.databaseChannel.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(channelId: string) {
    return this.prisma.databaseChannel.delete({
      where: { channelId },
    });
  }
}
