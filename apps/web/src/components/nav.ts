import type { Capability } from '@mom/shared';

export interface NavItem {
  href: string;
  label: string;
  /** Undefined means everyone. Otherwise the designation must carry this. */
  cap?: Capability;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

/**
 * The navigation, in the prototype's order.
 *
 * Items the signed-in designation cannot use render DISABLED, never hidden —
 * see docs/07-UI-SPEC.md rule 1. Hiding makes the product feel broken and
 * leaves people unable to ask for access to something they never saw.
 */
export const NAV: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { href: '/', label: 'Dashboard' },
      { href: '/calendar', label: 'Calendar' },
    ],
  },
  {
    group: 'Meetings',
    items: [
      { href: '/meetings', label: 'Meetings' },
      { href: '/minutes', label: 'Minutes editor', cap: 'record_minutes' },
      { href: '/mom', label: 'MoM register' },
    ],
  },
  {
    group: 'Tracking',
    items: [
      { href: '/register', label: 'Actions & clarifications' },
      { href: '/reports', label: 'Reports' },
    ],
  },
  {
    group: 'Masters',
    items: [
      { href: '/projects', label: 'Projects' },
      { href: '/people', label: 'People & designations' },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/access', label: 'Access control', cap: 'manage_access' },
      { href: '/communications', label: 'Communication log' },
      { href: '/audit', label: 'Audit trail' },
      { href: '/help', label: 'How it works' },
    ],
  },
];
