# 06 · Notifications, Email and WhatsApp

Every message the platform sends. Two kinds:

- **Automatic** — fired by a state change or a scheduled job. Twenty-seven events, table below.
- **Manual share** — an officer presses **Share** on a meeting, agenda, MoM, action, clarification, project document set or report and pushes it to chosen people on chosen channels.

Both go through the same pipeline and both are logged. In the prototype, open **Communication log** in the left navigation: the *Dispatch log* tab is the record, *Automatic notifications* is the table below, *WhatsApp templates* is the template set.

---

## 1 · Architecture

```
domain event ──▶ NotificationService.emit(eventCode, subject, recipients, payload)
                        │
                        ├── writes  notifications  (1 row)
                        ├── writes  dispatches     (1 row per recipient × channel)
                        └── enqueues BullMQ job "dispatch" per row
                                     │
                                     ├── EmailProvider.send(...)     ← adapter
                                     ├── WhatsAppProvider.send(...)  ← adapter
                                     └── InAppProvider.send(...)     ← writes to the bell
                                              │
                                     provider webhook ──▶ dispatch.state
```

`NotificationService.emit` is the **only** way anything leaves the system. No module calls a provider directly.

### Adapter interfaces

`apps/api/src/modules/notifications/providers/`

```ts
export interface EmailProvider {
  send(msg: {
    to: string; subject: string; html: string; text: string;
    attachments?: { filename: string; fileId: string }[];
    idempotencyKey: string;
  }): Promise<{ providerMsgId: string }>;
}

export interface WhatsAppProvider {
  /** Template messages only outside a 24-hour session window. */
  sendTemplate(msg: {
    to: string;                 // E.164, no '+'
    templateKey: string;        // must exist in whatsapp-templates.ts
    variables: string[];        // positional, {{1}}…{{n}}
    mediaFileId?: string;       // document header
    idempotencyKey: string;
  }): Promise<{ providerMsgId: string }>;
}
```

**Implement three adapters for each:** `Console` (dev, logs to stdout and to the dispatch table), `Smtp` / `Gupshup` (real), and `Failing` (test fixtures). Choose by `EMAIL_PROVIDER` / `WHATSAPP_PROVIDER` env vars. **The email provider and the hosting target are not yet decided — build the interface, ship the console and SMTP adapters, and stop there.**

### WhatsApp provider — Indian aggregator

The chosen route is an Indian aggregator (Gupshup, Karix or Kaleyra). They differ only in the HTTP envelope. Write `GupshupWhatsAppProvider` as the reference implementation and keep every aggregator-specific field behind the adapter. Expect from any of them:

- template registration ahead of time, with a category (`UTILITY` for all of ours) and approval lag of one to three days;
- positional variables `{{1}}…{{n}}` — no named variables;
- a document header for PDF attachments, capped around 100 MB but practically keep MoMs under 5 MB;
- a delivery webhook posting `sent / delivered / read / failed` against the provider message id;
- per-second throughput limits — the queue must rate-limit, not the caller.

### Rules

1. **Idempotency.** `idempotencyKey = sha256(eventCode + subjectId + recipientId + channel + payloadHash)`. A retried job must never double-send.
2. **Retry.** Three attempts, exponential backoff 1 min / 5 min / 30 min. After the third, `state = FAILED` and the row is flagged in the log.
3. **Quiet hours.** Non-urgent WhatsApp is held between 21:00 and 07:00 IST and released at 07:00. Urgent (`MTG-02`, `MTG-06`, `ACT-08`) ignores quiet hours.
4. **Preference respected.** A user may switch off WhatsApp for reminder-class events. Approval, assignment and circulation events cannot be switched off.
5. **Invite-only users** (no login) get email and WhatsApp, never in-app.
6. **Scope.** Recipients are resolved from the domain object, never from a free-form list, except on a manual share.
7. Every dispatch row records the **rendered payload hash**, so what was sent is reconstructible after a template changes.

---

## 2 · Automatic notification catalogue

| Code | Event | Trigger | Recipients | Channels | Template | Attachment |
|---|---|---|---|---|---|---|
| MTG-01 | Scheduled meeting confirmed | Coordinator confirms | All invitees | Email + WhatsApp + in-app | `ucf_meeting_invite` | Agenda PDF |
| MTG-02 | Instant meeting launched | Coordinator launches | All invitees | Email + WhatsApp + in-app | `ucf_meeting_invite` | — |
| MTG-03 | Agenda circulated for contributions | Stage → INVITEE_INPUTS | All invitees | Email + in-app | `ucf_generic_share` | Draft agenda PDF |
| MTG-04 | Agenda freeze in 24 hours | Cron, hourly | Invitees who have not contributed | WhatsApp + in-app | `ucf_generic_share` | — |
| MTG-05 | Reminder T−24 hours | Cron, hourly | All invitees | Email + WhatsApp | `ucf_meeting_invite` | Agenda PDF |
| MTG-06 | Reminder T−2 hours | Cron, every 15 min | All invitees | WhatsApp + in-app | `ucf_meeting_invite` | — |
| MTG-07 | Meeting rescheduled | Date or time changed after CONFIRMED | All invitees | Email + WhatsApp + in-app | `ucf_meeting_invite` | — |
| MTG-08 | Meeting cancelled | Stage → CANCELLED | All invitees | Email + WhatsApp + in-app | `ucf_generic_share` | — |
| MOM-01 | MoM submitted for approval | State → SUBMITTED | Officers holding `approve_mom` in scope | Email + in-app | `ucf_generic_share` | Draft MoM PDF |
| MOM-02 | MoM returned for correction | State → RETURNED | Meeting Coordinator | Email + in-app | `ucf_generic_share` | — |
| MOM-03 | MoM approved | State → APPROVED | Meeting Coordinator | Email + in-app | `ucf_generic_share` | — |
| MOM-04 | Approval pending beyond SLA | Cron daily, 09:00 | Approver, copy to PDMC | Email + WhatsApp | `ucf_generic_share` | — |
| MOM-05 | Signed MoM circulated | State → SIGNED | All invitees + standing recipients | Email + WhatsApp + in-app | `ucf_mom_circulated` | Signed MoM PDF |
| ACT-01 | Action assigned | MoM circulated ⇒ item activated | Every responsible officer | Email + WhatsApp + in-app | `ucf_action_assigned` | — |
| ACT-02 | Due in 3 days | Cron daily, 09:00 | Every responsible officer | WhatsApp + in-app | `ucf_action_assigned` | — |
| ACT-03 | Due today | Cron daily, 09:00 | Every responsible officer | WhatsApp + in-app | `ucf_action_assigned` | — |
| ACT-04 | Overdue | Cron nightly, 00:05, on status → DELAYED | Responsible officers, copy to Coordinator | Email + WhatsApp | `ucf_action_assigned` | — |
| ACT-05 | Reported complete | Status → UNDER_REVIEW | Confirming authority | Email + in-app | `ucf_generic_share` | — |
| ACT-06 | Confirmed as completed | Status → COMPLETED | Responsible officers, raiser | Email + in-app | `ucf_generic_share` | — |
| ACT-07 | Sent back — not done | UNDER_REVIEW → IN_PROGRESS | Responsible officers | Email + WhatsApp + in-app | `ucf_generic_share` | — |
| ACT-08 | Escalation — 15 days overdue | Cron nightly | Project Director, then Mission Director at 30 days | Email + WhatsApp | `ucf_generic_share` | — |
| ACT-09 | Reassigned | Owner set changed | Removed and added officers | Email + in-app | `ucf_generic_share` | — |
| CLA-01 | Clarification raised and assigned | `respondedById` set while OPEN | Nominated responder | Email + in-app | `ucf_generic_share` | — |
| CLA-02 | Response recorded | Status → RESPONDED | Officer who raised it | Email + in-app | `ucf_generic_share` | — |
| CLA-03 | Open beyond 14 days | Cron daily | Responder, copy to Coordinator | WhatsApp + in-app | `ucf_generic_share` | — |
| RPT-01 | Weekly digest | Cron, Monday 08:00 | Mission Director, AMD, PDMC | Email | `ucf_generic_share` | Action Taken Report PDF |
| RPT-02 | Scheduled report subscription | Per subscription | Subscribers | Email | `ucf_generic_share` | Report PDF/CSV |

---

## 3 · Manual share

A **Share** control appears at every level. It opens one dialog: channels, recipients, attachments, subject, template, body, optional free-text note.

| Where | `subjectType` | Default recipients | Default attachments |
|---|---|---|---|
| Meeting detail header | MEETING | All invitees | — |
| Meeting → Agenda tab | MEETING | All invitees | Agenda PDF |
| Meeting → Documents tab | MEETING | All invitees | Selected documents |
| Meeting → Signed MoM tab, and the MoM register | MOM | All invitees | Draft or signed MoM PDF |
| Action / clarification drawer | ITEM | Owners + raiser (+ responder) | Evidence files |
| Register page header | REPORT | Chosen | Register export |
| Project → Documents tab | PROJECT | Mapped officers | Selected documents |
| Reports — each report card | REPORT | Chosen | Report PDF/CSV |

Rules specific to manual share:

- Recipients start from the object and are then editable. **Only users the sharer can see** may be added — the picker is project-scoped like everything else.
- The free-text note goes into the **email body only**. WhatsApp cannot carry it outside a session window, so it is silently dropped there and the dialog says so.
- Manual shares are logged with `eventCode = 'MANUAL'` and the sharer as `triggeredById`.
- Sharing is a capability (`share_object`) held by every designation except `EXT`.

---

## 4 · WhatsApp templates

Four templates cover everything. Register these with the aggregator before go-live; approval takes days, so do it in week one.

### `ucf_meeting_invite` — UTILITY
```
UCF Review Meeting — {{1}}

{{2}}
🗓 {{3}}
📍 {{4}}
Chair: {{5}}

Agenda attached. Please confirm your attendance.
```
`{{1}}` meeting code · `{{2}}` title · `{{3}}` date and time · `{{4}}` venue · `{{5}}` chair. Optional document header: agenda PDF.

### `ucf_mom_circulated` — UTILITY
```
Minutes of Meeting — {{1}}

{{2}} held on {{3}} has been signed and circulated.
{{4}} action items are now live against your name.

Signed MoM attached.
```
`{{1}}` meeting code · `{{2}}` title · `{{3}}` date · `{{4}}` count of the recipient's own actions. Document header: signed MoM PDF.

### `ucf_action_assigned` — UTILITY
```
UCF Action {{1}}

{{2}}

Due: {{3}}
Priority: {{4}}
From: {{5}}

Update at {{6}}
```
`{{1}}` action ref · `{{2}}` description, truncated to 180 characters · `{{3}}` due date · `{{4}}` priority · `{{5}}` meeting code · `{{6}}` deep link.

### `ucf_generic_share` — UTILITY
```
UCF Tracker — {{1}}

{{2}} has shared {{3}} with you.

Open: {{4}}
```
`{{1}}` subject · `{{2}}` sender or "The UCF Tracker" for system events · `{{3}}` object description · `{{4}}` deep link.

---

## 5 · Email

- One responsive HTML layout, `apps/api/src/modules/notifications/templates/layout.hbs`, with the UCF header, the same navy and orange as the product, and a plain-text alternative generated from the same data (never stripped from the HTML).
- Subject convention: `[UCF] <object ref> — <event>`, e.g. `[UCF] UCF/P1/RM-04 — Minutes of Meeting circulated`.
- `List-Unsubscribe` is **not** set: these are official communications, not marketing.
- Attachments are streamed from object storage at send time; never inlined as base64 in the queue payload.
- Bounce and complaint webhooks map to `dispatch.state = FAILED` with the reason in `lastError`.

## 6 · In-app

A bell in the top bar with an unread count. Rows link straight to the object. Marked read on click. Retained ninety days, then pruned — the audit trail is the permanent record, not the bell.

## 7 · Environment

```
EMAIL_PROVIDER=console          # console | smtp
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="UCF Tracker <no-reply@example.gov.in>"

WHATSAPP_PROVIDER=console       # console | gupshup
WA_API_KEY=
WA_SOURCE_NUMBER=
WA_APP_NAME=
WA_WEBHOOK_SECRET=

NOTIFY_QUIET_START=21:00
NOTIFY_QUIET_END=07:00
NOTIFY_TZ=Asia/Kolkata
```

## 8 · Acceptance

- Confirming a scheduled meeting produces exactly `invitees × selected channels` dispatch rows and no more, even if the confirm button is double-clicked.
- Circulating a signed MoM activates every action in that meeting **and** emits `ACT-01` once per responsible officer.
- A failed WhatsApp number retries twice, then shows as failed in the log with the provider error, and does not block the other recipients.
- Switching off WhatsApp reminders in preferences suppresses `ACT-02` and `ACT-03` but not `ACT-01` or `MOM-05`.
- Every row in the dispatch log names its event code, template, channel, recipient and state.
