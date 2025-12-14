import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) {}

  async create(
    channelId: string,
    channelName: string,
    channelLink: string,
    order?: number,
  ) {
    return this.prisma.mandatoryChannel.create({
      data: {
        channelId,
        channelName,
        channelLink,
        order: order || 0,
      },
    });
  }

  async findAll() {
    return this.prisma.mandatoryChannel.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.mandatoryChannel.findUnique({
      where: { id },
    });
  }

  async update(
    id: number,
    data: {
      channelId?: string;
      channelName?: string;
      channelLink?: string;
      order?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.mandatoryChannel.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.mandatoryChannel.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reorder(ids: number[]) {
    const updates = ids.map((id, index) =>
      this.prisma.mandatoryChannel.update({
        where: { id },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);
  }
}
