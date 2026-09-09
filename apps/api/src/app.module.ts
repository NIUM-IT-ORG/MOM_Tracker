import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { loadEnv } from './config/env.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Validated once, at boot. A bad environment stops the process here
      // rather than surfacing as a null three layers down at request time.
      validate: (raw) => loadEnv(raw as NodeJS.ProcessEnv),
    }),
    PrismaModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
  ],
})
export class AppModule {}
