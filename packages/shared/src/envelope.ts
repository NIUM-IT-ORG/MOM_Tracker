/**
 * The response envelope, used by every endpoint without exception.
 * Success is `{ data }`; failure is `{ error: { code, message, details? } }`.
 * A client that has to guess the shape is a client that will guess wrong.
 */

export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN_CAPABILITY: 'FORBIDDEN_CAPABILITY',
  SELF_CONFIRMATION: 'SELF_CONFIRMATION',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  AGENDA_FROZEN: 'AGENDA_FROZEN',
  MINUTES_LOCKED: 'MINUTES_LOCKED',
  MOM_IMMUTABLE: 'MOM_IMMUTABLE',
  SIGNED_MOM_MISMATCH: 'SIGNED_MOM_MISMATCH',
  REVISED_DUE_REQUIRED: 'REVISED_DUE_REQUIRED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** The HTTP status each code is returned with. One code, one status, always. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN_CAPABILITY: 403,
  SELF_CONFIRMATION: 403,
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  AGENDA_FROZEN: 409,
  MINUTES_LOCKED: 409,
  MOM_IMMUTABLE: 409,
  SIGNED_MOM_MISMATCH: 422,
  REVISED_DUE_REQUIRED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type ApiSuccess<T> = { data: T };
export type ApiFailure = { error: ApiError };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PageMeta {
  page: number;
  size: number;
  total: number;
}
export type ApiPage<T> = { data: T[]; meta: PageMeta };

export function isFailure<T>(r: ApiResponse<T>): r is ApiFailure {
  return typeof r === 'object' && r !== null && 'error' in r;
}
