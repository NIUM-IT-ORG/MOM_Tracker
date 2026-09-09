import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ERROR_STATUS, type ApiError, type ErrorCode } from '@mom/shared';
import { AppError } from '../app-error.js';

/**
 * The single place an error becomes a response body. Every failure leaves here
 * as `{ error: { code, message, details? } }` — including the ones thrown by
 * Nest itself and the ones nobody anticipated.
 *
 * Internal errors are logged with their stack and returned without one. A stack
 * trace in a 500 body is a gift to whoever is probing the service.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, error } = this.translate(exception);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl} → ${status} ${error.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({ error });
  }

  private translate(exception: unknown): { status: number; error: ApiError } {
    if (exception instanceof AppError) {
      return {
        status: ERROR_STATUS[exception.code],
        error: { code: exception.code, message: exception.message, details: exception.details },
      };
    }

    if (exception instanceof ZodError) {
      return {
        status: 400,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The request body did not validate.',
          details: exception.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      return {
        status,
        error: {
          code: this.codeForStatus(status),
          message: Array.isArray(message) ? message.join('; ') : message,
        },
      };
    }

    return {
      status: 500,
      error: { code: 'INTERNAL', message: 'Something went wrong on our side.' },
    };
  }

  private codeForStatus(status: number): ErrorCode {
    switch (status) {
      case 400:
        return 'VALIDATION_FAILED';
      case 401:
        return 'UNAUTHENTICATED';
      case 403:
        return 'FORBIDDEN_CAPABILITY';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'INVALID_TRANSITION';
      case 429:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL';
    }
  }
}
