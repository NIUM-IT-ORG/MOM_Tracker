-- UCF Meeting & Action Item Tracker — initial migration
--
-- This is P0-03 and P0-04 in one file, deliberately: the two invariants at the
-- bottom (append-only audit, and the action/clarification column split) must be
-- true from the first row the database ever holds, not from whenever a second
-- migration happens to run.

-- ───────────────────────────────── enums ─────────────────────────────────

CREATE TYPE "MeetingType" AS ENUM ('INSTANT', 'SCHEDULED');

CREATE TYPE "MeetingCategory" AS ENUM (
  'WEEKLY_PROGRESS_REVIEW', 'REVIEW_WITH_FINANCIER',
  'STEERING_COMMITTEE', 'TECHNICAL_COORDINATION'
);

CREATE TYPE "MeetingStage" AS ENUM (
  'PLANNED', 'AGENDA', 'INVITEES', 'INVITEE_INPUTS', 'CONFIRMED',
  'COMPOSED', 'LIVE', 'HELD', 'MINUTED', 'CLOSED', 'CANCELLED'
);

CREATE TYPE "MomState" AS ENUM (
  'NOT_GENERATED', 'DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'SIGNED'
);

CREATE TYPE "AttendanceMark" AS ENUM ('PRESENT', 'VIRTUAL', 'ABSENT');
CREATE TYPE "RsvpResponse"   AS ENUM ('ACCEPTED', 'TENTATIVE', 'DECLINED');
CREATE TYPE "ItemType"       AS ENUM ('ACTION', 'CLARIFICATION');

CREATE TYPE "ActionStatus"        AS ENUM ('IN_PROGRESS', 'DELAYED', 'UNDER_REVIEW', 'COMPLETED');
CREATE TYPE "ClarificationStatus" AS ENUM ('OPEN', 'RESPONDED', 'CLOSED');

CREATE TYPE "Priority"      AS ENUM ('VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'LOWER');
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'PROCUREMENT', 'UNDER_EXECUTION', 'COMPLETED', 'ON_HOLD');

CREATE TYPE "DocumentType" AS ENUM (
  'SANCTION_ORDER', 'DPR', 'AGREEMENT', 'PROGRESS_REPORT',
  'SITE_PHOTO', 'SIGNED_MOM', 'CORRESPONDENCE', 'OTHER'
);
CREATE TYPE "DocumentScope" AS ENUM ('PROJECT', 'MEETING', 'ITEM');

CREATE TYPE "Channel"       AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP');
CREATE TYPE "DispatchState" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE "AccountState"  AS ENUM ('ACTIVE', 'SUSPENDED', 'INVITE_ONLY');

-- ─────────────────────────────── master data ───────────────────────────────

CREATE TABLE "designations" (
  "id"         TEXT PRIMARY KEY,
  "code"       TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "band"       TEXT NOT NULL,
  "caps"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isSystem"   BOOLEAN NOT NULL DEFAULT false,
  "retiredAt"  TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "designations_code_key" ON "designations"("code");
-- Capabilities are read on every request. A GIN index beats a join table.
CREATE INDEX "designations_caps_idx" ON "designations" USING GIN ("caps");

CREATE TABLE "departments" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

CREATE TABLE "projects" (
  "id"                  TEXT PRIMARY KEY,
  "code"                TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "full_name"           TEXT NOT NULL,
  "description"         TEXT,
  "status"              "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
  "implementing_agency" TEXT,
  -- Money is never a float. ₹ crore, two decimal places.
  "cost_cr"             DECIMAL(14,2) NOT NULL,
  "debt_sanctioned_cr"  DECIMAL(14,2) NOT NULL,
  "debt_drawn_cr"       DECIMAL(14,2) NOT NULL,
  "start_date"          DATE,
  "target_end_date"     DATE,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

CREATE TABLE "ulbs" (
  "id"         TEXT PRIMARY KEY,
  "code"       TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "wards"      INTEGER,
  "nodal_name" TEXT,
  "contact"    TEXT,
  "project_id" TEXT NOT NULL,
  "is_lead"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ulbs_code_key" ON "ulbs"("code");
CREATE INDEX "ulbs_project_id_idx" ON "ulbs"("project_id");
-- One lead ULB per project, enforced here rather than by a service that might forget.
CREATE UNIQUE INDEX "ulbs_one_lead_per_project" ON "ulbs"("project_id") WHERE "is_lead";

-- ───────────────────────────────── people ─────────────────────────────────

CREATE TABLE "users" (
  "id"                TEXT PRIMARY KEY,
  "name"              TEXT NOT NULL,
  "initials"          VARCHAR(3) NOT NULL,
  "email"             TEXT NOT NULL,
  "mobile"            TEXT NOT NULL,
  "password_hash"     TEXT,
  "designation_id"    TEXT NOT NULL,
  "department_id"     TEXT NOT NULL,
  "sees_all_projects" BOOLEAN NOT NULL DEFAULT false,
  "account_state"     "AccountState" NOT NULL DEFAULT 'ACTIVE',
  "last_login_at"     TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_designation_id_idx" ON "users"("designation_id");
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

CREATE TABLE "project_members" (
  "id"               TEXT PRIMARY KEY,
  "user_id"          TEXT NOT NULL,
  "project_id"       TEXT NOT NULL,
  "role_on_project"  TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "project_members_user_id_project_id_key" ON "project_members"("user_id", "project_id");
CREATE INDEX "project_members_project_id_idx" ON "project_members"("project_id");

-- ──────────────────────────────── meetings ────────────────────────────────

CREATE TABLE "meetings" (
  "id"                TEXT PRIMARY KEY,
  "code"              TEXT NOT NULL,
  "type"              "MeetingType" NOT NULL,
  "category"          "MeetingCategory" NOT NULL,
  "title"             TEXT NOT NULL,
  "meeting_date"      DATE NOT NULL,
  -- A meeting start is a wall-clock intent, not an instant.
  "start_time"        VARCHAR(5) NOT NULL,
  "end_time"          VARCHAR(5) NOT NULL,
  "venue"             TEXT NOT NULL,
  "vc_link"           TEXT,
  "chair_id"          TEXT NOT NULL,
  "created_by_id"     TEXT NOT NULL,
  "stage"             "MeetingStage" NOT NULL,
  "agenda_freeze_at"  TIMESTAMP(3),
  "confirmed_by_id"   TEXT,
  "confirmed_at"      TIMESTAMP(3),
  "cancelled_reason"  TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "meetings_code_key" ON "meetings"("code");
CREATE INDEX "meetings_meeting_date_idx" ON "meetings"("meeting_date");
CREATE INDEX "meetings_stage_idx" ON "meetings"("stage");

CREATE TABLE "meeting_projects" (
  "meeting_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  CONSTRAINT "meeting_projects_pkey" PRIMARY KEY ("meeting_id", "project_id")
);

CREATE TABLE "agenda_items" (
  "id"             TEXT PRIMARY KEY,
  "meeting_id"     TEXT NOT NULL,
  -- 0 is reserved for the carry-forward block.
  "ordinal"        INTEGER NOT NULL,
  "text"           TEXT NOT NULL,
  "project_id"     TEXT,
  "added_by_id"    TEXT NOT NULL,
  "is_carry_block" BOOLEAN NOT NULL DEFAULT false,
  "is_deferred"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "agenda_items_meeting_id_idx" ON "agenda_items"("meeting_id");

CREATE TABLE "agenda_carries" (
  "agenda_item_id" TEXT NOT NULL,
  "item_id"        TEXT NOT NULL,
  "revised_due"    DATE,
  CONSTRAINT "agenda_carries_pkey" PRIMARY KEY ("agenda_item_id", "item_id")
);

CREATE TABLE "meeting_invitees" (
  "id"         TEXT PRIMARY KEY,
  "meeting_id" TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "rsvp"       "RsvpResponse",
  "attendance" "AttendanceMark",
  "is_walk_in" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "meeting_invitees_meeting_id_user_id_key" ON "meeting_invitees"("meeting_id", "user_id");
CREATE INDEX "meeting_invitees_user_id_idx" ON "meeting_invitees"("user_id");

-- ───────────────────────────── minutes and MoM ─────────────────────────────

CREATE TABLE "minutes" (
  "id"             TEXT PRIMARY KEY,
  "meeting_id"     TEXT NOT NULL,
  "body_html"      TEXT NOT NULL,
  "locked_at"      TIMESTAMP(3),
  "updated_by_id"  TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "minutes_meeting_id_key" ON "minutes"("meeting_id");

CREATE TABLE "minutes_versions" (
  "id"           TEXT PRIMARY KEY,
  "minutes_id"   TEXT NOT NULL,
  "version"      INTEGER NOT NULL,
  "body_html"    TEXT NOT NULL,
  "saved_by_id"  TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "minutes_versions_minutes_id_version_key" ON "minutes_versions"("minutes_id", "version");

CREATE TABLE "moms" (
  "id"                     TEXT PRIMARY KEY,
  "meeting_id"             TEXT NOT NULL,
  "state"                  "MomState" NOT NULL DEFAULT 'NOT_GENERATED',
  "version"                INTEGER NOT NULL DEFAULT 1,
  "draft_file_id"          TEXT,
  "signed_file_id"         TEXT,
  "submitted_by_id"        TEXT,
  "submitted_at"           TIMESTAMP(3),
  "decided_by_id"          TEXT,
  "decided_at"             TIMESTAMP(3),
  "decision_remark"        TEXT,
  "signed_uploaded_by_id"  TEXT,
  "signed_uploaded_at"     TIMESTAMP(3),
  "circulated_at"          TIMESTAMP(3),
  "corrects_mom_id"        TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "moms_meeting_id_key" ON "moms"("meeting_id");
CREATE INDEX "moms_state_idx" ON "moms"("state");

CREATE TABLE "mom_history" (
  "id"        TEXT PRIMARY KEY,
  "mom_id"    TEXT NOT NULL,
  "event"     TEXT NOT NULL,
  "version"   INTEGER NOT NULL,
  "actor_id"  TEXT NOT NULL,
  "remark"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "mom_history_mom_id_idx" ON "mom_history"("mom_id");

-- ──────────────────── actions and clarifications ────────────────────

CREATE TABLE "items" (
  "id"              TEXT PRIMARY KEY,
  "ref"             TEXT NOT NULL,
  "type"            "ItemType" NOT NULL,
  "meeting_id"      TEXT NOT NULL,
  "project_id"      TEXT NOT NULL,
  "agenda_item_id"  TEXT,
  "description"     TEXT NOT NULL,
  "raised_by_id"    TEXT NOT NULL,
  "remarks"         TEXT,

  -- action-only
  "due_date"        DATE,
  "original_due"    DATE,
  "priority"        "Priority",
  "action_status"   "ActionStatus",

  -- clarification-only
  "responded_by_id"       TEXT,
  "clarification_status"  "ClarificationStatus",

  -- Null until the signed MoM is circulated. Every dashboard count, reminder
  -- and escalation filters on this being non-null.
  "activated_at"    TIMESTAMP(3),
  "closed_at"       TIMESTAMP(3),
  "carry_count"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "items_ref_key" ON "items"("ref");
CREATE INDEX "items_meeting_id_idx" ON "items"("meeting_id");
CREATE INDEX "items_project_id_idx" ON "items"("project_id");
CREATE INDEX "items_action_status_idx" ON "items"("action_status");
CREATE INDEX "items_clarification_status_idx" ON "items"("clarification_status");
CREATE INDEX "items_due_date_idx" ON "items"("due_date");
CREATE INDEX "items_activated_at_idx" ON "items"("activated_at");

CREATE TABLE "item_owners" (
  "item_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  CONSTRAINT "item_owners_pkey" PRIMARY KEY ("item_id", "user_id")
);
CREATE INDEX "item_owners_user_id_idx" ON "item_owners"("user_id");

CREATE TABLE "item_updates" (
  "id"                TEXT PRIMARY KEY,
  "item_id"           TEXT NOT NULL,
  "actor_id"          TEXT NOT NULL,
  "from_status"       TEXT,
  "to_status"         TEXT,
  "note"              TEXT,
  "evidence_file_id"  TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "item_updates_item_id_idx" ON "item_updates"("item_id");

-- ─────────────────────────── files and documents ───────────────────────────

CREATE TABLE "stored_files" (
  "id"             TEXT PRIMARY KEY,
  "object_key"     TEXT NOT NULL,
  "file_name"      TEXT NOT NULL,
  "mime_type"      TEXT NOT NULL,
  "size_bytes"     INTEGER NOT NULL,
  "sha256"         TEXT NOT NULL,
  "uploaded_by_id" TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "stored_files_object_key_key" ON "stored_files"("object_key");

CREATE TABLE "documents" (
  "id"              TEXT PRIMARY KEY,
  "scope"           "DocumentScope" NOT NULL,
  -- Both a name and a file are mandatory. NOT NULL is the real guarantee;
  -- the form is only a convenience.
  "name"            TEXT NOT NULL,
  "type"            "DocumentType" NOT NULL,
  "file_id"         TEXT NOT NULL,
  "remarks"         TEXT,
  "project_id"      TEXT,
  "meeting_id"      TEXT,
  "item_id"         TEXT,
  "agenda_item_id"  TEXT,
  "uploaded_by_id"  TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "documents_project_id_idx" ON "documents"("project_id");
CREATE INDEX "documents_meeting_id_idx" ON "documents"("meeting_id");

-- ───────────────────────── notifications and audit ─────────────────────────

CREATE TABLE "notifications" (
  "id"                TEXT PRIMARY KEY,
  "event_code"        TEXT NOT NULL,
  "subject_type"      TEXT NOT NULL,
  "subject_id"        TEXT NOT NULL,
  "subject_ref"       TEXT NOT NULL,
  "template_key"      TEXT NOT NULL,
  "payload"           JSONB NOT NULL,
  "triggered_by_id"   TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notifications_subject_type_subject_id_idx" ON "notifications"("subject_type", "subject_id");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

CREATE TABLE "dispatches" (
  "id"               TEXT PRIMARY KEY,
  "notification_id"  TEXT NOT NULL,
  "recipient_id"     TEXT,
  "address"          TEXT NOT NULL,
  "channel"          "Channel" NOT NULL,
  "state"            "DispatchState" NOT NULL DEFAULT 'QUEUED',
  "provider_msg_id"  TEXT,
  "attempts"         INTEGER NOT NULL DEFAULT 0,
  "last_error"       TEXT,
  "sent_at"          TIMESTAMP(3),
  "delivered_at"     TIMESTAMP(3),
  "read_at"          TIMESTAMP(3)
);
CREATE INDEX "dispatches_notification_id_idx" ON "dispatches"("notification_id");
CREATE INDEX "dispatches_state_idx" ON "dispatches"("state");

CREATE TABLE "audit_entries" (
  "id"           TEXT PRIMARY KEY,
  "actor_id"     TEXT,
  "object_type"  TEXT NOT NULL,
  "object_id"    TEXT NOT NULL,
  "object_ref"   TEXT NOT NULL,
  "event"        TEXT NOT NULL,
  "detail"       TEXT,
  "before"       JSONB,
  "after"        JSONB,
  "ip_address"   TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_entries_object_type_object_id_idx" ON "audit_entries"("object_type", "object_id");
CREATE INDEX "audit_entries_createdAt_idx" ON "audit_entries"("createdAt");

-- ───────────────────────────── foreign keys ─────────────────────────────

ALTER TABLE "ulbs" ADD CONSTRAINT "ulbs_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_designation_id_fkey"
  FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_chair_id_fkey"
  FOREIGN KEY ("chair_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "meeting_projects" ADD CONSTRAINT "meeting_projects_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_projects" ADD CONSTRAINT "meeting_projects_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agenda_carries" ADD CONSTRAINT "agenda_carries_agenda_item_id_fkey"
  FOREIGN KEY ("agenda_item_id") REFERENCES "agenda_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agenda_carries" ADD CONSTRAINT "agenda_carries_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_invitees" ADD CONSTRAINT "meeting_invitees_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meeting_invitees" ADD CONSTRAINT "meeting_invitees_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "minutes" ADD CONSTRAINT "minutes_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "minutes_versions" ADD CONSTRAINT "minutes_versions_minutes_id_fkey"
  FOREIGN KEY ("minutes_id") REFERENCES "minutes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moms" ADD CONSTRAINT "moms_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mom_history" ADD CONSTRAINT "mom_history_mom_id_fkey"
  FOREIGN KEY ("mom_id") REFERENCES "moms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "items" ADD CONSTRAINT "items_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_raised_by_id_fkey"
  FOREIGN KEY ("raised_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_responded_by_id_fkey"
  FOREIGN KEY ("responded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "item_owners" ADD CONSTRAINT "item_owners_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_owners" ADD CONSTRAINT "item_owners_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "item_updates" ADD CONSTRAINT "item_updates_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_file_id_fkey"
  FOREIGN KEY ("file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_meeting_id_fkey"
  FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_agenda_item_id_fkey"
  FOREIGN KEY ("agenda_item_id") REFERENCES "agenda_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_triggered_by_id_fkey"
  FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_notification_id_fkey"
  FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════ the two invariants (P0-04) ═══════════════════════

-- One table, two shapes. The API validates with a zod discriminated union; this
-- is the half that holds even when a service is wrong.
ALTER TABLE "items" ADD CONSTRAINT "items_shape" CHECK (
  (
    "type" = 'ACTION'
    AND "due_date" IS NOT NULL
    AND "action_status" IS NOT NULL
    AND "responded_by_id" IS NULL
    AND "clarification_status" IS NULL
  )
  OR (
    "type" = 'CLARIFICATION'
    AND "due_date" IS NULL
    AND "original_due" IS NULL
    AND "action_status" IS NULL
    AND "priority" IS NULL
    AND "clarification_status" IS NOT NULL
  )
);

-- Append-only audit, at the database rather than by convention. These rules
-- make UPDATE and DELETE do nothing at all: the statement succeeds, the row
-- does not change. A correction is a new row that references the old one.
CREATE RULE "audit_no_update" AS ON UPDATE TO "audit_entries" DO INSTEAD NOTHING;
CREATE RULE "audit_no_delete" AS ON DELETE TO "audit_entries" DO INSTEAD NOTHING;
