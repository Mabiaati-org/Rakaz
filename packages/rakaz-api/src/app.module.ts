import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';
import { AppConfigModule } from './config/app-config.module.js';
import { AppConfig } from './config/app-config.service.js';
import { AbsencesModule } from './modules/absences/absences.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DriverModule } from './modules/driver/driver.module.js';
import { DriversModule } from './modules/drivers/drivers.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ParentModule } from './modules/parent/parent.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { RoutesModule } from './modules/routes/routes.module.js';
import { SchoolsModule } from './modules/schools/schools.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { TicketsModule } from './modules/tickets/tickets.module.js';
import { TripsModule } from './modules/trips/trips.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    // Generous by default (parents poll the live trip); sign-in routes set their own tighter limits.
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ ttl: 60_000, limit: 300 }],
        // The e2e suite signs in far more often than a real client would.
        skipIf: () => config.env === 'test',
      }),
    }),
    RealtimeModule,
    NotificationsModule,
    AuthModule,
    SettingsModule,
    TripsModule,
    AbsencesModule,
    FinanceModule,
    TicketsModule,
    SchoolsModule,
    StudentsModule,
    DriversModule,
    RoutesModule,
    AdminModule,
    DriverModule,
    ParentModule,
    HealthModule,
  ],
  providers: [
    // Filters run in reverse registration order, so the Prisma filter gets first pick of its errors.
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
  ],
})
export class AppModule {}
