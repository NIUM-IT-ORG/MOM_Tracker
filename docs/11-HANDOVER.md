# 11 · Development handover

**Project:** MoM_Tracker — UCF Meeting & Action Item Tracker
**Status:** scope frozen, development pack delivered. 9 September 2026.

The design phase is closed. What follows is what was frozen, what was added last, and what is now in hand to build from.

---

## What was delivered

`MoM_Tracker-Dev-Pack.zip` — the specification plus the pieces worth writing in advance, ready to be opened in Claude Code as a repository root.

```
MoM_Tracker-Dev-Pack/
├─ README.md                 quick start; the five things most likely to be got wrong
├─ CLAUDE.md                 the build contract — Claude Code reads this automatically
├─ docs/00…11                twelve specification documents in reading order
├─ prototype/
│  ├─ UCF-MoM-Tracker-Interactive.html   the visual and behavioural source of truth
│  └─ Sample-MoM-draft.pdf               what the generated document must look like
├─ prisma/schema.prisma      24 models, 16 enums, ready to migrate
├─ packages/shared/src/      capabilities.ts, enums.ts — already written
├─ scripts/                  two CI guards for the database-level invariants
├─ docker-compose.yml        postgres 16 · redis 7 · minio · mailpit
├─ .github/workflows/ci.yml  static → api → e2e, plus advisory a11y
├─ .env.example              every key, safe placeholders
└─ .gitignore
```

The documents: PRD (frozen) · data model · API spec · RBAC · workflows · notifications · UI spec · build plan · test plan · deployment · this handover.

---

## The last change before freeze — Email and WhatsApp share

The closing requirement was share "at each level wherever it is required". It is two layers, not one.

**Automatic — 27 events.** Catalogued in `docs/06-NOTIFICATIONS.md` with recipients and channels fixed per event: `MTG-01…08` (meeting lifecycle), `MOM-01…05` (approval and circulation), `ACT-01…09` (activation, reminders, escalation, confirmation), `CLA-01…03`, `RPT-01…02` (digests and subscriptions). One notification row fans out to one dispatch row per recipient per channel; delivery state, retries and provider ids live on the dispatch.

**Manual — one Share dialog, eight placements.** Meeting detail header · agenda tab · meeting documents · the MoM paper card · the MoM register panel · the item drawer · the register head · project documents · report cards. Channels as three toggles (Email / WhatsApp / in-app); recipients as chips over a **scope-checked** picker — you cannot share with someone you cannot see; attachments with sensible defaults ticked; a note field marked *email only*.

Both feed one **Communication log** (`/communications`) with three tabs: dispatch log, automatic notification rules, WhatsApp templates.

WhatsApp goes through an Indian aggregator (Gupshup as the reference adapter). Four pre-approved templates with positional variables; the 24-hour session window is respected, which is why anything outside it is template-only.

---

## The five rules most likely to be built the ordinary way instead of the right way

1. **Circulation activates items.** An action created while minuting is inert — not assigned, not clocked, not notified. `activatedAt` is null until the signed MoM is circulated, and every dashboard count, reminder and escalation filters on it. Retrofitting this means revisiting every query.
2. **Access is computed, never stored per user.** Capability from the designation, scope from the project mapping, filter in the repository. A missing scope filter is a security bug, not a display bug.
3. **One MoM template, one output.** Screen preview and PDF from the same HTML. Two renderers is how the printed minutes and the on-screen minutes end up disagreeing about what was decided.
4. **Joint ownership is real.** No primary-owner column. Adding one later is a scope change.
5. **Nobody confirms their own work.** Under Review exists for this; the guard is server-side.

---

## Two decisions deferred by the client

Recorded in `docs/01-PRD.md` §9 and marked in the code where they land. Neither blocks any phase.

| # | Decision | What is built instead |
|---|---|---|
| 1 | **Priority routing** — which action priority requires whose confirmation | `resolveConfirmers(action)` returning one default confirmer. Priority is captured and displayed; it does not route. |
| 2 | **Email provider and hosting target** | The adapter interface. `Console` and `Smtp` ship; nothing managed is assumed. |

---

## Out of scope for v1

Deliberately excluded, each with a reason rather than an omission:

- **CSV bulk upload with row-wise validation and downloadable error reports** — Phase 5 of the original brief and the strongest v1.1 candidate. The import buttons exist in the prototype and are inert.
- Bilingual (Telugu / English) interface — strings are externalised so it can follow.
- Native mobile app; the web build is responsive, phone use to be reviewed after pilot.
- Offline field capture.
- Digital signature (DSC / eSign) on the MoM — currently a scanned wet signature.
- Calendar (ICS) integration with Outlook or Google.
- Departmental SSO.

Raise these when pilot feedback arrives; do not build them speculatively.

---

## Build plan at a glance

Eight phases, stable ticket ids, each ending in something demonstrable and a green test run. **27 working days** for one experienced full-stack developer working with Claude Code, excluding the two open decisions and CSV upload.

| Phase | Days | Ends with |
|---|---|---|
| 0 Foundation | 2 | monorepo, migration, seed, CI green |
| 1 Identity and access | 3 | sign in as four designations, watch the app change |
| 2 Masters | 2 | project, ULBs, a document that will not upload without a name |
| 3 Meetings | 5 | both journeys end to end |
| 4 Minutes, items, MoM | 5 | minute → generate → approve → sign → circulate → register lights up |
| 5 Notifications, email, WhatsApp | 4 | dispatch log filling, including a deliberately failing number |
| 6 Dashboard, register, reports | 3 | figures matching the prototype on seed data |
| 7 Hardening and release | 3 | E2E green, load and axe clean, deploy runbook |

**Starting prompt for Claude Code**, after copying the pack in as the repository root:

> Read CLAUDE.md and docs/00-INDEX.md, then implement Phase 0 of docs/08-BUILD-PLAN.md — tickets P0-01 through P0-09. Work one ticket at a time and stop when the phase's "done when" column is satisfied.

Each later phase is one prompt of the same shape.

---

## The seed dataset

`prisma/seed.ts` loads the prototype's data so the built application and the prototype show the same numbers side by side: 3 projects, 6 ULBs, 9 designations, 14 users, 7 meetings across both types and every MoM state, 19 items, 9 documents. **The clock is fixed at 1 September 2026** — keep it, or the ageing and calendar states drift and every screenshot in the documents stops matching.
