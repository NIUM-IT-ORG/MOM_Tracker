import { z } from 'zod';

/** A calendar date with no time component. Stored as `date`, sent as `YYYY-MM-DD`. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s + 'T00:00:00Z')), 'not a real date');

/** A wall-clock time of day. A meeting start is an intent, not an instant. */
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:mm');

export const cuid = z.string().min(1);

export const paging = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(200).default(25),
  sort: z
    .string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*:(asc|desc)$/, 'expected field:asc|desc')
    .optional(),
});
export type Paging = z.infer<typeof paging>;

/** A remark that a gate action requires. Empty strings do not count. */
export const requiredRemark = z
  .string()
  .trim()
  .min(3, 'a remark of at least a few words is required');

export const documentInput = z.object({
  // Both a name and a file are mandatory. A file called "scan_0043.pdf" with no
  // name makes the repository unusable within a year; this is enforced here and
  // by NOT NULL in the database, not only in the form.
  name: z.string().trim().min(3, 'give the document a name'),
  type: z.enum([
    'SANCTION_ORDER',
    'DPR',
    'AGREEMENT',
    'PROGRESS_REPORT',
    'SITE_PHOTO',
    'SIGNED_MOM',
    'CORRESPONDENCE',
    'OTHER',
  ]),
  fileId: cuid,
  remarks: z.string().trim().optional(),
});
export type DocumentInput = z.infer<typeof documentInput>;
