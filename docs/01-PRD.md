# 01 · Product requirements — FROZEN

Frozen 9 September 2026. Changes require an explicit decision recorded in §9.

## 1 · The problem

The Urban Challenge Fund runs review meetings across three projects and several agencies. Today the minutes are Word files on email. Nobody can answer, at any moment, *what was committed, by whom, by when, and is it done*. Commitments made in a meeting are rediscovered — or not — in the next one.

## 2 · The one-line objective

> After every meeting, each commitment is written down with named officers and a date, and tracked until a senior officer agrees it is done.

## 3 · Users

| Designation | Who | What they do here |
|---|---|---|
| Mission Director / Addl. MD | Head of mission | Approve MoMs, confirm completions, watch everything |
| CDMA | Directorate | Oversight, read across all projects |
| Project Director | Project management | Confirm completions, record minutes on their projects |
| PDMC | Programme management consultant | Plan and run meetings across all projects |
| Meeting Coordinator | NIUM / TUFIDC / CDMA-EAP | Plan, confirm, minute, circulate — the operational centre |
| ULB Nodal Officer | Field / implementing agency | Update items assigned to them, respond to clarifications |
| System Administrator | IT | Master data and access control |
| External invitee | Bankers, corporation engineers | Receive notifications, be named in attendance. No login |

## 4 · Scope — the ten modules

1. **Meeting planning** — instant and scheduled, reschedule, cancel
2. **Agenda management** — draft, invitee contributions, freeze, defer, carry forward, attachments
3. **Meeting conduct** — attendance as Present / Virtual / Absent, walk-ins
4. **Minutes** — full rich-text editor, versioned, server-sanitised
5. **Actions and clarifications** — one typed form, two shapes
6. **MoM lifecycle** — generate, submit, approve or return or reject, sign, circulate
7. **Register** — actions and clarifications with filters, ageing, export
8. **Project master** — project info, officers, ULBs, documents
9. **Access control** — designation × capability, project scoping
10. **Communications** — 27 automatic notifications plus manual share on Email, WhatsApp and in-app

## 5 · The behaviour that defines the product

These are not preferences. They are the reason the system exists.

1. **Two meeting journeys.** *Instant*: the coordinator does everything in one pass and launches — no circulation window, and the meeting is stamped "Instant" forever so a reader knows the agenda was never seen in advance. *Scheduled*: plan → agenda → invitees → invitee contributions until the freeze → coordinator confirms. **Confirmation is the coordinator's; there is no executive gate on a meeting.**
2. **One typed entry form.** A dropdown selects Action or Clarification and the form changes. Action: description, raised by, **responsible persons (multi-select)**, due date, priority, status, remarks. Clarification: description, raised by, responded by, status, remarks.
3. **Joint ownership.** Where several officers are named on an action, all are **equally accountable**. Any one may report it complete; reminders go to all; the confirmation applies to the item.
4. **Two status vocabularies.** Actions run In Progress → Under Review → Completed, with Delayed set automatically when a deadline passes. Clarifications run Open → Responded → Closed. They are deliberately different so the two dashboard charts read side by side.
5. **Nobody confirms their own work.** Under Review exists for exactly this reason.
6. **Circulation activates.** An action created in the minutes is inert until the signed MoM is circulated. Then, and only then, it is assigned, notified and clocked.
7. **Carry-forward.** A new meeting opens with the previous cycle's open actions *and* unclosed clarifications as agenda item 0, with live status. Carrying an item a second time requires a revised due date.
8. **Access is computed** from designation and project mapping. Never assigned per user.
9. **Everything is provable.** Append-only audit; a dispatch record for every message sent.
10. **Share anywhere.** Email / WhatsApp / in-app share on meetings, agendas, MoMs, actions, clarifications, project documents and reports — on top of the automatic notifications.

## 6 · The MoM document

A4, portrait, printable to PDF, generated from recorded data only — nothing retyped.

**Header:** state emblem, "Urban Challenge Fund", "Minutes of Meeting", reference code, version, date.
**Meta block, in this order:** Meeting · Date · Time · Chairperson · Venue · Type of meeting · Projects.
**Watermark:** diagonal **DRAFT** on every page until the signed copy is uploaded; **APPROVED** between approval and signature; none on the signed copy.
**Sections:** 1 Attendance · 2 Agenda as taken · 3 Review of carried-forward items (only when there are any) · 4 Discussion and decisions · 5 Action items arising · 6 Clarifications and additional points · 7 Circulation and next review.
**The action table carries:** ID, Action, **Raised by**, Responsible officer(s), Due date, Priority, Status, Remarks.
**The clarification table carries:** ID, Clarification, **Raised by**, Responded by, Status, Remarks.
**Footer:** signature blocks for the chairperson and the coordinator; reference, generation stamp, and "not valid until signed" while in draft.

## 7 · Dashboard

In this order: **hero cards led by meetings conducted**; **actions by status** as a donut; **clarifications by status** as a donut; a **calendar** that steps months and opens meetings, colour-coded conducted / upcoming / planning / instant, with pipeline and recently-held lists. A role-aware attention list sits alongside. Every figure is project-scoped.

## 8 · Non-functional

| | Requirement |
|---|---|
| Performance | Register p95 under 500 ms at 50,000 items; dashboard under 800 ms |
| Concurrency | 200 concurrent users |
| Availability | 99.5% in office hours |
| Retention | Audit and MoMs 7 years; in-app notifications 90 days |
| Security | OWASP Top 10; OTP on login; no secrets in the repo; uploads type- and size-checked |
| Accessibility | WCAG 2.1 AA on the main flows |
| Browsers | Chrome, Edge, Firefox, Safari — current and previous |
| Responsive | Usable from 1280 px down to a tablet; phone reviewed after pilot |
| Localisation | English at v1; string-externalised so Telugu can follow |

## 9 · Open decisions

| # | Decision | Status | Consequence while open |
|---|---|---|---|
| 1 | **Priority routing** — which action priority requires whose confirmation | Open, deferred by the client | `resolveConfirmers()` returns a single default confirmer for every priority. Priority is captured and displayed but does not route. |
| 2 | **Email provider and hosting target** | Open | Adapter interface with console and SMTP implementations; nothing managed assumed |

## 10 · Out of scope for v1

CSV bulk upload with row-wise validation and downloadable error reports · bilingual interface · native mobile app · offline field capture · digital signature (DSC/eSign) · calendar (ICS) integration · departmental SSO.

The CSV upload was Phase 5 of the original brief and is the most likely v1.1 candidate; the import buttons already exist in the UI and are inert.
