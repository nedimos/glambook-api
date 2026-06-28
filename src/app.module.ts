import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/exception.filter';

import { SalonsService } from './salons/salons.service';
import { SalonsController } from './salons/salons.controller';
import { AppointmentsService } from './appointments/appointments.service';
import { AppointmentsController } from './appointments/appointments.controller';

@Module({
  imports: [
    // Config — loads .env automatically
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — 100 req per 60s per IP
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
    }]),

    AuthModule,
  ],
  controllers: [
    SalonsController,
    AppointmentsController,
  ],
  providers: [
    PrismaService,
    SalonsService,
    AppointmentsService,

    // Global rate limit guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Global exception filter
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
