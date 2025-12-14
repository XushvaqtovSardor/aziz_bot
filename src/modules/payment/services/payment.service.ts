import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: number,
    amount: number,
    receiptFileId: string,
    duration: number = 30,
  ) {
    return this.prisma.payment.create({
      data: {
        userId,
        amount,
        duration,
        receiptFileId,
        status: PaymentStatus.PENDING,
      },
      include: {
        user: true,
      },
    });
  }

  async findPending() {
    return this.prisma.payment.findMany({
      where: { status: PaymentStatus.PENDING },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  async findByUser(userId: number) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(paymentId: number, adminId: number, durationDays: number) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.APPROVED,
        processedBy: String(adminId),
        processedAt: new Date(),
      },
    });

    // Activate premium for user
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    await this.prisma.user.update({
      where: { id: payment.userId },
      data: {
        isPremium: true,
        premiumExpiresAt: expiresAt,
      },
    });

    return payment;
  }

  async reject(paymentId: number, adminId: number, reason?: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REJECTED,
        processedBy: String(adminId),
        processedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  async getStatistics() {
    const [
      totalPayments,
      totalRevenue,
      pendingCount,
      approvedCount,
      rejectedCount,
    ] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.APPROVED },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.APPROVED } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.REJECTED } }),
    ]);

    return {
      totalPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingCount,
      approvedCount,
      rejectedCount,
    };
  }
}
