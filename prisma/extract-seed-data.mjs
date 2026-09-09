/**
 * Regenerates `prisma/seed-data.json` from the prototype's own dataset.
 *
 * The prototype is the visual and behavioural source of truth, and its numbers
 * are what every screen is checked against. Copying them by hand would let the
 * two drift within a week, so they are extracted instead.
 *
 *   node prisma/extract-seed-data.mjs [path/to/data.js]
 *
 * The prototype ships as a single HTML file; the extractor accepts either that
 * file or the original `src/data.js` it was built from.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const input = resolve(
  process.argv[2] ?? join(here, '..', 'prototype', 'UCF-MoM-Tracker-Interactive.html'),
);

let source = readFileSync(input, 'utf8');

// From the bundled HTML, take only the data block: everything from `var TODAY`
// up to the first view function. From data.js, take the file as it stands.
if (input.endsWith('.html')) {
  const start = source.indexOf('var TODAY');
  const end = source.indexOf('/* ---------- lookups ----------');
  if (start === -1 || end === -1) {
    throw new Error('Could not find the data block in the prototype. Has it been restructured?');
  }
  source = source.slice(start, end);
}

const box = {};
new Function(
  'g',
  `with (g) { ${source}
    g.OUT = { TODAY, CAPS, DESIGNATIONS, DEPARTMENTS, USERS, PROJECTS, DOC_TYPES, CATEGORIES, MEETINGS, ITEMS };
  }`,
)(box);

const out = join(here, 'seed-data.json');
writeFileSync(out, JSON.stringify(box.OUT, null, 1));

const { USERS, PROJECTS, MEETINGS, ITEMS } = box.OUT;
console.log(
  `Wrote ${out}\n  ${PROJECTS.length} projects · ${USERS.length} users · ` +
    `${MEETINGS.length} meetings · ${ITEMS.length} items · clock ${box.OUT.TODAY}`,
);
