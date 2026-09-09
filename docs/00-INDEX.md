# UCF Meeting & Action Item Tracker — documentation

Read in this order.

| # | Document | What it settles |
|---|---|---|
| — | [`../CLAUDE.md`](../CLAUDE.md) | **Start here.** Stack, layout, non-negotiable rules, open decisions, commands |
| 01 | [PRD](01-PRD.md) | Frozen functional scope, the ten modules, the behaviour that defines the product |
| 02 | [Data model](02-DATA-MODEL.md) | Entities, the one-table-two-shapes decision, codes, indexes, seed |
| 03 | [API spec](03-API-SPEC.md) | Every endpoint, error codes, request shapes |
| 04 | [Access control](04-RBAC.md) | Designation × capability, project scoping, object-level guards |
| 05 | [Workflows](05-WORKFLOWS.md) | Four state machines, guards, carry-forward, scheduled jobs |
| 06 | [Notifications](06-NOTIFICATIONS.md) | 27 automatic events, manual share, Email and WhatsApp adapters, templates |
| 07 | [UI spec](07-UI-SPEC.md) | Tokens, routes, components, the rules the prototype does not state |
| 08 | [Build plan](08-BUILD-PLAN.md) | Eight phases, numbered tickets, estimate, out of scope |
| 09 | [Test plan](09-TEST-PLAN.md) | 24 must-pass assertions, six E2E journeys, performance, security |
| 10 | [Deployment](10-DEPLOYMENT.md) | Topology, environments, release, backup, go-live checklist |
| 11 | [Handover](11-HANDOVER.md) | What was frozen, what shipped in this pack, what is deferred and why |
| 12 | [Phase 0 report](12-PHASE-0-REPORT.md) | **Read before Phase 1.** What was built and verified, three decisions taken, two traps already found |
| 13 | [Phase 0 review](13-PHASE-0-REVIEW.md) | Independent re-verification of every Phase 0 claim, and ten findings — two of which stop the API booting |

## The reference build

Setup: [`../SETUP-WINDOWS.md`](../SETUP-WINDOWS.md) — PostgreSQL and pnpm, no Docker needed.

`prototype/UCF-MoM-Tracker-Interactive.html` — open it in a browser. It is the visual and behavioural source of truth. Sign in as any officer; the role switcher in the top bar changes what the application is.

`prototype/Sample-MoM-draft.pdf` — what the generated document must look like.

## Two decisions still open

1. **Priority routing** — which action priority requires whose confirmation. Build the policy function, not the matrix.
2. **Email provider and hosting target** — build the adapter, ship console and SMTP.

Neither blocks any phase. Both are marked in the code where they land.
