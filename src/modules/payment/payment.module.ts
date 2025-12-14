import { Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { PremiumService } from './services/premium.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PaymentService, PremiumService],
  exports: [PaymentService, PremiumService],
})
export class PaymentModule {}
