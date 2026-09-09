import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';

/**
 * Wraps every successful response in `{ data }`.
 *
 * A paged handler returns `{ data, meta }` itself; that shape is passed through
 * untouched so it does not end up as `{ data: { data, meta } }`. Anything else
 * — including `null` — is wrapped, so a client never has to branch on whether
 * the envelope is present.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body: unknown) => {
        if (isPaged(body)) return body;
        return { data: body ?? null };
      }),
    );
  }
}

function isPaged(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'data' in body &&
    'meta' in body &&
    Array.isArray((body as { data: unknown }).data)
  );
}
