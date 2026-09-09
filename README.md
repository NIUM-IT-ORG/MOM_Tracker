# MoM_Tracker

**UCF Meeting & Action Item Tracker** — after every meeting, each commitment is written down with named officers and a date, and tracked until a senior officer agrees it is done.

Phase 0 is complete: workspace, database, migration, seed, both applications, CI. The screens arrive from Phase 1 onwards.

---

## Get it running

Windows without Docker — the two installs and five commands are in **[`SETUP-WINDOWS.md`](SETUP-WINDOWS.md)**. Short version:

```bash
cp .env.example .env      # then set DATABASE_URL and the two JWT secrets
pnpm install
pnpm db:deploy            # apply migrations
pnpm db:seed              # load the prototype's dataset
pnpm assert:invariants     # prove the two database guarantees
pnpm dev                  # api :4000 · web :3000
```

If Docker is available, `pnpm db:up` brings up PostgreSQL, Redis, MinIO and Mailpit instead of installing PostgreSQL natively.

---

## Layout

```
MoM_Tracker/
├─ CLAUDE.md               the build contract — read it first
├─ SETUP-WINDOWS.md        local setup without Docker
├─ docs/                   the specification, 00 to 12
├─ prototype/              the clickable reference build ← the source of truth
├─ prisma/                 schema, migrations, seed, extracted fixture
├─ packages/shared/        enums, capabilities, zod DTOs — used by both apps
├─ apps/api/               NestJS
├─ apps/web/               Next.js
├─ scripts/                the two CI assertions
└─ .github/workflows/ci.yml
```

---

## Open the prototype first

`prototype/UCF-MoM-Tracker-Interactive.html` — double-click it. No server, no build. Sign in as any officer; the chip in the top bar switches designation and the whole application changes with it.

It is the **visual and behavioural source of truth**. When a document and the prototype disagree, the prototype wins on layout and interaction; the documents win on rules, data and permissions. Twenty minutes in it will save an hour of specification.

Worth walking specifically: both meeting journeys (instant and scheduled) · the five tabs on a held meeting · the minutes editor, switching an entry between Action and Clarification · the MoM cycle from generate to circulate, then the register lighting up · the Share dialog anywhere it appears.

---

## Version control

This is already a Git repository with Phase 0 committed on `main`. To put it on a remote:

```bash
git remote add origin <your repository URL>
git push -u origin main
```

Conventions, so history stays readable and tickets stay traceable:

- **Branches** — `feat/P1-03-capability-guard`, `fix/P4-07-watermark`. One ticket per branch.
- **Commits** — `type(scope): summary`, with the ticket id as the scope where there is one:
  `feat(P3-04): agenda carry-forward`. Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`.
- **`main` stays green.** Merge only when `pnpm lint`, `pnpm typecheck` and `pnpm test` all pass —
  the CI workflow runs exactly those, plus the migration, the seed and the two assertions.
- **Never commit `.env`.** It is ignored; `.env.example` is the one that is tracked.
- `pnpm-lock.yaml` **is** committed — CI installs with `--frozen-lockfile`.

---

## Commands

```bash
pnpm dev                  # both apps
pnpm build                # both apps
pnpm test                 # unit + api
pnpm lint                 # --max-warnings 0, must be clean
pnpm typecheck

pnpm db:deploy            # apply existing migrations
pnpm db:migrate           # create a migration after editing schema.prisma
pnpm db:seed              # reload the prototype dataset
pnpm db:reset             # drop, migrate, seed
pnpm db:studio            # browse the data

pnpm assert:invariants     # append-only audit + the items shape constraint
pnpm assert:seed          # the seeded figures must equal the prototype's
```

---

## The five rules most likely to be built the ordinary way instead of the right way

1. **Circulation activates items.** An action created while minuting is *inert* — not assigned, not clocked, not notified. It goes live when the signed MoM is circulated, and every dashboard count, reminder and escalation filters on `activated_at IS NOT NULL`. The seed proves the difference: 7 actions are "In Progress" unscoped, but the dashboard shows **4**, because six items have not been circulated yet.
2. **Access is computed, never stored per user.** Capability comes from the designation, data scope from the project mapping, and the filter belongs in the repository — not the controller, not the UI. A missing scope filter is a security bug.
3. **One MoM template, one output.** The screen preview and the PDF come from the same HTML. Two renderers is how the printed minutes and the on-screen minutes end up disagreeing about what was decided.
4. **Joint ownership is real.** Several officers on an action are equally accountable. There is no primary-owner column, and adding one later is a scope change.
5. **Nobody confirms their own work.** Under Review exists for exactly this, and the guard is server-side.

---

## Two decisions the client has deferred

Do not invent answers. Build so they drop in.

| # | Decision | Build this instead |
|---|---|---|
| 1 | **Priority routing** — which action priority requires whose confirmation | `resolveConfirmers(action)` returning a single default confirmer, with the matrix's future home marked. Priority is captured and displayed; it does not route. |
| 2 | **Email provider and hosting target** | The adapter interface only. `Console` and `Smtp` ship; assume nothing managed. |

---

## Working with Claude Code

Each phase is one prompt. For the next one:

> Read CLAUDE.md, docs/12-PHASE-0-REPORT.md and docs/04-RBAC.md, then implement Phase 1 of docs/08-BUILD-PLAN.md — tickets P1-01 through P1-08. Work one ticket at a time. Do not start Phase 2 while any Phase 1 test fails.

`docs/12-PHASE-0-REPORT.md` records what was verified, three decisions taken, and two traps already found and fixed. Read it before Phase 1.

---

## Out of scope for v1

CSV bulk upload with row-wise validation · bilingual (Telugu) interface · native mobile app · offline field capture · digital signature (DSC / eSign) · calendar (ICS) integration · departmental SSO.

CSV bulk upload was Phase 5 of the original brief and is the strongest v1.1 candidate. The import buttons exist in the prototype and are deliberately inert.
