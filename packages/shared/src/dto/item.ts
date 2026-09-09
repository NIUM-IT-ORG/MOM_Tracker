import { z } from 'zod';
import { cuid, isoDate } from './common.js';

/**
 * One typed form, two shapes — the discriminated union is the API-edge half of
 * the guarantee. The other half is the `items_shape` CHECK constraint in the
 * first migration, so a bad row cannot exist even if a service is wrong.
 *
 * A clarification that arrives carrying `ownerIds`, `dueDate` or `priority` is
 * REJECTED rather than silently stripped: silently dropping a due date the user
 * typed is how people lose trust in a form.
 */

const base = {
  meetingId: cuid,
  projectId: cuid,
  agendaItemId: cuid.optional(),
  description: z.string().trim().min(5, 'describe the item in a sentence'),
  raisedById: cuid,
  remarks: z.string().trim().optional(),
};

export const createActionDto = z
  .object({
    type: z.literal('ACTION'),
    ...base,
    /** Joint ownership: every named officer is equally accountable. */
    ownerIds: z.array(cuid).min(1, 'name at least one responsible officer'),
    dueDate: isoDate,
    priority: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'LOWER']).optional(),
  })
  .strict();

export const createClarificationDto = z
  .object({
    type: z.literal('CLARIFICATION'),
    ...base,
    respondedById: cuid.optional(),
  })
  .strict();

export const createItemDto = z.discriminatedUnion('type', [
  createActionDto,
  createClarificationDto,
]);
export type CreateItemDto = z.infer<typeof createItemDto>;

export const updateItemDto = z
  .object({
    description: z.string().trim().min(5).optional(),
    remarks: z.string().trim().optional(),
    dueDate: isoDate.optional(),
    priority: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'LOWER']).optional(),
  })
  .strict();
export type UpdateItemDto = z.infer<typeof updateItemDto>;

export const setOwnersDto = z.object({ ownerIds: z.array(cuid).min(1) }).strict();

export const reportCompleteDto = z
  .object({
    note: z.string().trim().min(3, 'say what was done'),
    evidenceFileId: cuid.optional(),
  })
  .strict();

export const sendBackDto = z
  .object({ reason: z.string().trim().min(3, 'say why it is going back') })
  .strict();

export const respondDto = z
  .object({ response: z.string().trim().min(3), respondedById: cuid.optional() })
  .strict();

export const itemQueryDto = z.object({
  type: z.enum(['ACTION', 'CLARIFICATION']).optional(),
  status: z.string().optional(),
  projectId: cuid.optional(),
  ownerId: cuid.optional(),
  meetingId: cuid.optional(),
  overdue: z.coerce.boolean().optional(),
  q: z.string().trim().optional(),
});
export type ItemQueryDto = z.infer<typeof itemQueryDto>;
