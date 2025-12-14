import { Module } from '@nestjs/common';
import { AdminService } from './services/admin.service';
import { AdminGuard } from './guards/admin.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdminService, AdminGuard, RolesGuard],
  exports: [AdminService, AdminGuard, RolesGuard],
})
export class AdminModule {}
