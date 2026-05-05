import { describe, expect, it } from 'vitest';

import type { SelectedEntity } from '~/components/comms/entity-selector';

import { summariseRecipients } from './summarise-recipients';

const group = (overrides: Partial<SelectedEntity> = {}): SelectedEntity => ({
  id: '101',
  label: '4A (2026)',
  type: 'group',
  count: 30,
  groupType: 'class',
  memberNames: ['TAN XIAO MING', 'LEE WEI LING', 'KUMAR RAVI'],
  ...overrides,
});

const individual = (overrides: Partial<SelectedEntity> = {}): SelectedEntity => ({
  id: '501',
  label: 'TAN XIAO MING',
  type: 'individual',
  count: 1,
  ...overrides,
});

describe('summariseRecipients', () => {
  it('returns null when no recipients are selected', () => {
    expect(summariseRecipients([])).toBeNull();
  });

  it('returns the student name from a group memberNames', () => {
    expect(summariseRecipients([group()])).toBe('TAN XIAO MING');
  });

  it('returns null when group has no memberNames', () => {
    expect(summariseRecipients([group({ memberNames: undefined })])).toBeNull();
  });

  it('returns null when group has empty memberNames', () => {
    expect(summariseRecipients([group({ memberNames: [] })])).toBeNull();
  });

  it('returns the individual label directly', () => {
    expect(summariseRecipients([individual()])).toBe('TAN XIAO MING');
  });

  it('prefers individual over group', () => {
    expect(summariseRecipients([group(), individual({ label: 'LEE AH KOW' })])).toBe('LEE AH KOW');
  });

  it('returns first group student name when multiple groups selected', () => {
    expect(
      summariseRecipients([
        group(),
        group({ id: '102', label: '4B (2026)', memberNames: ['WONG MEI LING'] }),
      ]),
    ).toBe('TAN XIAO MING');
  });

  it('uppercases the individual label', () => {
    expect(summariseRecipients([individual({ label: 'tan xiao ming' })])).toBe('TAN XIAO MING');
  });

  it('falls back to null when groups exist but none have memberNames', () => {
    expect(
      summariseRecipients([
        group({ memberNames: undefined }),
        group({ id: '102', memberNames: [] }),
      ]),
    ).toBeNull();
  });
});
