# 13 · Phase 0 review

An independent review of the Phase 0 foundation, carried out by re-running every
claim in `docs/12-PHASE-0-REPORT.md` against a real PostgreSQL 16 rather than
reading them, and then reading the code for what the green build does not cover.

**Verdict: the foundation is sound and the Phase 0 report is honest.** Every
figure it claims was reproduced exactly. Ten defects were found, none of them in
what Phase 0 set out to prove, and two of which will stop the API from starting
in environments the repository says it supports.

---

## 1 · Claims re-verified

Every row of the report's verification table was re-run. All of them hold.

| Claim | Re-run result |
|---|---|
| `20260901000000_init` applies to an empty database | ✅ 23 tables + `_prisma_migrations`, 0 errors |
| `pnpm db:seed` | ✅ 3 projects · 6 ULBs · 9 designations · 14 users · 7 meetings · 19 items · 15 documents |
| `pnpm assert:invariants` | ✅ 11/11 — all six malformed shapes refused, both good ones accepted, UPDATE and DELETE ignored |
| `pnpm assert:seed` | ✅ 21/21 — including both dashboard donuts |
| `pnpm test` | ✅ 13 passed (9 DTO, 4 API) |
| `pnpm lint --max-warnings 0` | ✅ clean |
| `pnpm typecheck` | ✅ clean across all three packages |
| `pnpm build` | ✅ both applications build |

Two further properties, not claimed but worth recording because later phases
will depend on them:

- **The seed is idempotent.** Run twice against the same database, the counts
  are unchanged and `assert:seed` still passes.
- **`packages/shared/src/enums.ts` really does mirror `schema.prisma`.** All 16
  Prisma enums match value for value, checked programmatically rather than by eye.

The running API was also exercised directly: `{ data }` envelope, the
`{ error: { code, message } }` shape on an unknown route, `x-request-id`, and
helmet's CSP/HSTS/`X-Content-Type-Options`/`X-Frame-Options` all behave as
documented.

---

## 2 · Findings

### F-01 · HIGH — the API cannot start on Node 20.0–20.18

`packages/shared` is published as `"type": "module"` (ESM only). `apps/api`
compiles to **CommonJS**, and `all-exceptions.filter.ts` imports `ERROR_STATUS`,
which is a *value*, not a type — so the emitted output contains a literal
`require("@mom/shared")` of an ES module:

```
apps/api/dist/common/filters/all-exceptions.filter.js:13:
  const shared_1 = require("@mom/shared");
```

This works on the reviewer's Node 22 only because Node ≥ 20.19 / ≥ 22.12 added
native `require(esm)`. With that feature disabled — which is exactly Node
20.0–20.18 — it fails at load:

```
FAILED: ERR_REQUIRE_ESM
require() of ES Module .../packages/shared/dist/index.js
from .../apps/api/dist/common/filters/all-exceptions.filter.js not supported.
```

`package.json` declares `engines: { node: ">=20" }` and CI pins
`NODE_VERSION: '20'`. Both permit versions where the API dies at boot.

Nothing in CI catches this because **CI never starts the built API** — `pnpm build`
compiles it and the job ends. The API tests run under Vitest/SWC, which resolves
ESM natively and so never takes the `require` path.

*Fix:* emit dual CJS+ESM from `packages/shared` (or drop `"type": "module"` and
emit CJS, since the API is CommonJS and Next transpiles the package anyway), and
add a CI step that boots `node apps/api/dist/main.js` and curls `/health`. Raise
the `engines` floor to `>=20.19` as a belt-and-braces measure, not as the fix.

### F-02 · HIGH — the API refuses to boot if the database is momentarily down

`PrismaService.onModuleInit` awaits `$connect()`. A failure there aborts Nest's
bootstrap and kills the process:

```
$ node apps/api/dist/main.js     # DB unreachable
Can't reach database server at `127.0.0.1:5499`
EXIT CODE: 1
```

Two consequences:

1. **Crash-loop on any deploy where the database is not up first.** There is no
   retry and no backoff.
2. **It makes `/health/ready`'s "database down" branch unreachable in
   production.** The endpoint exists precisely to report *up-process,
   down-database* — but the process can never reach that state, because it
   exits instead. The state readiness was built to describe cannot occur.

The spec test does not catch this: it injects a mock `PrismaService`, so
`onModuleInit` never runs.

*Fix:* let bootstrap succeed without a live database — connect lazily, or catch
and log the connect failure and retry in the background — and let `/health/ready`
be the thing that reports it.

### F-03 · MEDIUM — `/health/ready` returns HTTP 200 when the database is down

```ts
return { ok: false, database: 'down' };   // ← served as 200
```

The method's own doc comment says it exists "so a rolling deploy does not send
traffic to an instance that cannot serve it". Kubernetes readiness probes, ALB
target groups and every other health checker key on the **status code**, not the
body. A 200 keeps the instance in rotation, which is the opposite of the stated
intent.

`health.controller.spec.ts` asserts the 200 explicitly, so the bug is currently
pinned in place by a test.

*Fix:* return 503 on the down path (the body can stay as it is) and update the
test to expect it.

### F-04 · MEDIUM — `?overdue=false` filters to overdue items only

`itemQueryDto.overdue` uses `z.coerce.boolean()`, which is `Boolean(value)`.
Every non-empty string is truthy, so:

| query string | parses to |
|---|---|
| `overdue=true` | `true` |
| `overdue=false` | `true` ❌ |
| `overdue=0` | `true` ❌ |
| `overdue=no` | `true` ❌ |
| `overdue=` | `false` |

Only the empty string is falsy. The register filter in Phase 2 will be built on
this DTO, and a filter that cannot be turned off reads as a data bug, not a
parsing bug.

*Fix:* `z.enum(['true', 'false']).transform((v) => v === 'true').optional()`, or
a `z.preprocess` that maps the usual falsy spellings. `z.coerce.boolean()` is
almost never what you want for a query parameter — worth a note in the DTO
conventions so it does not reappear.

### F-05 · MEDIUM — the append-only audit log is not TRUNCATE-proof, and fails silently

CLAUDE.md rule 3 is "The audit log is append-only. No update, no delete, no
exceptions." The migration enforces that with two rules:

```sql
CREATE RULE "audit_no_update" AS ON UPDATE TO "audit_entries" DO INSTEAD NOTHING;
CREATE RULE "audit_no_delete" AS ON DELETE TO "audit_entries" DO INSTEAD NOTHING;
```

Rules intercept `UPDATE` and `DELETE`. They do not intercept `TRUNCATE`:

```sql
INSERT INTO audit_entries (...);   -- INSERT 0 1
SELECT count(*) FROM audit_entries;  -- 1
TRUNCATE audit_entries CASCADE;      -- TRUNCATE TABLE
SELECT count(*) FROM audit_entries;  -- 0
```

The whole log, gone, no error. `assert-invariants.ts` does not probe this.

Separately, `DO INSTEAD NOTHING` means tampering **succeeds silently**: a service
that tries to update an audit row is told `UPDATE 0` and carries on believing it
worked. For a governance audit trail, loud refusal is the better failure mode
than a quiet no-op.

*Fix:* add a `BEFORE TRUNCATE ... FOR EACH STATEMENT` trigger that raises, add a
probe for it to `assert-invariants.ts`, and consider replacing the two rules with
`BEFORE UPDATE OR DELETE` triggers that `RAISE EXCEPTION`. Note that none of this
constrains a superuser who can drop the triggers — the application role should
not be one. The seed and CI currently connect as a superuser.

### F-06 · LOW — Prisma warnings and errors are silently discarded

```ts
super({ log: [{ emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }] });
```

`emit: 'event'` routes those logs to event listeners, and `PrismaService` never
registers any (`$on('warn')` / `$on('error')`). With no listener, the events go
nowhere. Every database warning and non-thrown error is dropped — including slow
-query and connection-pool warnings, which are the ones you want first when the
system is under load.

*Fix:* subscribe both events to the Nest logger in `onModuleInit`, or switch to
`emit: 'stdout'`.

### F-07 · LOW — the health route is excluded from logging by a hard-coded path

```ts
autoLogging: { ignore: (req) => req.url === '/api/v1/health' }
```

Two problems: it hard-codes the prefix that `env.API_PREFIX` is supposed to
control, and it misses `/health/ready` — the endpoint an orchestrator actually
polls every few seconds. Readiness probes will fill the logs.

*Fix:* build the path from `env.API_PREFIX` and match both routes.

### F-08 · LOW — sidebar active-state uses a bare `startsWith`

```ts
const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
```

`/mom` matches `/mom-register`; `/meetings` matches `/meetings-archive`. Harmless
with today's five routes, and wrong as soon as Phase 2 adds a sibling.

*Fix:* `pathname === item.href || pathname.startsWith(item.href + '/')`.

### F-09 · LOW — the API silently opts out of a base-config strictness flag

`apps/api/tsconfig.json` sets `"noUncheckedIndexedAccess": false`, overriding
`tsconfig.base.json`, in the half of the codebase that will hold the
authorisation and scoping logic. Every other deliberate deviation in this
repository carries a comment explaining itself; this one does not, so a later
reader cannot tell whether it was a decision or an expedient.

*Fix:* re-enable it, or comment why it is off.

### F-10 · LOW — `docker-compose.yml` documents a script that does something else

```yaml
#   pnpm db:reset -> docker compose down -v && docker compose up -d
```

The actual script is `prisma migrate reset --force`. `README.md` and
`SETUP-WINDOWS.md` both describe it correctly as "drop, migrate, seed"; only the
compose header is stale. Small, but it is the file someone reads when they are
already confused about their environment.

---

## 3 · Not defects, but worth flagging for Phase 1

- **The zod DTOs are entirely unwired.** `packages/shared/src/dto/*` is
  well-designed and thoroughly tested, and nothing consumes it — there is no
  `ZodValidationPipe`. `AllExceptionsFilter` already handles `ZodError`, so the
  intent is clear and only the pipe is missing. Until P1 adds it, CLAUDE.md rule
  10 ("server-side validation on every endpoint") is unenforced. Worth making it
  the first thing P1 does, so no endpoint is ever written without it.
- **`zod` currently resolves to a single instance** across both packages
  (`zod@3.25.76`), so `exception instanceof ZodError` in the filter works. That
  is a property of the current lockfile, not a guarantee. If the two packages
  ever resolve different zod copies, every validation failure silently becomes a
  500 `INTERNAL` instead of a 400. Cheap insurance: check `err.name === 'ZodError'`
  as well as `instanceof`, or make zod a peer dependency of `@mom/shared`.
- **No rate limiting yet**, though `RATE_LIMITED` is already in the error table.
  Expected at this stage; it belongs with the auth work in P1, since the login
  and OTP endpoints are what need it.

---

## 4 · Suggested order

F-01 and F-02 first: between them, the API does not reliably start, and neither
is visible from a green CI run. They are also both cheap. F-03 comes with F-02 —
they are two halves of the same story about what "ready" means. F-04 and F-05
before the code that depends on them is written in Phases 2 and 3. The rest can
travel with whatever phase touches those files.

The single highest-value structural change is a **CI smoke step that boots the
built API and curls `/health`**. F-01 and F-02 are both invisible to the current
pipeline for the same reason: nothing ever runs the thing that was built.
