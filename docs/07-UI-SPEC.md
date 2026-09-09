# 07 · UI specification

`prototype/UCF-MoM-Tracker-Interactive.html` is the reference. Open it before building any screen. This document maps it to routes and names the rules that are not obvious from looking.

## Design tokens

Lift these verbatim into `apps/web/src/styles/tokens.css`. Do not add new ones without a reason.

```css
--navy:#1D3557;  --navy-d:#13233D; --blue:#2E5FA3;  --steel:#5E7DAA;
--accent:#D9772B; --accent-d:#B25E1B;
--bg:#F3F6FA;    --card:#FFFFFF;   --ink:#1E2733;   --muted:#64707F;
--line:#DCE4EE;  --ice:#EAF1F9;    --ice2:#D8E4F2;
--ok:#1B8A57;    --warn:#B07A0C;   --danger:#BF3B2B; --review:#7D3C98;
--radius:12px;   --shadow:0 2px 10px rgba(29,53,87,.08);
--serif:"Bitter",Georgia,serif;    --sans:"Public Sans",system-ui,sans-serif;
```

Body 14px / 1.55. Page titles 23px Bitter 600 in navy. Card headers 14.5px 700. Table headers 10.5px uppercase, letter-spacing .4px, muted, on `#F9FBFD`.

Chart colours — already validated for colour-blind safety, do not substitute:
actions `In Progress #D9990B · Delayed #BF3B2B · Under Review #7D3C98 · Completed #1B8A57`;
clarifications `Open #D9772B · Responded #2E5FA3 · Closed #1B8A57`;
projects `P1 #2E5FA3 · P2 #D9772B · P3 #B2427A`.

## Routes

| Route | Screen | Capability |
|---|---|---|
| `/login` | Sign in, OTP | public |
| `/` | Dashboard | any |
| `/meetings` | Meetings list | any · scoped |
| `/meetings/new` | Type chooser → instant composer or scheduled wizard | `plan_*` |
| `/meetings/[id]?tab=agenda\|attendance\|items\|documents\|mom` | Meeting detail, five tabs | any · scoped |
| `/minutes?meeting=[id]` | Minutes editor | `record_minutes` to write |
| `/mom?state=` | MoM register with state tabs | any · scoped |
| `/register` | Actions and clarifications | any · scoped |
| `/register/[id]` | Item drawer, deep-linkable | any · scoped |
| `/projects` · `/projects/[id]?tab=info\|officers\|ulb\|documents` | Project master | any · scoped |
| `/people` | People, designations, departments | any read, `manage_masters` write |
| `/access` | Designation × capability matrix | `manage_access` |
| `/reports` | Six reports | any · scoped |
| `/communications?tab=log\|rules\|templates` | Communication log | any own, `view_all_projects` for all |
| `/audit` | Audit trail | any · scoped |
| `/help` | How it works | any |

Tab and filter state lives in the URL. A meeting tab, a register filter and a MoM state must all survive a copy-paste of the address.

## Component inventory

Build these once, in `apps/web/src/components/`, and use them everywhere:

`AppShell` · `Sidebar` (capability-aware, locked items disabled not hidden) · `TopBar` (breadcrumb, signed-in chip, bell) · `PageHead` · `Card` · `KpiTile` (variants default / hot / warn / good / review / lead) · `StatusChip` · `PriorityChip` · `TypePill` (Action / Clarification, Instant / Scheduled) · `ProjectTag` · `Avatar` · `OwnerStack` · `DataTable` (sortable, paged, empty state) · `FilterBar` · `Tabs` · `Stepper` · `Timeline` · `Donut` + `Legend` · `Bars` · `Notice` (info / amber / red / green / violet) · `Modal` · `Drawer` · `Toast` · `RichTextEditor` · `MultiSelectOfficers` · `FileDrop` · `Calendar` · `ShareDialog` · `MomDocument`.

`MomDocument` is used by three surfaces — the meeting tab, the MoM register preview and the PDF renderer. **One component, one output.** If the printed copy and the screen copy ever come from different code, they will drift.

## Rules that are not obvious from the prototype

1. **Locked, not hidden.** A navigation item or button the signed-in designation cannot use renders disabled with a tooltip naming the reason. Hiding it makes the product feel broken; disabling it teaches the model.
2. **Empty states say what to do**, never "No data". The prototype's wording is the standard.
3. **Destructive and gate actions confirm**, and returning or rejecting requires a remark before the button enables.
4. **Optimistic updates only where the server cannot refuse** — status changes and approvals wait for the response, because a rolled-back approval that flashed green is worse than a slow one.
5. **Focus survives re-render.** The prototype restores focus and caret after every render; keep that behaviour in the React build or typing in a filter becomes impossible.
6. **The DRAFT watermark is `position: fixed` in print** so it lands on every page, with `print-color-adjust: exact`.
7. **Tables scroll inside their own container.** The page body never scrolls horizontally.
8. **Dates display as `27 Aug 2026`**, never ISO, never `27/08/2026`. Times as `11:00 – 12:30 hrs`.
9. **Money as `₹ 120.00 cr`.**
10. **Ageing is words, not numbers alone**: "7 days late", "due in 6 days", "due today".

## Share dialog

One component, eight placements (see `docs/06-NOTIFICATIONS.md` §3). Channels as three toggle cards; recipients as removable chips over a scoped picker; attachments listed with the object's defaults ticked; subject, WhatsApp template selector, body, and a free-text note labelled *email only*. The send button names the count: "Send to 7 recipients".

## Responsive

Sidebar collapses below 820 px behind a hamburger. KPI grid 4 → 2 → 1. Two-column layouts stack at 1080 px. Tables become horizontally scrollable cards. The A4 MoM document keeps its width and scrolls inside its wrapper — never reflow it, because it must match the print output.

## Accessibility

Every interactive element reachable by keyboard in a sensible order; visible focus ring (`2px solid var(--accent)`); every icon-only button labelled; status conveyed by text as well as colour; charts have a table alternative; live regions announce toasts.
