/**
 * The two database-level invariants, asserted against a real database.
 *
 * These are not unit tests of application code — they check that the *database*
 * would refuse a bad write even if a service were wrong. That is the whole
 * point of putting them in the schema rather than in a service, so proving it
 * belongs in CI.
 *
 *   pnpm assert:invariants
 *
 * Uses `pg` directly and no Prisma Client, so it runs immediately after
 * `prisma migrate deploy` with nothing else built.
 */
import 'dotenv/config';
import { Client } from 'pg';

let failures = 0;

function pass(what: string): void {
  console.log(`  ✓ ${what}`);
}
function fail(what: string, detail: string): void {
  failures += 1;
  console.error(`  ✗ ${what}\n      ${detail}`);
}

/** Runs a statement that must be refused by a named constraint. */
async function mustReject(
  db: Client,
  what: string,
  constraint: string,
  sql: string,
  params: unknown[] = [],
): Promise<void> {
  await db.query('SAVEPOINT probe');
  try {
    await db.query(sql, params);
    await db.query('ROLLBACK TO SAVEPOINT probe');
    fail(what, `the database ACCEPTED it — "${constraint}" is missing or too loose`);
  } catch (err) {
    await db.query('ROLLBACK TO SAVEPOINT probe');
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes(constraint)) {
      fail(what, `rejected, but not by "${constraint}": ${message}`);
    } else {
      pass(what);
    }
  }
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  const db = new Client({ connectionString: url });
  await db.connect();
  await db.query('BEGIN');

  try {
    // ── 1 · items_shape: one table, two shapes ──
    console.log('items_shape — actions and clarifications cannot borrow each other’s columns');

    const anchor = await db.query<{ m: string; p: string; u: string }>(`
      SELECT (SELECT id FROM meetings LIMIT 1) AS m,
             (SELECT id FROM projects LIMIT 1) AS p,
             (SELECT id FROM users    LIMIT 1) AS u
    `);
    const a = anchor.rows[0];
    if (!a?.m || !a.p || !a.u) {
      throw new Error('no seed data — run `pnpm db:seed` before asserting invariants');
    }

    const cols =
      'id, ref, type, meeting_id, project_id, description, raised_by_id, "createdAt", "updatedAt"';
    const vals = `'probe', 'PROBE', $1, $2, $3, 'invariant probe', $4, now(), now()`;
    const args = [a.m, a.p, a.u];

    await mustReject(
      db,
      'an ACTION with no due date',
      'items_shape',
      `INSERT INTO items (${cols}, action_status) VALUES (${vals}, 'IN_PROGRESS')`,
      ['ACTION', ...args],
    );
    await mustReject(
      db,
      'an ACTION with no status',
      'items_shape',
      `INSERT INTO items (${cols}, due_date) VALUES (${vals}, DATE '2026-09-30')`,
      ['ACTION', ...args],
    );
    await mustReject(
      db,
      'an ACTION carrying a clarification status',
      'items_shape',
      `INSERT INTO items (${cols}, due_date, action_status, clarification_status)
       VALUES (${vals}, DATE '2026-09-30', 'IN_PROGRESS', 'OPEN')`,
      ['ACTION', ...args],
    );
    await mustReject(
      db,
      'a CLARIFICATION with no status',
      'items_shape',
      `INSERT INTO items (${cols}) VALUES (${vals})`,
      ['CLARIFICATION', ...args],
    );
    await mustReject(
      db,
      'a CLARIFICATION carrying a due date',
      'items_shape',
      `INSERT INTO items (${cols}, clarification_status, due_date)
       VALUES (${vals}, 'OPEN', DATE '2026-09-30')`,
      ['CLARIFICATION', ...args],
    );
    await mustReject(
      db,
      'a CLARIFICATION carrying a priority',
      'items_shape',
      `INSERT INTO items (${cols}, clarification_status, priority)
       VALUES (${vals}, 'OPEN', 'HIGH')`,
      ['CLARIFICATION', ...args],
    );

    // A well-formed row of each shape must still go in, or the constraint is
    // not protecting the data, it is just blocking work.
    await db.query('SAVEPOINT ok');
    await db.query(
      `INSERT INTO items (${cols}, due_date, action_status, priority)
       VALUES (${vals}, DATE '2026-09-30', 'IN_PROGRESS', 'HIGH')`,
      ['ACTION', ...args],
    );
    await db.query('ROLLBACK TO SAVEPOINT ok');
    pass('a well-formed ACTION is still accepted');

    await db.query(
      `INSERT INTO items (${cols}, clarification_status)
       VALUES (${vals}, 'OPEN')`,
      ['CLARIFICATION', ...args],
    );
    await db.query('ROLLBACK TO SAVEPOINT ok');
    pass('a well-formed CLARIFICATION is still accepted');

    // ── 2 · audit_entries is append-only ──
    console.log('\naudit_entries — append only, enforced by the database');

    await db.query(
      `INSERT INTO audit_entries (id, object_type, object_id, object_ref, event, detail, "createdAt")
       VALUES ('probe_audit','PROBE','probe','PROBE','PROBE','original', now())`,
    );

    await db.query(`UPDATE audit_entries SET detail = 'tampered' WHERE id = 'probe_audit'`);
    const afterUpdate = await db.query<{ detail: string | null }>(
      `SELECT detail FROM audit_entries WHERE id = 'probe_audit'`,
    );
    if (afterUpdate.rows[0]?.detail === 'original') {
      pass('UPDATE changes nothing');
    } else {
      fail('UPDATE changes nothing', `detail is now "${afterUpdate.rows[0]?.detail}"`);
    }

    await db.query(`DELETE FROM audit_entries WHERE id = 'probe_audit'`);
    const afterDelete = await db.query(
      `SELECT 1 FROM audit_entries WHERE id = 'probe_audit'`,
    );
    if (afterDelete.rowCount === 1) {
      pass('DELETE removes nothing');
    } else {
      fail('DELETE removes nothing', 'the row was deleted — the append-only rule is missing');
    }
  } finally {
    // Nothing this script does is meant to survive.
    await db.query('ROLLBACK');
    await db.end();
  }

  if (failures > 0) {
    console.error(`\n${failures} invariant${failures === 1 ? '' : 's'} not held.`);
    process.exit(1);
  }
  console.log('\nBoth invariants hold.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
