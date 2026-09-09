# 03 · API specification

Base `/api/v1`. JSON in, JSON out, `camelCase`. Success `{ "data": … }`, failure `{ "error": { "code", "message", "details"? } }`.

Every endpoint: JWT required unless marked public · capability enforced by guard · project scope enforced in the repository · mutations write an audit row in the same transaction.

Paging: `?page=1&size=25&sort=field:asc`. Responses that page return `{ data, meta: { page, size, total } }`.

---

## Error codes

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | zod DTO rejected; `details` lists field errors |
| 401 | `UNAUTHENTICATED` | missing or expired token |
| 403 | `FORBIDDEN_CAPABILITY` | designation lacks the capability; `details.capability` |
| 403 | `SELF_CONFIRMATION` | an owner tried to confirm their own action |
| 404 | `NOT_FOUND` | absent, **or out of project scope** |
| 409 | `INVALID_TRANSITION` | state machine refused; `details.from`, `details.to` |
| 409 | `AGENDA_FROZEN` | agenda edit after the freeze or after confirmation |
| 409 | `MINUTES_LOCKED` | minutes edit while the MoM is submitted or approved |
| 409 | `MOM_IMMUTABLE` | attempt to change a circulated MoM |
| 422 | `SIGNED_MOM_MISMATCH` | uploaded scan disagrees with the approved draft |
| 422 | `REVISED_DUE_REQUIRED` | carrying an item forward a second time without a new date |
| 429 | `RATE_LIMITED` | |

---

## Auth

| Method | Path | Cap | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password }` → OTP challenge id |
| POST | `/auth/verify-otp` | public | `{ challengeId, otp }` → sets cookies |
| POST | `/auth/refresh` | public | rotation with reuse detection |
| POST | `/auth/logout` | — | revokes the family |
| GET | `/auth/me` | — | user, designation, capability list, project ids |
| GET | `/auth/sessions` · DELETE `/auth/sessions/:id` | — | list and revoke |

## Masters

| Method | Path | Cap |
|---|---|---|
| GET/POST | `/designations` · PATCH/DELETE `/designations/:id` | `manage_masters` (GET: any) |
| PUT | `/designations/:id/capabilities` | `manage_access` |
| GET/POST | `/departments` · PATCH `/departments/:id/retire` | `manage_masters` |
| GET/POST | `/users` · GET/PATCH `/users/:id` | `manage_masters` (GET self: any) |
| PUT | `/users/:id/projects` | `manage_masters` — replaces the mapping |
| POST | `/users/:id/suspend` · `/users/:id/reactivate` | `manage_masters` |
| GET | `/access/matrix` | any |
| GET | `/access/effective/:userId` | any (self), `manage_access` (others) |

## Projects

| Method | Path | Cap |
|---|---|---|
| GET | `/projects` | any · scoped |
| POST | `/projects` · PATCH `/projects/:id` | `manage_masters` |
| GET | `/projects/:id` | any · scoped |
| GET/POST | `/projects/:id/ulbs` · PATCH/DELETE `/projects/:id/ulbs/:ulbId` | `manage_masters` |
| GET | `/projects/:id/officers` | any · scoped |
| GET | `/projects/:id/documents?type=` | any · scoped |
| POST | `/projects/:id/documents` | `manage_project_docs` |

`POST /projects/:id/ulbs` rejects a second `isLead = true` with `VALIDATION_FAILED`.

**Document upload is two steps.** `POST /files` returns `{ fileId, uploadUrl }`; the client PUTs the bytes to object storage; then `POST /…/documents` with `{ name, type, fileId, remarks? }`. **`name`, `type` and `fileId` are all required** — this is the mandatory-name rule, enforced server-side, not only in the form.

## Meetings

| Method | Path | Cap | Notes |
|---|---|---|---|
| GET | `/meetings?type=&category=&projectId=&stage=&q=` | any · scoped | list |
| POST | `/meetings` | `plan_scheduled` \| `plan_instant` | `{ type, … }` → `PLANNED` or `COMPOSED` |
| GET | `/meetings/:id` | any · scoped | full aggregate |
| PATCH | `/meetings/:id` | `plan_*` | details, before `CONFIRMED` |
| POST | `/meetings/:id/launch` | `plan_instant` | instant only → `LIVE`, emits `MTG-02` |
| POST | `/meetings/:id/end` | `plan_instant` | instant only → `HELD` |
| POST | `/meetings/:id/confirm` | `confirm_meeting` | scheduled → `CONFIRMED`, emits `MTG-01` |
| POST | `/meetings/:id/reschedule` | `confirm_meeting` | `{ date, startTime, endTime, reason }` → `MTG-07` |
| POST | `/meetings/:id/cancel` | `confirm_meeting` | `{ reason }` → `MTG-08` |
| GET/POST | `/meetings/:id/agenda-items` | `add_agenda` | `409 AGENDA_FROZEN` after the freeze |
| PATCH/DELETE | `/meetings/:id/agenda-items/:aid` | `add_agenda` | carry block is undeletable |
| POST | `/meetings/:id/agenda-items/:aid/defer` | `add_agenda` | |
| GET | `/meetings/:id/carry-candidates` | `add_agenda` | open items for the covered projects |
| POST | `/meetings/:id/carry` | `add_agenda` | `{ items: [{ itemId, revisedDue? }] }` · `422 REVISED_DUE_REQUIRED` when `carryCount >= 2` |
| GET/PUT | `/meetings/:id/invitees` | `plan_*` | PUT replaces the set |
| PUT | `/meetings/:id/rsvp` | any invitee | own response only |
| PUT | `/meetings/:id/attendance` | `mark_attendance` | `{ marks: { userId: PRESENT\|VIRTUAL\|ABSENT } }` |
| POST | `/meetings/:id/attendance/walk-in` | `mark_attendance` | |
| GET/POST | `/meetings/:id/documents` | any · scoped / `manage_project_docs` | |
| GET | `/meetings/:id/agenda.pdf` | any · scoped | rendered |

## Minutes

| Method | Path | Cap |
|---|---|---|
| GET | `/meetings/:id/minutes` | any · scoped |
| PUT | `/meetings/:id/minutes` | `record_minutes` — `409 MINUTES_LOCKED` when locked |
| GET | `/meetings/:id/minutes/versions` | any · scoped |

`bodyHtml` is sanitised on write with a strict allow-list: `p h3 b i u mark ol ul li br a[href]`. Everything else is stripped, including all styles and classes. This is the paste-from-Word defence and it belongs on the server.

## MoM

| Method | Path | Cap | Effect |
|---|---|---|---|
| GET | `/mom?state=` | any · scoped | the register |
| GET | `/meetings/:id/mom` | any · scoped | |
| POST | `/meetings/:id/mom/generate` | `record_minutes` | → `DRAFT` |
| POST | `/meetings/:id/mom/submit` | `record_minutes` | → `SUBMITTED`, locks minutes, `MOM-01` |
| POST | `/meetings/:id/mom/approve` | `approve_mom` | → `APPROVED`, `MOM-03` |
| POST | `/meetings/:id/mom/return` | `approve_mom` | `{ remark }` required → `RETURNED`, `MOM-02` |
| POST | `/meetings/:id/mom/reject` | `approve_mom` | `{ remark }` required → `DRAFT` |
| POST | `/meetings/:id/mom/sign` | `upload_signed` | `{ fileId }` → `SIGNED`; **activates items**, `ACT-01` + `MOM-05` |
| POST | `/meetings/:id/mom/corrigendum` | `record_minutes` | new MoM row with `correctsMomId` |
| GET | `/meetings/:id/mom.pdf?variant=draft\|signed` | any · scoped | Puppeteer, A4, DRAFT watermark unless signed |
| GET | `/meetings/:id/mom/history` | any · scoped | |

The PDF renderer must consume **the same HTML the UI previews**. One template file, one output. A second renderer is how the printed copy and the screen copy drift apart.

## Items — actions and clarifications

| Method | Path | Cap |
|---|---|---|
| GET | `/items?type=&status=&projectId=&ownerId=&meetingId=&overdue=&q=` | any · scoped |
| POST | `/items` | `create_items` |
| GET | `/items/:id` | any · scoped |
| PATCH | `/items/:id` | `create_items` |
| PUT | `/items/:id/owners` | `create_items` → `ACT-09` |
| POST | `/items/:id/report-complete` | `update_own_item`, owner only → `UNDER_REVIEW`, `ACT-05` |
| POST | `/items/:id/confirm` | `confirm_completion`, non-owner → `COMPLETED`, `ACT-06` |
| POST | `/items/:id/send-back` | `confirm_completion` | `{ reason }` → `IN_PROGRESS`, `ACT-07` |
| POST | `/items/:id/reopen` | `confirm_completion` | `{ reason }` |
| POST | `/items/:id/respond` | `respond_clarification` → `RESPONDED`, `CLA-02` |
| POST | `/items/:id/close` | raiser or `create_items` → `CLOSED` |
| POST | `/items/:id/updates` | `update_own_item` | note + optional evidence file |
| GET | `/items/export.csv` | any · scoped |

`POST /items` body:

```jsonc
{
  "type": "ACTION",              // or CLARIFICATION
  "meetingId": "…",
  "projectId": "…",
  "agendaItemId": "…",           // optional
  "description": "…",            // required
  "raisedById": "…",             // required
  "remarks": "…",
  // ACTION only
  "ownerIds": ["…", "…"],        // required, min 1 — all jointly accountable
  "dueDate": "2026-09-25",       // required
  "priority": "HIGH",
  // CLARIFICATION only
  "respondedById": "…"           // optional while OPEN
}
```

Validation is discriminated on `type`: an action without owners or a due date is `VALIDATION_FAILED`; a clarification carrying `ownerIds`, `dueDate` or `priority` is likewise rejected rather than silently ignored.

## Notifications and share

| Method | Path | Cap |
|---|---|---|
| GET | `/notifications?subjectType=&subjectId=` | any · scoped |
| GET | `/notifications/log` | `view_all_projects` |
| GET | `/notifications/inbox` · POST `/notifications/:id/read` | own |
| POST | `/share` | `share_object` |
| GET/PUT | `/notifications/preferences` | own |
| POST | `/webhooks/whatsapp` · `/webhooks/email` | public, HMAC-verified |

`POST /share`:

```jsonc
{
  "subjectType": "MOM",                      // MEETING | MOM | ITEM | PROJECT | REPORT
  "subjectId": "…",
  "recipientIds": ["…"],                     // must all be within the sharer's scope
  "channels": ["EMAIL", "WHATSAPP"],
  "attachmentFileIds": ["…"],
  "subject": "…",
  "note": "…",                               // email body only
  "templateKey": "ucf_mom_circulated"
}
```

## Reports

| Method | Path |
|---|---|
| GET | `/reports/action-taken?from=&to=&projectId=` |
| GET | `/reports/meeting-register` |
| GET | `/reports/pending-approvals` |
| GET | `/reports/officer-performance` |
| GET | `/reports/clarification-log` |
| GET | `/reports/project-status` |

Each accepts `?format=json\|csv\|pdf`, is project-scoped, and can be subscribed to (`POST /reports/:key/subscribe`) for `RPT-02`.

## Dashboard

`GET /dashboard` returns, all scoped: meetings conducted with the this-year / instant / pipeline split, open and overdue action counts, unclosed clarification count, the action-status and clarification-status distributions for the two pies, the attention list for the caller's designation, and calendar events for a month window (`?month=2026-09`).

## Audit

`GET /audit?objectType=&objectId=&actorId=&from=&to=` — read-only, paged. There is no POST, PATCH or DELETE. Ever.
