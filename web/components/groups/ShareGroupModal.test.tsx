import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { PGApiSchoolStaff } from '~/api/types';

import { ShareGroupModal } from './ShareGroupModal';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const schoolStaff: PGApiSchoolStaff[] = [
  { staffId: 1001, name: 'ALICE TAN', email: 'alice@school.edu.sg', className: 'P3 BEST' },
  { staffId: 1002, name: 'BOB LIM', email: 'bob@school.edu.sg', className: null },
  { staffId: 1003, name: 'CHARLIE NG', email: 'charlie@school.edu.sg', className: 'P1 KINDNESS' },
];

function renderModal(
  onShare = vi.fn().mockResolvedValue(undefined),
  alreadySharedStaffIds: number[] = [],
) {
  const onClose = vi.fn();
  render(
    <ShareGroupModal
      open={true}
      onClose={onClose}
      staff={schoolStaff}
      creatorStaffId={1001}
      alreadySharedStaffIds={alreadySharedStaffIds}
      onShare={onShare}
    />,
  );
  return { onShare, onClose };
}

describe('ShareGroupModal', () => {
  it('renders the dialog title "Share group"', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: 'Share group' })).toBeInTheDocument();
  });

  it('renders the permissions bullet list', () => {
    renderModal();
    expect(screen.getByText(/view and send to the group/i)).toBeInTheDocument();
    expect(screen.getByText(/edit the group name/i)).toBeInTheDocument();
    expect(screen.getByText(/add or delete students/i)).toBeInTheDocument();
    expect(screen.getByText(/share the group with other staff/i)).toBeInTheDocument();
  });

  it('renders the "Share group" button disabled when no staff selected', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /share group/i })).toBeDisabled();
  });

  it('renders the button disabled even when staff are already shared', () => {
    renderModal(vi.fn().mockResolvedValue(undefined), [1002]);
    expect(screen.getByRole('button', { name: /share group/i })).toBeDisabled();
  });
});
