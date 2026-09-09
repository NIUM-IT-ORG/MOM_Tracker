# UCF Meeting & Action Item Tracker

Read this file first. It is the contract for how this repository is built.

## What this is

A web application for the **Urban Challenge Fund (UCF)** that turns review meetings into tracked, named, dated commitments. A meeting is created (instantly or on a schedule), held, minuted; every commitment becomes an **action** with responsible officers and a due date, or a **clarification** with a responder; a **Minutes of Meeting** document is generated, approved, signed and circulated; and circulation is what makes the actions live. Nothing closes until a senior officer confirms it.

The functional scope is **frozen**. `docs/01-PRD.md` is the specification. Do not add features that are not in it; if something seems missing, raise it rather than inventing it.

## The reference prototype

`prototype/UCF-MoM-Tracker-Interactive.html` is a complete, clickable prototype of the agreed design. **It is the visual and behavioural source of truth.** Open it in a browser before building any screen. When a doc and the prototype disagree, the prototype wins on layout and interaction; the docs win on rules, data and permissions.

Its design tokens — colours, type scale, spacing, radii, chip styles — are lifted into `apps/web/src/styles/tokens.css`. Do not invent new ones.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS | Server Components by default; `'use client'` only where interaction demands it |
| Backend | NestJS 10, TypeScript | Module per domain, matching `docs/03-API-SPEC.md` |
| ORM / DB | Prisma + PostgreSQL 16 | Schema in `prisma/schema.prisma` — treat it as generated from `docs/02-DATA-MODEL.md` |
| Queue | BullMQ + Redis | Notifications, scheduled jobs, PDF generation |
| Auth | JWT access + refresh, httpOnly cookies | Argon2id password hashing; OTP on login for officers |
| Files | S3-compatible object storage (MinIO in dev) | Never store uploads on the app filesystem |
| PDF | Puppeteer rendering the same HTML the UI previews | One template, one output — no second renderer |
| Email | Adapter interface; SMTP implementation first | Provider not yet chosen — see `docs/06-NOTIFICATIONS.md` |
| WhatsApp | Adapter interface; Indian aggregator (Gupshup reference) | Template-based; provider is swappable |
| Tests | Vitest (unit), Supertest (API), Playwright (E2E) | |
| Container | Docker Compose (optional in dev) | Hosting target not yet chosen — assume nothing managed |

**Development runs without Docker.** PostgreSQL is installed natively; the queue runs in
process, files go to local disk, and email is written to a folder. Four environment
variables switch each to Redis, S3 and SMTP with no code change — that is what the
adapters are for, and the app refuses to boot in production with the development ones.

## Repository layout

```
MoM_Tracker/
├─ CLAUDE.md                 ← this file
├─ docs/                     ← the specification; read before coding
├─ prototype/                ← the clickable reference build
├─ prisma/schema.prisma      ← single source of truth for the database
├─ apps/
│  ├─ api/                   ← NestJS
│  │  └─ src/modules/{auth,users,projects,meetings,minutes,mom,items,
│  │                     notifications,reports,audit,files,masters}
│  └─ web/                   ← Next.js
│     └─ src/{app,components,lib,styles}
├─ packages/shared/          ← enums, DTO types, zod schemas used by both apps
└─ docker/
```

`packages/shared` is imported by both apps. **Every enum and status string lives there**, never as a string literal in a component or a service.

## Non-negotiable rules

1. **Access is computed, never stored per user.** A user has a *designation* and a *project mapping*. Capability comes from the designation; data scope comes from the mapping. There is no per-user permission table. See `docs/04-RBAC.md`.
2. **Every list and detail query is project-scoped at the repository layer**, not in the controller and not in the UI. A missing scope filter is a security bug, not a display bug.
3. **The audit log is append-only.** No update, no delete, no exceptions. A correction is a new row referencing the old one.
4. **Action items are inert until the signed MoM is circulated.** Creating an action does not assign it. Circulation does.
5. **Nobody confirms their own work.** An officer may report an action complete; a different officer with the confirming capability closes it.
6. **A circulated MoM is immutable.** Corrections are issued as a linked corrigendum, never by overwriting.
7. **Every outbound message is logged** with recipient, channel, template, payload hash and delivery state — automatic or manually shared.
8. **No secrets in the repo.** Everything through `.env`; `.env.example` lists every key with a safe placeholder.
9. **All money is `Decimal(14,2)`, all dates are `date` or `timestamptz`.** Never floats for currency, never naive timestamps.
10. **Server-side validation on every endpoint** with zod DTOs from `packages/shared`. Client validation is a convenience, never the guard.

## Open decisions — do not guess

Two things are deliberately undecided. Build so they can be dropped in, and do not invent an answer:

- **Priority routing.** Actions carry a priority (Very High → Lower). Which priority requires whose confirmation is **not yet decided**. Implement confirmation as a policy function `resolveConfirmers(action): DesignationId[]` in `apps/api/src/modules/items/confirmation.policy.ts`, seeded with a single-confirmer default and an obvious place to add the matrix.
- **Email provider and hosting target.** Write against the adapter interface only.

## Conventions

- Files `kebab-case.ts`; React components `PascalCase.tsx`; DB tables and columns `snake_case`; API JSON `camelCase` (Prisma `@map` handles the boundary).
- Every API route is `/api/v1/...` and returns `{ data }` or `{ error: { code, message, details? } }`.
- Every mutation writes an audit row in the same transaction as the change. If the audit write fails, the change rolls back.
- Commit format: `type(scope): summary` — e.g. `feat(meetings): instant meeting creation`.
- No `any`. No `// eslint-disable` without a comment saying why.

## Commands

```bash
pnpm install
pnpm db:deploy         # apply existing migrations (pnpm db:up first, if using Docker)
pnpm db:seed           # loads the demo dataset from the prototype
pnpm assert:invariants  # append-only audit + the items shape constraint
pnpm assert:seed       # the seeded figures must equal the prototype's
pnpm dev               # api on :4000, web on :3000
pnpm test              # unit + api
pnpm lint && pnpm typecheck
```

## Where to start

**Phase 0 is done.** Read `docs/12-PHASE-0-REPORT.md` first: it records what was verified, three
decisions taken, and two traps already found — including the one that matters most, that the
dashboard counts only *activated* items and the unscoped number is different.

`docs/08-BUILD-PLAN.md` breaks the rest into seven phases with numbered tickets, in dependency
order. Work a phase at a time; each ends with something demonstrable. Do not start phase N+1
while phase N has failing tests.

Follow the shape that is already in the repository rather than inventing alongside it: throw
`AppError` with a documented code and let the filter map it; return the payload and let the
interceptor wrap it in `{ data }`; put every new setting in `config/env.ts` with a zod rule and a
line in `.env.example`.
