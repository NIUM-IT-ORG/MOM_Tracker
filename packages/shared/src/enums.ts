/**
 * Every enum in the product. These mirror `prisma/schema.prisma` value for
 * value — if you change one, change the other in the same commit.
 *
 * Labels are the UI strings from the prototype. Never re-word them in a
 * component: the register filters, the MoM document and the two dashboard
 * donuts all read from here, and drift shows up as two names for one state.
 */

export const MeetingType = { INSTANT: 'INSTANT', SCHEDULED: 'SCHEDULED' } as const;
export type MeetingType = (typeof MeetingType)[keyof typeof MeetingType];
export const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
  INSTANT: 'Instant',
  SCHEDULED: 'Scheduled',
};

export const MeetingCategory = {
  WEEKLY_PROGRESS_REVIEW: 'WEEKLY_PROGRESS_REVIEW',
  REVIEW_WITH_FINANCIER: 'REVIEW_WITH_FINANCIER',
  STEERING_COMMITTEE: 'STEERING_COMMITTEE',
  TECHNICAL_COORDINATION: 'TECHNICAL_COORDINATION',
} as const;
export type MeetingCategory = (typeof MeetingCategory)[keyof typeof MeetingCategory];
export const MEETING_CATEGORY_LABEL: Record<MeetingCategory, string> = {
  WEEKLY_PROGRESS_REVIEW: 'Weekly Progress Review',
  REVIEW_WITH_FINANCIER: 'Review with Financier',
  STEERING_COMMITTEE: 'Steering Committee',
  TECHNICAL_COORDINATION: 'Technical / Coordination',
};

/**
 * One stage ladder, two journeys through it.
 *   scheduled: PLANNED → AGENDA → INVITEES → INVITEE_INPUTS → CONFIRMED → HELD → MINUTED → CLOSED
 *   instant:   COMPOSED → LIVE → HELD → MINUTED → CLOSED
 * Either may end at CANCELLED. See docs/05-WORKFLOWS.md.
 */
export const MeetingStage = {
  PLANNED: 'PLANNED',
  AGENDA: 'AGENDA',
  INVITEES: 'INVITEES',
  INVITEE_INPUTS: 'INVITEE_INPUTS',
  CONFIRMED: 'CONFIRMED',
  COMPOSED: 'COMPOSED',
  LIVE: 'LIVE',
  HELD: 'HELD',
  MINUTED: 'MINUTED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;
export type MeetingStage = (typeof MeetingStage)[keyof typeof MeetingStage];
export const MEETING_STAGE_LABEL: Record<MeetingStage, string> = {
  PLANNED: 'Planning',
  AGENDA: 'Agenda open',
  INVITEES: 'Invitees added',
  INVITEE_INPUTS: 'Invitee inputs open',
  CONFIRMED: 'Confirmed',
  COMPOSED: 'Composed',
  LIVE: 'In progress',
  HELD: 'Held',
  MINUTED: 'Minuted',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

/** The stages each journey may legally occupy, in order. */
export const SCHEDULED_STAGES: MeetingStage[] = [
  'PLANNED',
  'AGENDA',
  'INVITEES',
  'INVITEE_INPUTS',
  'CONFIRMED',
  'HELD',
  'MINUTED',
  'CLOSED',
];
export const INSTANT_STAGES: MeetingStage[] = [
  'COMPOSED',
  'LIVE',
  'HELD',
  'MINUTED',
  'CLOSED',
];

export const MomState = {
  NOT_GENERATED: 'NOT_GENERATED',
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  RETURNED: 'RETURNED',
  APPROVED: 'APPROVED',
  SIGNED: 'SIGNED',
} as const;
export type MomState = (typeof MomState)[keyof typeof MomState];
export const MOM_STATE_LABEL: Record<MomState, string> = {
  NOT_GENERATED: 'Not generated',
  DRAFT: 'Draft',
  SUBMITTED: 'Awaiting approval',
  RETURNED: 'Returned for changes',
  APPROVED: 'Approved — awaiting signature',
  SIGNED: 'Signed & circulated',
};

/** The diagonal stamp on the rendered document. Empty once signed. */
export const MOM_WATERMARK: Record<MomState, string> = {
  NOT_GENERATED: 'NOT GENERATED',
  DRAFT: 'DRAFT',
  SUBMITTED: 'DRAFT',
  RETURNED: 'DRAFT',
  APPROVED: 'APPROVED',
  SIGNED: '',
};

export const AttendanceMark = {
  PRESENT: 'PRESENT',
  VIRTUAL: 'VIRTUAL',
  ABSENT: 'ABSENT',
} as const;
export type AttendanceMark = (typeof AttendanceMark)[keyof typeof AttendanceMark];
export const ATTENDANCE_LABEL: Record<AttendanceMark, string> = {
  PRESENT: 'Present',
  VIRTUAL: 'Virtual',
  ABSENT: 'Absent',
};

export const RsvpResponse = {
  ACCEPTED: 'ACCEPTED',
  TENTATIVE: 'TENTATIVE',
  DECLINED: 'DECLINED',
} as const;
export type RsvpResponse = (typeof RsvpResponse)[keyof typeof RsvpResponse];
export const RSVP_LABEL: Record<RsvpResponse, string> = {
  ACCEPTED: 'Accepted',
  TENTATIVE: 'Tentative',
  DECLINED: 'Declined',
};

export const ItemType = { ACTION: 'ACTION', CLARIFICATION: 'CLARIFICATION' } as const;
export type ItemType = (typeof ItemType)[keyof typeof ItemType];
export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  ACTION: 'Action',
  CLARIFICATION: 'Clarification',
};

/**
 * Two deliberately different vocabularies. They are not merged and not
 * re-coloured: the dashboard shows both donuts side by side, and a reader must
 * be able to tell at a glance which chart they are looking at.
 */
export const ActionStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  DELAYED: 'DELAYED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  COMPLETED: 'COMPLETED',
} as const;
export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];
export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  IN_PROGRESS: 'In Progress',
  DELAYED: 'Delayed',
  UNDER_REVIEW: 'Under Review',
  COMPLETED: 'Completed',
};
export const ACTION_STATUS_COLOR: Record<ActionStatus, string> = {
  IN_PROGRESS: '#D9990B',
  DELAYED: '#BF3B2B',
  UNDER_REVIEW: '#7D3C98',
  COMPLETED: '#1B8A57',
};
/** The order the donut and the register filters use. */
export const ACTION_STATUS_ORDER: ActionStatus[] = [
  'IN_PROGRESS',
  'DELAYED',
  'UNDER_REVIEW',
  'COMPLETED',
];

export const ClarificationStatus = {
  OPEN: 'OPEN',
  RESPONDED: 'RESPONDED',
  CLOSED: 'CLOSED',
} as const;
export type ClarificationStatus =
  (typeof ClarificationStatus)[keyof typeof ClarificationStatus];
export const CLARIFICATION_STATUS_LABEL: Record<ClarificationStatus, string> = {
  OPEN: 'Open',
  RESPONDED: 'Responded',
  CLOSED: 'Closed',
};
export const CLARIFICATION_STATUS_COLOR: Record<ClarificationStatus, string> = {
  OPEN: '#D9772B',
  RESPONDED: '#2E5FA3',
  CLOSED: '#1B8A57',
};
export const CLARIFICATION_STATUS_ORDER: ClarificationStatus[] = [
  'OPEN',
  'RESPONDED',
  'CLOSED',
];

/**
 * Captured and displayed. It does NOT route confirmation — which priority
 * needs whose sign-off is an open client decision (docs/01-PRD.md §9).
 * See apps/api/src/modules/items/confirmation.policy.ts.
 */
export const Priority = {
  VERY_HIGH: 'VERY_HIGH',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  LOWER: 'LOWER',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];
export const PRIORITY_LABEL: Record<Priority, string> = {
  VERY_HIGH: 'Very High',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  LOWER: 'Lower',
};

export const ProjectStatus = {
  PLANNING: 'PLANNING',
  PROCUREMENT: 'PROCUREMENT',
  UNDER_EXECUTION: 'UNDER_EXECUTION',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  PROCUREMENT: 'Procurement',
  UNDER_EXECUTION: 'Under execution',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
};

export const DocumentType = {
  SANCTION_ORDER: 'SANCTION_ORDER',
  DPR: 'DPR',
  AGREEMENT: 'AGREEMENT',
  PROGRESS_REPORT: 'PROGRESS_REPORT',
  SITE_PHOTO: 'SITE_PHOTO',
  SIGNED_MOM: 'SIGNED_MOM',
  CORRESPONDENCE: 'CORRESPONDENCE',
  OTHER: 'OTHER',
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];
export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  SANCTION_ORDER: 'Sanction order',
  DPR: 'DPR',
  AGREEMENT: 'Agreement',
  PROGRESS_REPORT: 'Progress report',
  SITE_PHOTO: 'Site photo',
  SIGNED_MOM: 'Signed MoM',
  CORRESPONDENCE: 'Correspondence',
  OTHER: 'Other',
};

export const DocumentScope = {
  PROJECT: 'PROJECT',
  MEETING: 'MEETING',
  ITEM: 'ITEM',
} as const;
export type DocumentScope = (typeof DocumentScope)[keyof typeof DocumentScope];

export const Channel = {
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  IN_APP: 'IN_APP',
} as const;
export type Channel = (typeof Channel)[keyof typeof Channel];
export const CHANNEL_LABEL: Record<Channel, string> = {
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  IN_APP: 'In-app',
};

export const DispatchState = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED',
} as const;
export type DispatchState = (typeof DispatchState)[keyof typeof DispatchState];
export const DISPATCH_STATE_LABEL: Record<DispatchState, string> = {
  QUEUED: 'Queued',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
  READ: 'Read',
  FAILED: 'Failed',
};

export const AccountState = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  INVITE_ONLY: 'INVITE_ONLY',
} as const;
export type AccountState = (typeof AccountState)[keyof typeof AccountState];

/** Subject of a notification, and of a manual share. */
export const SubjectType = {
  MEETING: 'MEETING',
  MOM: 'MOM',
  ITEM: 'ITEM',
  PROJECT: 'PROJECT',
  REPORT: 'REPORT',
} as const;
export type SubjectType = (typeof SubjectType)[keyof typeof SubjectType];

/** Project tag colours, from the prototype. Colour-blind validated. */
export const PROJECT_COLOR: Record<string, string> = {
  P1: '#2E5FA3',
  P2: '#D9772B',
  P3: '#B2427A',
};
