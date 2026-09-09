import { randomUUID } from 'node:crypto';
import pino, { type Logger } from 'pino';
import pinoHttp from 'pino-http';
import type { Env } from '../config/env.js';

/**
 * One request id, attached at the edge, echoed in the response header and
 * present on every log line for that request. Without it, a report of "it
 * failed at about four o'clock" is unanswerable.
 */
export function createLogger(env: Env): Logger {
  return pino({
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
        : undefined,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
        '*.otp',
      ],
      censor: '[redacted]',
    },
  });
}

export function createHttpLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers['x-request-id'];
      const id = typeof existing === 'string' && existing ? existing : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: {
      ignore: (req) => req.url === '/api/v1/health',
    },
  });
}
