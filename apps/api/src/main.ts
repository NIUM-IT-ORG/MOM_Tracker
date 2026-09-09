import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { loadEnv } from './config/env.js';
import { createHttpLogger, createLogger } from './common/logger.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(createHttpLogger(logger));
  app.use(helmet());
  app.use(cookieParser());

  // Tokens travel as httpOnly cookies, so the browser must be allowed to send
  // them and the origin list must be explicit — never a wildcard with credentials.
  app.enableCors({ origin: env.WEB_ORIGIN.split(',').map((o) => o.trim()), credentials: true });

  app.setGlobalPrefix(env.API_PREFIX);
  app.enableShutdownHooks();

  await app.listen(env.PORT);
  logger.info(
    { port: env.PORT, prefix: env.API_PREFIX, env: env.NODE_ENV },
    `API listening on http://localhost:${env.PORT}/${env.API_PREFIX}`,
  );
}

bootstrap().catch((err: unknown) => {
  // The logger itself may be what failed, so this one writes directly.
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
