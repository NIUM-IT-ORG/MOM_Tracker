# 08 · Build plan

Eight phases in dependency order. Each ends with something demonstrable and a green test run. **Do not start a phase while the previous one has failing tests.**

Ticket ids are stable — use them in commit messages: `feat(P3-04): agenda carry-forward`.

---

## Phase 0 · Foundation — 2 days

**Status: DONE.** Shipped in the repository — see `docs/12-PHASE-0-REPORT.md` for what was built,
what was verified and the three decisions taken along the way.

| # | Ticket | Done when | |
|---|---|---|---|
| P0-01 | pnpm monorepo: `apps/api`, `apps/web`, `packages/shared`, shared tsconfig, eslint, prettier | `pnpm lint && pnpm typecheck` pass | ✅ |
| P0-02 | Local services | **Changed:** the client has no Docker, so development runs on a natively installed PostgreSQL with an in-process queue, local-disk files and an email outbox folder. `docker-compose.yml` is kept for the day it is wanted. See `SETUP-WINDOWS.md`. | ✅ |
| P0-03 | Prisma from `prisma/schema.prisma`, first migration | `prisma/migrations/20260901000000_init` applies to an empty database | ✅ |
| P0-04 | Migration extras: append-only rule on `audit_entries`; check constraint on `items` enforcing the action/clarification column split | `pnpm assert:invariants` — eleven assertions against a real database | ✅ |
| P0-05 | `packages/shared`: every enum, capability key, zod DTO | imported by both apps; 9 unit tests | ✅ |
| P0-06 | NestJS skeleton: config, logger (pino, request id), global exception filter emitting the error envelope, health endpoint | `GET /api/v1/health` returns `{ data: { ok: true } }` — asserted by test | ✅ |
| P0-07 | Next.js skeleton: App Router, Tailwind, `tokens.css` lifted from the prototype, base layout with the navy sidebar and top bar | the shell renders; locked nav items are disabled, not hidden | ✅ |
| P0-08 | Seed script loading the prototype's demo dataset | `pnpm db:seed` gives 3 projects, 14 users, 7 meetings, 19 items | ✅ |
| P0-09 | CI: install, lint, typecheck, unit, migrate against a throwaway database | three jobs: static · database · build | ✅ |
| P0-10 | **Added:** `pnpm assert:seed` — the seeded figures must equal the prototype's | 21 assertions, including the two dashboard donuts | ✅ |

## Phase 1 · Identity and access — 3 days

| # | Ticket | Done when |
|---|---|---|
| P1-01 | Auth module: login, OTP, refresh with rotation and reuse detection, logout, sessions | tokens issued as httpOnly cookies |
| P1-02 | `JwtAuthGuard` resolving capabilities and project ids **from the database on every request** | editing a designation takes effect without re-login |
| P1-03 | `CapabilityGuard` + `@RequireCapability` | denied path returns `403 FORBIDDEN_CAPABILITY` with the key |
| P1-04 | `projectScope()` helper and its use in every repository finder | scope test suite passes for all eight entity types |
| P1-05 | Users, designations, departments CRUD; project mapping | matches `docs/04-RBAC.md` |
| P1-06 | `GET /access/matrix`, `GET /access/effective/:userId` | the checker returns the same answer the prototype dialog shows |
| P1-07 | Web: login page, session context, capability-aware navigation, role display in the top bar | locked nav items render disabled, exactly as in the prototype |
| P1-08 | Audit interceptor writing one row per mutation in the same transaction | a forced audit failure rolls the mutation back |

**Demo:** sign in as four designations and watch the navigation and the visible projects change.

## Phase 2 · Masters — 2 days

| # | Ticket | Done when |
|---|---|---|
| P2-01 | Projects CRUD with financial fields as `Decimal(14,2)` | no float anywhere near money |
| P2-02 | ULBs under a project, single-lead constraint | a second lead is rejected |
| P2-03 | Files module: presigned upload, sha256, MinIO in dev | a 20 MB PDF round-trips |
| P2-04 | Documents with **mandatory name, type and file**, scoped to project / meeting / item | a request missing any of the three returns `VALIDATION_FAILED` |
| P2-05 | Web: project master list and the four tabs — Project info, Officers, ULB info, Documents | matches the prototype |
| P2-06 | Web: people and masters, designation and department editors with retire-not-delete | |

**Demo:** create a project, add two ULBs, upload a sanction order, fail to upload one without a name.

## Phase 3 · Meetings — 5 days

| # | Ticket | Done when |
|---|---|---|
| P3-01 | Meeting entity, code generator `UCF/<scope>/<RM\|IM>-nn`, both state machines | every transition in `docs/05` is covered by a test, illegal ones return `409` |
| P3-02 | Instant flow: create, launch, end | launch emits `MTG-02` |
| P3-03 | Scheduled flow: plan, agenda, invitees, invitee inputs, confirm | confirm emits `MTG-01` |
| P3-04 | Carry-forward: candidates, selection, agenda item 0, `carryCount`, mandatory revised due on the second carry | `422 REVISED_DUE_REQUIRED` fires correctly |
| P3-05 | Agenda freeze job and the guard | invitee POST after the freeze returns `409 AGENDA_FROZEN` |
| P3-06 | RSVP; attendance with Present / Virtual / Absent and walk-ins | |
| P3-07 | Reschedule and cancel with mandatory reasons | both re-notify |
| P3-08 | Agenda PDF | |
| P3-09 | Web: meetings list with all filters; the type chooser; the instant composer; the four-step scheduled wizard | matches the prototype |
| P3-10 | Web: meeting detail with the five tabs — Agenda, Attendance, Actions/Clarifications, Documents, Signed MoM | tab state in the URL |

**Demo:** run both journeys end to end, from creation to attendance.

## Phase 4 · Minutes, items, MoM — 5 days

| # | Ticket | Done when |
|---|---|---|
| P4-01 | Minutes with server-side HTML sanitisation and versioning | a pasted Word document loses every style and keeps its structure |
| P4-02 | Items module, discriminated validation, joint ownership | an action without owners or a due date is rejected |
| P4-03 | Action state machine including `resolveConfirmers` **stubbed for the undecided priority routing** | the stub is a single named function with a comment |
| P4-04 | Self-confirmation guard | `403 SELF_CONFIRMATION` |
| P4-05 | Clarification state machine, Open → Responded → Closed | |
| P4-06 | MoM state machine, versions, history | every transition tested |
| P4-07 | MoM PDF: A4, DRAFT watermark until signed, full header block, Raised by in both tables, signature block | byte-compare against the reference PDF in `docs/reference/` |
| P4-08 | Signed upload with the page-count and action-row check | mismatch returns `422 SIGNED_MOM_MISMATCH` |
| P4-09 | **Circulation activates items** and fires `ACT-01` + `MOM-05` in one transaction | items are inert before, live after |
| P4-10 | Corrigendum as a new linked MoM | a circulated MoM cannot be mutated |
| P4-11 | Web: minutes editor route; typed entry form switching Action ⇄ Clarification; multi-select owners | matches the prototype |
| P4-12 | Web: MoM register with state tabs, approval console, signed upload, circulation log | |

**Demo:** minute a meeting, raise three actions and a clarification, generate, submit, approve, sign, circulate — and watch the register light up.

## Phase 5 · Notifications, email and WhatsApp — 4 days

| # | Ticket | Done when |
|---|---|---|
| P5-01 | `NotificationService.emit`, `notifications` + `dispatches`, BullMQ worker | one row per recipient per channel |
| P5-02 | Provider adapters: `Console`, `Smtp`, `Gupshup`, `Failing` | selected by env |
| P5-03 | Idempotency keys and the three-attempt retry ladder | a double-click sends once |
| P5-04 | Email layout and the plain-text alternative | |
| P5-05 | The four WhatsApp templates and their variable mapping | template registration checklist in the README |
| P5-06 | Delivery webhooks, HMAC-verified, updating dispatch state | |
| P5-07 | All 27 automatic events wired to their triggers | one test per event asserting recipients and channels |
| P5-08 | Nine scheduled jobs, idempotent | re-running a job changes nothing |
| P5-09 | Quiet hours and notification preferences | reminder classes suppressible, approvals not |
| P5-10 | `POST /share` with scope-checked recipients | you cannot share with someone you cannot see |
| P5-11 | Web: the Share dialog at all eight locations; the in-app bell | matches the prototype |
| P5-12 | Web: communication log with its three tabs | |

**Demo:** circulate a MoM and show the dispatch log filling, including a deliberately failing number.

## Phase 6 · Dashboard, register, reports — 3 days

| # | Ticket | Done when |
|---|---|---|
| P6-01 | `GET /dashboard`, all figures scoped | matches the prototype's numbers on the seed data |
| P6-02 | Web dashboard: hero cards, actions pie, clarifications pie, calendar with month navigation, attention list | |
| P6-03 | Register with every filter, ageing column, CSV export | |
| P6-04 | The six reports, three formats each | |
| P6-05 | Report subscriptions feeding `RPT-02`, weekly digest `RPT-01` | |
| P6-06 | Audit trail viewer | read-only, no mutation route exists |

## Phase 7 · Hardening and release — 3 days

| # | Ticket | Done when |
|---|---|---|
| P7-01 | Rate limiting, helmet, CORS allow-list, CSP | |
| P7-02 | Input fuzzing on every DTO; SQL injection and XSS suites | Prisma parameterises, sanitiser holds |
| P7-03 | Upload hardening: magic-byte type check, size cap, virus scan hook, no execution from storage | |
| P7-04 | Playwright E2E: both meeting journeys, the MoM cycle, the item ladder, a scoped-role walk | green in CI |
| P7-05 | Load check: 200 concurrent users, 50k items, register under 500 ms p95 | index review |
| P7-06 | Accessibility: keyboard path through every flow, contrast, labels | axe clean on the main routes |
| P7-07 | Backup and restore runbook; audit export | restore rehearsed once |
| P7-08 | Deployment: multi-stage images, migration-on-boot guard, health and readiness probes | |

---

## Estimate

27 working days for one experienced full-stack developer working with Claude Code, excluding the two open decisions and CSV bulk upload.

## Explicitly out of scope for v1

- **CSV bulk upload with row-wise validation** — Phase 5 of the original brief; import buttons exist in the UI but are inert. Plan it as a v1.1 phase.
- Bilingual (Telugu / English) interface.
- Native mobile app — the web build is responsive, but field-officer phone use should be reviewed after pilot.
- Offline capture for field officers.
- Digital signature (DSC/eSign) on the MoM — currently a scanned wet signature.
- Calendar integration (ICS invites to Outlook or Google).
- SSO against a departmental directory.

Raise each of these when the pilot feedback arrives; do not build them speculatively.
