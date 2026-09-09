# 04 · Access control

Access is **computed from two dimensions and never assigned by hand**:

- **Designation** decides *what a person may do* — a capability set attached to the designation, not the user.
- **Project mapping** decides *which data those powers reach* — rows in `project_members`, or `seesAllProjects = true`.

Effective access is the intersection. There is no per-user permission table and no override column. If someone needs different powers, they get a different designation.

---

## 1 · Capabilities

Sixteen keys, in `packages/shared/src/capabilities.ts`:

| Key | Meaning |
|---|---|
| `plan_instant` | Create and launch an instant meeting |
| `plan_scheduled` | Create a scheduled meeting |
| `add_agenda` | Add agenda points |
| `confirm_meeting` | Confirm a scheduled meeting, reschedule, cancel |
| `mark_attendance` | Record attendance |
| `record_minutes` | Write minutes, generate and submit a MoM |
| `create_items` | Create and edit actions and clarifications |
| `update_own_item` | Update an item I am an owner of |
| `respond_clarification` | Record a response on a clarification |
| `confirm_completion` | Confirm an action as completed, send it back, reopen it |
| `approve_mom` | Approve, return or reject a MoM |
| `upload_signed` | Upload the signed MoM and circulate |
| `manage_project_docs` | Add and retire project documents |
| `manage_masters` | Projects, ULBs, users, designations, departments |
| `manage_access` | Edit the designation × capability matrix |
| `view_all_projects` | See every project regardless of mapping |
| `share_object` | Use the Share control (held by all but `EXT`) |

## 2 · Designation × capability

| Capability | MD | AMD | CDMA | PD | PDMC | MC | ULB | SYS | EXT |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| plan_instant | | | | | ✓ | ✓ | | | |
| plan_scheduled | | | | | ✓ | ✓ | | | |
| add_agenda | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | | |
| confirm_meeting | | | | | ✓ | ✓ | | | |
| mark_attendance | | | | | ✓ | ✓ | | | |
| record_minutes | | | | ✓ | ✓ | ✓ | | | |
| create_items | | | | ✓ | ✓ | ✓ | | | |
| update_own_item | | | | ✓ | ✓ | ✓ | ✓ | | |
| respond_clarification | | | | ✓ | ✓ | ✓ | ✓ | | |
| confirm_completion | ✓ | ✓ | | ✓ | ✓ | | | | |
| approve_mom | ✓ | ✓ | | | | | | | |
| upload_signed | | | | | ✓ | ✓ | | | |
| manage_project_docs | | | | ✓ | ✓ | ✓ | | | |
| manage_masters | | | | | | | | ✓ | |
| manage_access | | | | | | | | ✓ | |
| view_all_projects | ✓ | ✓ | ✓ | | ✓ | | | ✓ | |
| share_object | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |

MD Mission Director · AMD Additional Mission Director · CDMA · PD Project Director · PDMC · MC Meeting Coordinator · ULB ULB Nodal Officer · SYS System Administrator · EXT External invitee.

This table is data, not code: it seeds `designations.caps` and is editable at runtime by a holder of `manage_access`. Changing a row changes it for everyone holding that designation, immediately, and writes an audit entry.

## 3 · Project scoping

Enforced in the **repository layer**, not the controller and never the UI.

```ts
// apps/api/src/common/scope.ts
export function projectScope(user: AuthUser): Prisma.ProjectWhereInput | undefined {
  if (user.caps.includes('view_all_projects')) return undefined;      // no filter
  return { id: { in: user.projectIds } };
}
```

Every finder takes the scope. A repository method that can return rows outside the caller's projects is a security defect — write a test for each one.

| Entity | Scoped by |
|---|---|
| Project | `id in user.projectIds` |
| Meeting | at least one of `meeting_projects.project_id` in scope |
| Item | `project_id` in scope |
| Document | parent project or meeting in scope |
| Notification / Dispatch | `recipient_id = user.id`, or `view_all_projects` for the log |
| Audit | object's project in scope; `SYS` sees all |
| User picker | users mapped to a project in scope, plus `seesAllProjects` users |

The last row matters for the Share dialog: **you cannot share with someone you cannot see.**

## 4 · Object-level rules on top of scope

Capability and scope are necessary but not sufficient. These extra guards live in the services:

- `update_own_item` applies **only** where `user.id ∈ item.owners`. Being a coordinator on the project does not make an item yours.
- `confirm_completion` requires `user.id ∉ item.owners` — nobody confirms their own work.
- `approve_mom` cannot be exercised by the officer who submitted it.
- `record_minutes` is refused once `minutes.lockedAt` is set.
- `add_agenda` is refused after `agendaFreezeAt` for anyone but the coordinator, and after `CONFIRMED` for everyone.
- Invite-only accounts (`accountState = INVITE_ONLY`, `passwordHash = null`) cannot authenticate at all; they exist to receive notifications and be named in attendance.

## 5 · Implementation

```ts
@UseGuards(JwtAuthGuard, CapabilityGuard)
@RequireCapability('confirm_meeting')
@Post(':id/confirm')
confirm(@Param('id') id: string, @CurrentUser() user: AuthUser) { … }
```

- `JwtAuthGuard` resolves the user, their designation's capability array and their project ids **on every request** from the database, not from the token. A designation edited at 10:00 takes effect at 10:00, not at the next login.
- `CapabilityGuard` reads `@RequireCapability` and returns `403 FORBIDDEN_CAPABILITY` with the missing key.
- Scope failures return `404 NOT_FOUND`, never `403` — an officer must not be able to discover that a record exists outside their projects by probing ids.

## 6 · Authentication

- Password + OTP for officers with a login. Argon2id, minimum 12 characters, breach-list check on set.
- Access token 15 minutes, refresh token 7 days, both httpOnly, SameSite=Strict, Secure.
- Refresh rotation with reuse detection: a replayed refresh token invalidates the whole family and writes an audit entry.
- Five failed attempts locks the account for 15 minutes; the lock is audited.
- Sessions are listed in the user's profile and individually revocable.

## 7 · Effective-access checker

The prototype has a **Check effective access** dialog on every officer row, and the build must keep it: pick a user, see exactly which capabilities they hold, which they do not, and which projects each applies to. It is the fastest answer to "why can't this officer see X", and support will use it constantly.

`GET /api/v1/access/effective/:userId` returns the resolved capability list, the project list and, for each project, what the user may do there.

## 8 · Acceptance

- A Meeting Coordinator mapped only to Project 1 receives `404` on a Project 2 meeting id and sees zero Project 2 rows in every list.
- Removing `approve_mom` from the AMD designation revokes it for every AMD on the next request, with no logout.
- An owner cannot confirm their own action — the endpoint returns `403 SELF_CONFIRMATION`.
- The Share recipient picker for a scoped coordinator lists no officer outside their projects.
- Every capability check has a test asserting both the allowed and the denied path.
