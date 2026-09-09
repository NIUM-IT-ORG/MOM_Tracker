/**
 * The seeded database must show the same figures as the prototype.
 *
 * That comparison is the whole review method for this project: open
 * `prototype/UCF-MoM-Tracker-Interactive.html` beside the running application
 * and see whether the numbers match. If the seed quietly drifts, the method
 * stops working and nobody notices for a month — so it is asserted in CI.
 *
 *   pnpm assert:seed
 */
import 'dotenv/config';
import { Client } from 'pg';

interface Check {
  what: string;
  sql: string;
  expected: number;
}

const CHECKS: Check[] = [
  { what: 'projects', sql: 'SELECT count(*) FROM projects', expected: 3 },
  { what: 'ULBs', sql: 'SELECT count(*) FROM ulbs', expected: 6 },
  { what: 'designations', sql: 'SELECT count(*) FROM designations', expected: 9 },
  { what: 'users', sql: 'SELECT count(*) FROM users', expected: 14 },
  { what: 'meetings', sql: 'SELECT count(*) FROM meetings', expected: 7 },
  {
    what: 'instant meetings',
    sql: "SELECT count(*) FROM meetings WHERE type = 'INSTANT'",
    expected: 2,
  },
  { what: 'items', sql: 'SELECT count(*) FROM items', expected: 19 },
  {
    what: 'actions',
    sql: "SELECT count(*) FROM items WHERE type = 'ACTION'",
    expected: 14,
  },
  {
    what: 'clarifications',
    sql: "SELECT count(*) FROM items WHERE type = 'CLARIFICATION'",
    expected: 5,
  },
  { what: 'documents', sql: 'SELECT count(*) FROM documents', expected: 15 },

  // The ones that matter most. Circulation activates: an item whose signed MoM
  // has not gone out is inert, and must not appear in any dashboard count. Two
  // of the seven meetings are circulated; everything else is still waiting.
  {
    what: 'activated items (from a circulated MoM)',
    sql: 'SELECT count(*) FROM items WHERE activated_at IS NOT NULL',
    expected: 13,
  },
  {
    what: 'inert items (raised, not yet circulated)',
    sql: 'SELECT count(*) FROM items WHERE activated_at IS NULL',
    expected: 6,
  },

  /*
   * The two dashboard donuts, which read ONLY activated items. This is the
   * distinction worth guarding: unscoped, "In Progress" is 7; scoped to what
   * has actually been circulated it is 4, and 4 is what the prototype shows.
   * A dashboard that counts inert items is the single easiest way to get this
   * product wrong, so the seed asserts the difference explicitly.
   */
  {
    what: 'donut · actions In Progress',
    sql: `SELECT count(*) FROM items
          WHERE activated_at IS NOT NULL AND action_status = 'IN_PROGRESS'`,
    expected: 4,
  },
  {
    what: 'donut · actions Delayed',
    sql: `SELECT count(*) FROM items
          WHERE activated_at IS NOT NULL AND action_status = 'DELAYED'`,
    expected: 2,
  },
  {
    what: 'donut · actions Under Review',
    sql: `SELECT count(*) FROM items
          WHERE activated_at IS NOT NULL AND action_status = 'UNDER_REVIEW'`,
    expected: 2,
  },
  {
    what: 'donut · actions Completed',
    sql: `SELECT count(*) FROM items
          WHERE activated_at IS NOT NULL AND action_status = 'COMPLETED'`,
    expected: 3,
  },
  {
    what: 'donut · clarifications Open',
    sql: `SELECT count(*) FROM items
          WHERE activated_at IS NOT NULL AND clarification_status = 'OPEN'`,
    expected: 1,
  },
  {
    what: 'donut · clarifications Responded',
    sql: `SELECT count(*) FROM items
          WHERE activated_at IS NOT NULL AND clarification_status = 'RESPONDED'`,
    expected: 1,
  },

  // Joint ownership is real: several actions carry more than one officer, and
  // none of them has a "primary".
  {
    what: 'actions with more than one owner',
    sql: `SELECT count(*) FROM (
            SELECT item_id FROM item_owners GROUP BY item_id HAVING count(*) > 1
          ) t`,
    expected: 6,
  },

  // Every action has at least one owner and a due date; no clarification has either.
  {
    what: 'actions missing an owner',
    sql: `SELECT count(*) FROM items i
          WHERE i.type = 'ACTION'
            AND NOT EXISTS (SELECT 1 FROM item_owners o WHERE o.item_id = i.id)`,
    expected: 0,
  },
  {
    what: 'clarifications wrongly carrying an owner',
    sql: `SELECT count(*) FROM items i
          JOIN item_owners o ON o.item_id = i.id
          WHERE i.type = 'CLARIFICATION'`,
    expected: 0,
  },
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  const db = new Client({ connectionString: url });
  await db.connect();

  let failures = 0;
  try {
    for (const check of CHECKS) {
      const r = await db.query<{ count: string }>(check.sql);
      const actual = Number(r.rows[0]?.count ?? -1);
      if (actual === check.expected) {
        console.log(`  ✓ ${check.what}: ${actual}`);
      } else {
        failures += 1;
        console.error(`  ✗ ${check.what}: expected ${check.expected}, found ${actual}`);
      }
    }
  } finally {
    await db.end();
  }

  if (failures > 0) {
    console.error(
      `\n${failures} figure${failures === 1 ? '' : 's'} disagree with the prototype.\n` +
        'Either the seed drifted, or the prototype changed and seed-data.json ' +
        'needs regenerating with `node prisma/extract-seed-data.mjs`.',
    );
    process.exit(1);
  }
  console.log('\nThe seed matches the prototype.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
