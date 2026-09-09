/**
 * Loads the prototype's demo dataset so the built application and
 * `prototype/UCF-MoM-Tracker-Interactive.html` show the same numbers side by
 * side. That comparison is how you tell whether a screen is finished.
 *
 * `seed-data.json` is extracted verbatim from the prototype's own `data.js`
 * (see `prisma/extract-seed-data.mjs`). Do not hand-edit it — regenerate it, so
 * the two can never drift.
 *
 * THE CLOCK IS FIXED AT 1 SEPTEMBER 2026. Overdue, ageing and calendar states
 * are all relative to it. Move it and every screenshot in `docs/` stops
 * matching, and the "4 in progress" on the dashboard silently becomes 5.
 *
 * Written against `pg` rather than Prisma Client on purpose: the seed is the
 * one script that has to work on a bare checkout, before `prisma generate` has
 * necessarily run, and in CI where the client may not be built yet.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, 'seed-data.json'), 'utf8')) as Fixture;

// ───────────────────────────── fixture shape ─────────────────────────────

interface Fixture {
  TODAY: string;
  DESIGNATIONS: { id: string; name: string; band: string; caps: string[] }[];
  DEPARTMENTS: string[];
  USERS: {
    id: string;
    name: string;
    av: string;
    dg: string;
    dept: string;
    prj: 'ALL' | string[];
    mob: string;
    login: boolean;
  }[];
  PROJECTS: {
    id: string;
    name: string;
    full: string;
    status: string;
    desc: string;
    cost: number;
    debtS: number;
    debtD: number;
    start: string;
    end: string;
    agency: string;
    officers: [string, string][];
    ulbs: {
      name: string;
      code: string;
      lead: boolean;
      nodal: string;
      contact: string;
      wards: number;
    }[];
    docs: DocFixture[];
  }[];
  MEETINGS: {
    id: string;
    code: [string, string, string];
    type: 'instant' | 'scheduled';
    title: string;
    cat: string;
    date: string;
    start: string;
    end: string;
    venue: string;
    link?: string;
    chair: string;
    by: string;
    prj: string[];
    stage: number;
    momState: string;
    freeze?: string;
    confirmedBy?: string;
    confirmedOn?: string;
    agenda?: { t: string; p: string | null; by: string; carry?: boolean }[];
    invitees?: string[];
    attend?: Record<string, 'P' | 'V' | 'A'>;
    minutes?: string;
    docs?: DocFixture[];
    signed?: { file: string; size: string; by: string; date: string; pages: number };
  }[];
  ITEMS: {
    id: string;
    type: 'action' | 'clarification';
    m: string;
    p: string;
    desc: string;
    raised: string;
    owners?: string[];
    respBy?: string;
    due?: string;
    pri?: string;
    status: string;
    rem?: string;
    hist?: [string, string, string][];
  }[];
}

interface DocFixture {
  id: string;
  name: string;
  type: string;
  file: string;
  size: string;
  by: string;
  date: string;
}

// ─────────────────────────── fixture → enum maps ───────────────────────────

const PROJECT_STATUS: Record<string, string> = {
  'Under execution': 'UNDER_EXECUTION',
  Procurement: 'PROCUREMENT',
  Planning: 'PLANNING',
  Completed: 'COMPLETED',
  'On hold': 'ON_HOLD',
};

const MEETING_CATEGORY: Record<string, string> = {
  'Weekly Progress Review': 'WEEKLY_PROGRESS_REVIEW',
  'Review with Financier': 'REVIEW_WITH_FINANCIER',
  'Steering Committee': 'STEERING_COMMITTEE',
  'Technical / Coordination': 'TECHNICAL_COORDINATION',
};

const DOCUMENT_TYPE: Record<string, string> = {
  'Sanction order': 'SANCTION_ORDER',
  DPR: 'DPR',
  Agreement: 'AGREEMENT',
  'Progress report': 'PROGRESS_REPORT',
  'Site photo': 'SITE_PHOTO',
  'Signed MoM': 'SIGNED_MOM',
  Correspondence: 'CORRESPONDENCE',
  Other: 'OTHER',
};

const ACTION_STATUS: Record<string, string> = {
  'In Progress': 'IN_PROGRESS',
  Delayed: 'DELAYED',
  'Under Review': 'UNDER_REVIEW',
  Completed: 'COMPLETED',
};

const CLARIFICATION_STATUS: Record<string, string> = {
  Open: 'OPEN',
  Responded: 'RESPONDED',
  Closed: 'CLOSED',
};

const PRIORITY: Record<string, string> = {
  'Very High': 'VERY_HIGH',
  High: 'HIGH',
  Medium: 'MEDIUM',
  Low: 'LOW',
  Lower: 'LOWER',
};

const ATTENDANCE: Record<string, string> = { P: 'PRESENT', V: 'VIRTUAL', A: 'ABSENT' };
const MOM_STATE: Record<string, string> = {
  none: 'NOT_GENERATED',
  draft: 'DRAFT',
  submitted: 'SUBMITTED',
  returned: 'RETURNED',
  approved: 'APPROVED',
  signed: 'SIGNED',
};

/**
 * The prototype models progress as a stage number per journey. The database
 * models it as a named stage, which is what the state machines in
 * `docs/05-WORKFLOWS.md` actually guard on.
 */
function stageOf(type: 'instant' | 'scheduled', stage: number, momState: string): string {
  if (momState === 'signed') return 'CLOSED';
  if (type === 'instant') {
    return (['COMPOSED', 'LIVE', 'HELD', 'HELD', 'HELD', 'HELD', 'MINUTED', 'MINUTED'][
      stage - 1
    ] ?? 'HELD') as string;
  }
  return (
    ([
      'PLANNED',
      'AGENDA',
      'INVITEES',
      'INVITEE_INPUTS',
      'CONFIRMED',
      'HELD',
      'MINUTED',
      'CLOSED',
    ][stage - 1] as string) ?? 'PLANNED'
  );
}

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`seed: no mapping for ${what}`);
  return value;
}

/** Stable, readable ids. cuid() is for rows the application creates. */
const id = (prefix: string, key: string): string => `seed_${prefix}_${key}`;

const emailFor = (name: string): string =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@example.gov`;

/** '+91 9XXXX XX010' → '+919XXXXXX010'. Stored E.164-shaped for WhatsApp. */
const e164 = (mob: string): string => mob.replace(/\s+/g, '');

/** The fixed clock, and a timestamp derived from it for created/updated rows. */
const TODAY = data.TODAY;
const NOW = new Date(`${TODAY}T09:00:00.000Z`);

// ────────────────────────────────── seed ──────────────────────────────────

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');

  const db = new Client({ connectionString: url });
  await db.connect();

  try {
    await db.query('BEGIN');

    // Truncate rather than delete: the seed is a reset, and RESTART IDENTITY
    // keeps a reseeded database indistinguishable from a fresh one. audit_entries
    // is append-only for UPDATE and DELETE, but TRUNCATE is not a DELETE, so a
    // reset still works — which is exactly the line we wanted to draw.
    await db.query(`
      TRUNCATE TABLE
        audit_entries, dispatches, notifications, documents, stored_files,
        item_updates, item_owners, agenda_carries, items,
        mom_history, moms, minutes_versions, minutes,
        meeting_invitees, agenda_items, meeting_projects, meetings,
        project_members, ulbs, projects, users, departments, designations
      RESTART IDENTITY CASCADE
    `);

    // ── designations ──
    for (const d of data.DESIGNATIONS) {
      await db.query(
        `INSERT INTO designations (id, code, name, band, caps, "isSystem", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,true,$6,$6)`,
        [id('dg', d.id), d.id, d.name, d.band, d.caps, NOW],
      );
    }

    // ── departments ──
    for (const name of data.DEPARTMENTS) {
      await db.query(
        `INSERT INTO departments (id, name, "createdAt") VALUES ($1,$2,$3)`,
        [id('dept', slug(name)), name, NOW],
      );
    }

    // ── projects and their ULBs ──
    for (const p of data.PROJECTS) {
      await db.query(
        `INSERT INTO projects
           (id, code, name, full_name, description, status, implementing_agency,
            cost_cr, debt_sanctioned_cr, debt_drawn_cr, start_date, target_end_date,
            "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)`,
        [
          id('prj', p.id),
          p.id,
          p.name,
          p.full,
          p.desc,
          must(PROJECT_STATUS[p.status], `project status "${p.status}"`),
          p.agency,
          p.cost,
          p.debtS,
          p.debtD,
          p.start,
          p.end,
          NOW,
        ],
      );

      for (const u of p.ulbs) {
        await db.query(
          `INSERT INTO ulbs (id, code, name, wards, nodal_name, contact, project_id, is_lead,
                             "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
          [
            id('ulb', u.code),
            u.code,
            u.name,
            u.wards,
            u.nodal,
            u.contact,
            id('prj', p.id),
            u.lead,
            NOW,
          ],
        );
      }
    }

    // ── users ──
    for (const u of data.USERS) {
      await db.query(
        `INSERT INTO users
           (id, name, initials, email, mobile, password_hash, designation_id, department_id,
            sees_all_projects, account_state, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8,$9,$10,$10)`,
        [
          id('u', u.id),
          u.name,
          u.av,
          emailFor(u.name),
          e164(u.mob),
          id('dg', u.dg),
          id('dept', slug(u.dept)),
          u.prj === 'ALL',
          // No password is seeded. Phase 1 sets one; until then these accounts
          // cannot be signed into, which is the correct default for a seed.
          u.login ? 'ACTIVE' : 'INVITE_ONLY',
          NOW,
        ],
      );
    }

    // ── project membership: the second half of the access rule ──
    for (const p of data.PROJECTS) {
      for (const [userKey, role] of p.officers) {
        await db.query(
          `INSERT INTO project_members (id, user_id, project_id, role_on_project, "createdAt")
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (user_id, project_id) DO NOTHING`,
          [id('pm', `${p.id}_${userKey}`), id('u', userKey), id('prj', p.id), role, NOW],
        );
      }
    }
    // Users mapped to projects in the fixture but not listed as named officers
    // still need scope, or they would be able to see nothing at all.
    for (const u of data.USERS) {
      if (u.prj === 'ALL') continue;
      for (const projectKey of u.prj) {
        await db.query(
          `INSERT INTO project_members (id, user_id, project_id, role_on_project, "createdAt")
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (user_id, project_id) DO NOTHING`,
          [
            id('pm', `${projectKey}_${u.id}`),
            id('u', u.id),
            id('prj', projectKey),
            'Mapped',
            NOW,
          ],
        );
      }
    }

    // ── meetings ──
    for (const m of data.MEETINGS) {
      const meetingId = id('mtg', m.id);
      await db.query(
        `INSERT INTO meetings
           (id, code, type, category, title, meeting_date, start_time, end_time, venue, vc_link,
            chair_id, created_by_id, stage, agenda_freeze_at, confirmed_by_id, confirmed_at,
            "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)`,
        [
          meetingId,
          m.code.join('/'),
          m.type.toUpperCase(),
          must(MEETING_CATEGORY[m.cat], `meeting category "${m.cat}"`),
          m.title,
          m.date,
          m.start,
          m.end,
          m.venue,
          m.link ?? null,
          id('u', m.chair),
          id('u', m.by),
          stageOf(m.type, m.stage, m.momState),
          m.freeze ? new Date(`${m.freeze.replace(' ', 'T')}:00.000Z`) : null,
          m.confirmedBy ? id('u', m.confirmedBy) : null,
          m.confirmedOn ? new Date(`${m.confirmedOn}T09:00:00.000Z`) : null,
          NOW,
        ],
      );

      for (const projectKey of m.prj) {
        await db.query(
          `INSERT INTO meeting_projects (meeting_id, project_id) VALUES ($1,$2)`,
          [meetingId, id('prj', projectKey)],
        );
      }

      (m.agenda ?? []).forEach(async (_a, i) => void i);
      let ordinal = 0;
      for (const a of m.agenda ?? []) {
        await db.query(
          `INSERT INTO agenda_items
             (id, meeting_id, ordinal, text, project_id, added_by_id, is_carry_block, "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            id('ag', `${m.id}_${ordinal}`),
            meetingId,
            ordinal,
            a.t,
            a.p ? id('prj', a.p) : null,
            // "system" in the fixture is the auto-generated carry-forward block.
            id('u', a.by === 'system' ? m.by : a.by),
            a.carry === true,
            NOW,
          ],
        );
        ordinal += 1;
      }

      for (const userKey of m.invitees ?? []) {
        const mark = m.attend?.[userKey];
        await db.query(
          `INSERT INTO meeting_invitees (id, meeting_id, user_id, attendance, "createdAt")
           VALUES ($1,$2,$3,$4,$5)`,
          [
            id('inv', `${m.id}_${userKey}`),
            meetingId,
            id('u', userKey),
            mark ? must(ATTENDANCE[mark], `attendance mark "${mark}"`) : null,
            NOW,
          ],
        );
      }

      if (m.minutes) {
        await db.query(
          `INSERT INTO minutes (id, meeting_id, body_html, locked_at, updated_by_id, "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$6)`,
          [
            id('min', m.id),
            meetingId,
            m.minutes,
            // Minutes lock the moment the MoM leaves the coordinator's hands.
            ['submitted', 'approved', 'signed'].includes(m.momState) ? NOW : null,
            id('u', m.by),
            NOW,
          ],
        );
        await db.query(
          `INSERT INTO minutes_versions (id, minutes_id, version, body_html, saved_by_id, "createdAt")
           VALUES ($1,$2,1,$3,$4,$5)`,
          [id('minv', m.id), id('min', m.id), m.minutes, id('u', m.by), NOW],
        );
      }

      const momState = must(MOM_STATE[m.momState], `mom state "${m.momState}"`);
      if (momState !== 'NOT_GENERATED') {
        const circulated = momState === 'SIGNED';
        await db.query(
          `INSERT INTO moms
             (id, meeting_id, state, version, submitted_by_id, submitted_at,
              signed_uploaded_by_id, signed_uploaded_at, circulated_at, "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
          [
            id('mom', m.id),
            meetingId,
            momState,
            momState === 'SUBMITTED' ? 2 : 1,
            id('u', m.by),
            NOW,
            circulated && m.signed ? id('u', m.by) : null,
            circulated && m.signed ? new Date(`${m.signed.date}T09:00:00.000Z`) : null,
            circulated && m.signed ? new Date(`${m.signed.date}T09:00:00.000Z`) : null,
            NOW,
          ],
        );
        await db.query(
          `INSERT INTO mom_history (id, mom_id, event, version, actor_id, "createdAt")
           VALUES ($1,$2,'GENERATED',1,$3,$4)`,
          [id('momh', m.id), id('mom', m.id), id('u', m.by), NOW],
        );
      }
    }

    // ── files behind every document ──
    const allDocs: { doc: DocFixture; scope: string; ownerKey: string }[] = [
      ...data.PROJECTS.flatMap((p) =>
        p.docs.map((doc) => ({ doc, scope: 'PROJECT', ownerKey: p.id })),
      ),
      ...data.MEETINGS.flatMap((m) =>
        (m.docs ?? []).map((doc) => ({ doc, scope: 'MEETING', ownerKey: m.id })),
      ),
    ];
    const uploaderByName = new Map(data.USERS.map((u) => [u.name, u.id]));

    for (const { doc, scope, ownerKey } of allDocs) {
      const uploader = uploaderByName.get(doc.by) ?? 'u3';
      await db.query(
        `INSERT INTO stored_files
           (id, object_key, file_name, mime_type, size_bytes, sha256, uploaded_by_id, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          id('file', doc.id),
          `seed/${doc.id}/${doc.file}`,
          doc.file,
          doc.file.endsWith('.xlsx')
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf',
          bytesOf(doc.size),
          `seed-${doc.id}`,
          id('u', uploader),
          new Date(`${doc.date}T09:00:00.000Z`),
        ],
      );
      await db.query(
        `INSERT INTO documents
           (id, scope, name, type, file_id, project_id, meeting_id, uploaded_by_id, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id('doc', doc.id),
          scope,
          doc.name,
          must(DOCUMENT_TYPE[doc.type], `document type "${doc.type}"`),
          id('file', doc.id),
          scope === 'PROJECT' ? id('prj', ownerKey) : null,
          scope === 'MEETING' ? id('mtg', ownerKey) : null,
          id('u', uploader),
          new Date(`${doc.date}T09:00:00.000Z`),
        ],
      );
    }

    // ── items: actions and clarifications ──
    for (const it of data.ITEMS) {
      const isAction = it.type === 'action';
      const meeting = data.MEETINGS.find((m) => m.id === it.m);
      if (!meeting) throw new Error(`seed: item ${it.id} references unknown meeting ${it.m}`);

      // Circulation activates. An item whose MoM is not yet signed is inert:
      // no owner has been told, no clock has started. This single field is what
      // every dashboard count and every reminder filters on.
      const activatedAt =
        meeting.momState === 'signed' && meeting.signed
          ? new Date(`${meeting.signed.date}T09:00:00.000Z`)
          : null;

      await db.query(
        `INSERT INTO items
           (id, ref, type, meeting_id, project_id, description, raised_by_id, remarks,
            due_date, original_due, priority, action_status,
            responded_by_id, clarification_status,
            activated_at, closed_at, carry_count, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)`,
        [
          id('item', it.id),
          it.id,
          isAction ? 'ACTION' : 'CLARIFICATION',
          id('mtg', it.m),
          id('prj', it.p),
          it.desc,
          id('u', it.raised),
          it.rem ?? null,
          isAction ? (it.due ?? null) : null,
          isAction ? (it.due ?? null) : null,
          isAction && it.pri ? must(PRIORITY[it.pri], `priority "${it.pri}"`) : null,
          isAction ? must(ACTION_STATUS[it.status], `action status "${it.status}"`) : null,
          !isAction && it.respBy ? id('u', it.respBy) : null,
          isAction
            ? null
            : must(CLARIFICATION_STATUS[it.status], `clarification status "${it.status}"`),
          activatedAt,
          it.status === 'Completed' || it.status === 'Closed' ? NOW : null,
          0,
          NOW,
        ],
      );

      // Joint ownership: every named officer, no primary.
      for (const ownerKey of it.owners ?? []) {
        await db.query(
          `INSERT INTO item_owners (item_id, user_id) VALUES ($1,$2)`,
          [id('item', it.id), id('u', ownerKey)],
        );
      }

      let n = 0;
      for (const [when, note, actorName] of it.hist ?? []) {
        await db.query(
          `INSERT INTO item_updates (id, item_id, actor_id, note, "createdAt")
           VALUES ($1,$2,$3,$4,$5)`,
          [
            id('iu', `${it.id}_${n}`),
            id('item', it.id),
            id('u', uploaderByName.get(actorName) ?? 'u3'),
            note,
            new Date(`${when.replace(' ', 'T')}:00.000Z`),
          ],
        );
        n += 1;
      }
    }

    await db.query('COMMIT');

    const counts = await tally(db);
    console.log('Seeded the prototype dataset. Clock fixed at', TODAY);
    for (const [table, count] of counts) console.log(`  ${table.padEnd(18)} ${count}`);
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    await db.end();
  }
}

async function tally(db: Client): Promise<[string, number][]> {
  const tables = [
    'designations',
    'departments',
    'projects',
    'ulbs',
    'users',
    'project_members',
    'meetings',
    'agenda_items',
    'meeting_invitees',
    'minutes',
    'moms',
    'items',
    'item_owners',
    'item_updates',
    'documents',
  ];
  const out: [string, number][] = [];
  for (const t of tables) {
    const r = await db.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${t}`);
    out.push([t, Number(r.rows[0]?.n ?? 0)]);
  }
  return out;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** '12.4 MB' → bytes. Only the seed needs this; real uploads report their size. */
function bytesOf(size: string): number {
  const m = /^([\d.]+)\s*(KB|MB|GB)$/i.exec(size.trim());
  if (!m || !m[1] || !m[2]) return 1024;
  const scale = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[m[2].toLowerCase()] ?? 1024;
  return Math.round(Number(m[1]) * scale);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
