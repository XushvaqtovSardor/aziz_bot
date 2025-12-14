import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FieldService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    channelId: string;
    databaseChannelId?: number;
  }) {
    return this.prisma.field.create({
      data: {
        name: data.name,
        channelId: data.channelId,
        databaseChannelId: data.databaseChannelId,
      },
      include: {
        databaseChannel: true,
      },
    });
  }

  async getContentCount(fieldId: number, contentType: 'MOVIE' | 'SERIAL') {
    if (contentType === 'MOVIE') {
      return this.prisma.movie.count({ where: { fieldId } });
    } else {
      return this.prisma.serial.count({ where: { fieldId } });
    }
  }

  async findAll() {
    return this.prisma.field.findMany({
      include: {
        databaseChannel: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.field.findUnique({
      where: { id },
    });
  }

  async findByChannelId(channelId: string) {
    return this.prisma.field.findUnique({
      where: { channelId },
    });
  }

  async update(
    id: number,
    data: {
      name?: string;
      channelId?: string;
      channelLink?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.field.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.field.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async hardDelete(id: number) {
    return this.prisma.field.delete({
      where: { id },
    });
  }
}
