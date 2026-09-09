import { describe, expect, it } from 'vitest';
import { createItemDto } from './item.js';
import { ALL_CAPABILITIES, SEED_DESIGNATION_CAPS } from '../capabilities.js';

const ids = { meetingId: 'm1', projectId: 'p1', raisedById: 'u1' };

describe('createItemDto — the two shapes', () => {
  it('accepts an action with owners and a due date', () => {
    const r = createItemDto.safeParse({
      type: 'ACTION',
      ...ids,
      description: 'Deploy an additional work crew in Zone A',
      ownerIds: ['u8'],
      dueDate: '2026-09-25',
      priority: 'HIGH',
    });
    expect(r.success).toBe(true);
  });

  it('rejects an action with no owners — joint ownership still needs one name', () => {
    const r = createItemDto.safeParse({
      type: 'ACTION',
      ...ids,
      description: 'Deploy an additional work crew in Zone A',
      ownerIds: [],
      dueDate: '2026-09-25',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an action with no due date', () => {
    const r = createItemDto.safeParse({
      type: 'ACTION',
      ...ids,
      description: 'Deploy an additional work crew in Zone A',
      ownerIds: ['u8'],
    });
    expect(r.success).toBe(false);
  });

  it('accepts a clarification with no owners and no date', () => {
    const r = createItemDto.safeParse({
      type: 'CLARIFICATION',
      ...ids,
      description: 'Is barricading cost met from the contingency head?',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a clarification carrying a due date rather than dropping it', () => {
    const r = createItemDto.safeParse({
      type: 'CLARIFICATION',
      ...ids,
      description: 'Is barricading cost met from the contingency head?',
      dueDate: '2026-09-25',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a clarification carrying a priority', () => {
    const r = createItemDto.safeParse({
      type: 'CLARIFICATION',
      ...ids,
      description: 'Is barricading cost met from the contingency head?',
      priority: 'HIGH',
    });
    expect(r.success).toBe(false);
  });
});

describe('seed capability grants', () => {
  it('only grants capabilities that exist', () => {
    for (const [designation, caps] of Object.entries(SEED_DESIGNATION_CAPS)) {
      for (const cap of caps) {
        expect(ALL_CAPABILITIES, `${designation} grants unknown "${cap}"`).toContain(cap);
      }
    }
  });

  it('gives the external invitee nothing', () => {
    expect(SEED_DESIGNATION_CAPS.EXT).toEqual([]);
  });

  it('keeps approval away from the coordinator — nobody approves their own MoM', () => {
    expect(SEED_DESIGNATION_CAPS.MC).not.toContain('approve_mom');
  });
});
