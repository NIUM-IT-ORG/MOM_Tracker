import type { ErrorCode } from '@mom/shared';

/**
 * The only error type a service should throw deliberately. It carries the
 * documented code, and the filter turns that code into the documented status —
 * so `docs/03-API-SPEC.md`'s error table stays true without anyone maintaining
 * a second mapping.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  /** Absent, or outside the caller's project scope. The client cannot tell, deliberately. */
  static notFound(what: string): AppError {
    return new AppError('NOT_FOUND', `${what} was not found.`);
  }

  static forbidden(capability: string): AppError {
    return new AppError(
      'FORBIDDEN_CAPABILITY',
      `Your designation does not carry "${capability}".`,
      { capability },
    );
  }

  static badTransition(from: string, to: string): AppError {
    return new AppError('INVALID_TRANSITION', `Cannot move from ${from} to ${to}.`, {
      from,
      to,
    });
  }

  static selfConfirmation(): AppError {
    return new AppError(
      'SELF_CONFIRMATION',
      'An owner cannot confirm their own action. Someone else has to agree it is done.',
    );
  }
}
