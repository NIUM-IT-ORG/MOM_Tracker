import { z } from 'zod';
import { cuid } from './common.js';

/**
 * Manual share, on top of the 27 automatic events. Recipients are validated
 * against the sharer's own project scope in the service — you cannot share
 * with someone you cannot see. That check belongs on the server; the picker
 * in the UI is a convenience.
 */
export const shareDto = z
  .object({
    subjectType: z.enum(['MEETING', 'MOM', 'ITEM', 'PROJECT', 'REPORT']),
    subjectId: z.string().min(1),
    recipientIds: z.array(cuid).min(1, 'choose at least one recipient'),
    channels: z
      .array(z.enum(['EMAIL', 'WHATSAPP', 'IN_APP']))
      .min(1, 'choose at least one channel'),
    attachmentFileIds: z.array(cuid).default([]),
    subject: z.string().trim().min(3),
    /** Email body only — WhatsApp goes out as a pre-approved template. */
    note: z.string().trim().optional(),
    templateKey: z.string().trim().optional(),
  })
  .strict()
  .refine((s) => !s.channels.includes('WHATSAPP') || !!s.templateKey, {
    message: 'WhatsApp needs a pre-approved template',
    path: ['templateKey'],
  });
export type ShareDto = z.infer<typeof shareDto>;

export const notificationPreferencesDto = z
  .object({
    email: z.boolean(),
    whatsapp: z.boolean(),
    /** Reminder classes can be suppressed. Approvals and escalations cannot. */
    quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    mutedEventCodes: z.array(z.string()).default([]),
  })
  .strict();
