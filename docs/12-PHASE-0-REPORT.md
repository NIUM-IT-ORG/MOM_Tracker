# 12 · Phase 0 report

What was built, what was actually verified, and the three decisions taken along the way. Read this before starting Phase 1.

---

## Verified, not just written

Every one of these was run against a real PostgreSQL 16, not asserted on paper:

| Check | Result |
|---|---|
| `prisma/migrations/20260901000000_init` applied to an empty database | 23 tables, 0 errors |
| `pnpm db:seed` | 3 projects · 6 ULBs · 9 designations · 14 users · 7 meetings · 19 items · 15 documents |
| `pnpm assert:invariants` | 11 assertions — `items_shape` refuses all six malformed shapes and still accepts both good ones; `audit_entries` ignores UPDATE and DELETE |
| `pnpm assert:seed` | 21 assertions — every figure matches the prototype, including both dashboard donuts |
| `pnpm test` | 13 tests — 9 DTO, 4 API |
| `pnpm lint` | clean at `--max-warnings 0` |
| `pnpm typecheck` | clean across all three packages |
| `pnpm build` | both applications build |

---

## Three decisions taken

**1 · Development runs without Docker.** The client's machine has Node and no Docker, so the development profile is a natively installed PostgreSQL plus three adapters that need nothing else running: the queue runs in process (`QUEUE_DRIVER=memory`), files go to local disk (`STORAGE_DRIVER=local`), and email is written as `.eml` files (`EMAIL_PROVIDER=console`). `docker-compose.yml` is kept, and switching to Redis, S3 and SMTP is four environment variables and no code change — which is what the adapters were for. The application refuses to boot in production with the memory queue or the console mailer, so neither can be left on by accident. Setup steps are in `SETUP-WINDOWS.md`.

**2 · The seed uses `pg`, not Prisma Client.** It is the one script that has to work on a bare checkout — before `prisma generate` has necessarily run, and in CI before anything is built. `prisma/seed-data.json` is *extracted* from the prototype by `prisma/extract-seed-data.mjs` rather than transcribed, so the built application and the prototype cannot drift. Do not hand-edit that JSON; regenerate it.

**3 · The initial migration is hand-written.** `prisma migrate dev` would normally generate it. It is committed as SQL you can read, which also let the two invariants live in the *first* migration rather than a follow-up — they are true of the very first row the database ever holds. When you next change `schema.prisma`, run `pnpm db:migrate` as usual; Prisma will tell you at once if anything has drifted.

---

## What Phase 0 caught that would have cost Phase 1 a day

**Vitest does not emit decorator metadata.** Its default transformer is esbuild, which does not implement `emitDecoratorMetadata`. NestJS resolves constructor dependencies from exactly that, so every injected service arrives as `undefined` — and the resulting failures look like logic bugs, not a missing transform. `apps/api/vitest.config.ts` uses SWC instead. Leave it alone.

**The dashboard counts activated items only.** Unscoped, the seed has 7 actions "In Progress". The prototype's dashboard shows 4. The difference is `activated_at IS NOT NULL` — the six items whose MoM has not been circulated are inert and must not appear in any count. `assert:seed` now asserts both numbers so this cannot be got wrong quietly. **This is the single easiest way to build the wrong product**, and it is now guarded by CI.

---

## The shape to copy

Phase 1 onwards should follow what is already here rather than inventing alongside it:

- **Errors.** Throw `AppError` with a documented code; `AllExceptionsFilter` turns it into the documented status. Never construct a response body by hand.
- **Responses.** Return the payload; `EnvelopeInterceptor` wraps it in `{ data }`. A paged handler returns `{ data, meta }` and is passed through untouched.
- **Environment.** Every new setting goes in `apps/api/src/config/env.ts` with a zod rule and a line in `.env.example`. The process refuses to start on a bad environment rather than failing later under load.
- **Enums.** `packages/shared/src/enums.ts` mirrors `schema.prisma` value for value, and carries the UI labels and the chart colours. No status string is ever typed as a literal in a component.
- **Navigation.** Locked items render disabled with a reason, never hidden. `apps/web/src/components/Sidebar.tsx` already does this; keep it.

---

## Known gaps, deliberately

- No authentication yet — the shell renders with an empty capability set, so every capability-gated nav item shows as locked. Phase 1 (P1-07) replaces the placeholder in `apps/web/src/app/layout.tsx`.
- No API client on the web side beyond the health probe on the dashboard.
- Playwright is not installed; the E2E job in CI is commented out until Phase 7.
- The seed sets no passwords. Accounts cannot be signed into until Phase 1 sets them — the correct default for a seed.

---

## Next

Phase 1 · Identity and access, tickets P1-01 to P1-08 in `docs/08-BUILD-PLAN.md`. It ends with a demo: sign in as four designations and watch the navigation and the visible projects change.

Prompt for Claude Code:

> Read CLAUDE.md, docs/12-PHASE-0-REPORT.md and docs/04-RBAC.md, then implement Phase 1 of docs/08-BUILD-PLAN.md — tickets P1-01 through P1-08. Work one ticket at a time. Do not start Phase 2 while any Phase 1 test fails.
