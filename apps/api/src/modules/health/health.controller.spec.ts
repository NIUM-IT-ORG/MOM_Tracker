import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter.js';
import { EnvelopeInterceptor } from '../../common/interceptors/envelope.interceptor.js';

/**
 * The contract every other endpoint inherits: `{ data }` on success,
 * `{ error: { code, message } }` on failure, and readiness that actually asks
 * the database rather than reporting the process is alive and calling it ready.
 */
describe('health, and the response envelope', () => {
  let app: INestApplication;
  let databaseAnswers = true;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: () => {
              if (!databaseAnswers) throw new Error('connection refused');
              return Promise.resolve([{ '?column?': 1 }]);
            },
          },
        },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('wraps a success in { data }', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ data: { ok: true } });
  });

  it('reports ready when the database answers', async () => {
    databaseAnswers = true;
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(res.body).toEqual({ data: { ok: true, database: 'up' } });
  });

  it('reports not ready when the database does not — and does not throw', async () => {
    databaseAnswers = false;
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(res.body).toEqual({ data: { ok: false, database: 'down' } });
    databaseAnswers = true;
  });

  it('returns the documented error envelope for an unknown route', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body).not.toHaveProperty('data');
  });
});
