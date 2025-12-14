import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminRole } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async isAdmin(telegramId: string): Promise<boolean> {
    const admin = await this.prisma.admin.findUnique({
      where: { telegramId },
    });
    return !!admin;
  }

  async isSuperAdmin(telegramId: string): Promise<boolean> {
    const admin = await this.prisma.admin.findUnique({
      where: { telegramId },
    });
    return admin?.role === AdminRole.SUPERADMIN;
  }

  async getAdminRole(telegramId: string): Promise<AdminRole | null> {
    const admin = await this.prisma.admin.findUnique({
      where: { telegramId },
      select: { role: true },
    });
    return admin?.role || null;
  }

  async getAdminByTelegramId(telegramId: string) {
    return this.prisma.admin.findUnique({
      where: { telegramId },
    });
  }

  async hasPermission(
    telegramId: string,
    permission: string,
  ): Promise<boolean> {
    const admin = await this.prisma.admin.findUnique({
      where: { telegramId },
    });

    if (!admin) return false;
    if (admin.role === AdminRole.SUPERADMIN) return true;

    // Check specific permissions based on role
    if (admin.role === AdminRole.MANAGER) {
      return [
        'MANAGE_FIELDS',
        'MANAGE_CHANNELS',
        'UPLOAD_CONTENT',
        'DELETE_CONTENT',
      ].includes(permission);
    }

    // Admin role has basic permissions
    return ['UPLOAD_CONTENT'].includes(permission);
  }

  async createAdmin(
    telegramId: string,
    username: string | undefined,
    role: AdminRole,
    createdBy: string,
  ) {
    return this.prisma.admin.create({
      data: {
        telegramId,
        username,
        role,
        createdBy,
      },
    });
  }

  async listAdmins() {
    return this.prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.listAdmins();
  }

  async deleteAdmin(telegramId: string) {
    return this.prisma.admin.delete({
      where: { telegramId },
    });
  }
}
