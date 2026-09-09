# 09 · Test plan

Three layers. A phase is not done until its layer is green.

| Layer | Tool | Covers | Target |
|---|---|---|---|
| Unit | Vitest | State machines, policies, scoping, validators, template rendering | 85% on `src/modules/*/[!.]*.service.ts` and every `*.policy.ts` |
| API | Supertest against a throwaway Postgres | Every endpoint, both the allowed and the denied path | 100% of routes |
| E2E | Playwright | Six journeys below | green in CI |

## Must-pass assertions

These encode the rules that make the product what it is. If one of them regresses, the release stops.

**Access**
1. A Meeting Coordinator mapped only to Project 1 gets `404` on a Project 2 meeting id and zero Project 2 rows in every list endpoint.
2. Removing a capability from a designation revokes it on the very next request, with no logout.
3. The Share recipient picker returns no officer outside the sharer's projects.
4. Scope failures return `404`, never `403` — ids must not be probeable.

**Items**
5. An action without owners, or without a due date, is rejected.
6. A clarification carrying owners, a due date or a priority is rejected, not silently ignored.
7. An owner cannot confirm their own action — `403 SELF_CONFIRMATION`.
8. Any one of several joint owners can report complete, and the confirmation applies to the item as a whole.
9. An item is inert before `activatedAt`: no status transitions, no notifications.
10. An `UNDER_REVIEW` item that passes its due date keeps that status and reports as overdue.

**Meetings and MoM**
11. Every transition in `docs/05-WORKFLOWS.md` succeeds; every transition not listed returns `409 INVALID_TRANSITION`.
12. An agenda POST after the freeze returns `409 AGENDA_FROZEN`.
13. Submitting a MoM locks the minutes; a subsequent PUT returns `409 MINUTES_LOCKED`.
14. Circulating a signed MoM activates every item in that meeting and emits `ACT-01` once per responsible officer — asserted by counting dispatch rows.
15. A circulated MoM cannot be mutated; a correction creates a linked corrigendum.
16. Carrying an item forward a second time without a revised due date returns `422`.

**Notifications**
17. Confirming a meeting twice in quick succession produces one set of dispatches, not two.
18. A failing WhatsApp number retries twice, ends `FAILED` with the provider error, and does not block other recipients.
19. Suppressing WhatsApp reminders stops `ACT-02` and `ACT-03` but not `ACT-01` or `MOM-05`.
20. Every one of the 27 events has a test asserting its recipient set and channel set.

**Document**
21. The generated MoM PDF has: the seven-field header block in order; a DRAFT watermark on every page while unsigned and none when signed; a *Raised by* column in both the action and clarification tables; both signature blocks.
22. A document upload missing a name, a type or a file is rejected.

**Audit**
23. Every mutating endpoint writes exactly one audit row, in the same transaction.
24. UPDATE and DELETE on `audit_entries` change nothing.

## E2E journeys

1. **Instant meeting, end to end** — compose, launch, verify notifications, end, attendance, minutes, one action with two owners, generate, submit, approve, sign, circulate, confirm the action live in the register.
2. **Scheduled meeting with carry-forward** — plan, agenda, carry two open items, invitees, freeze, confirm, and check agenda item 0 in the generated MoM.
3. **Action ladder with joint owners** — owner A reports complete, owner B sees it under review, a confirmer confirms, register and dashboard both update.
4. **Clarification ladder** — raise, assign, respond, close.
5. **Scoped role walk** — sign in as a ULB Nodal Officer and assert the navigation, the register contents and the disabled buttons.
6. **Share** — share a MoM to three people on two channels and find three notification rows and six dispatch rows in the log.

## Performance

Seed 50,000 items, 2,000 meetings, 200 users. Register p95 under 500 ms with five filters applied; dashboard under 800 ms; MoM PDF under 3 s. Run under 200 concurrent virtual users with k6.

## Security

OWASP ASVS L2 checklist. Automated: dependency audit in CI, ZAP baseline against a running stack, SQL-injection and XSS suites on every text input, upload fuzzing with mismatched magic bytes. Manual before go-live: authorisation matrix walk, session fixation, IDOR probe across every `:id` route.
