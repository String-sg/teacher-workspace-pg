import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { PGApiCustomGroupSummary } from '~/api/types';

import { CustomGroupsTable } from './CustomGroupsTable';

function renderTable(groups: PGApiCustomGroupSummary[]) {
  return render(
    <MemoryRouter>
      <CustomGroupsTable groups={groups} />
    </MemoryRouter>,
  );
}

const olympiad: PGApiCustomGroupSummary = {
  customGroupId: 5,
  name: 'Olympiad Study Group',
  studentCount: 8,
  createdBy: 1013,
  createdByName: 'TAN GUANG SHIN',
  isShared: false,
  createdAt: '2026-03-01T08:00:00.000Z',
};

describe('CustomGroupsTable', () => {
  it('renders empty state copy when there are no groups', () => {
    renderTable([]);
    expect(screen.getByText(/no custom groups yet/i)).toBeInTheDocument();
  });

  it('renders one row per group with name, student count, and creator', () => {
    renderTable([olympiad]);
    expect(screen.getByText('Olympiad Study Group')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('TAN GUANG SHIN')).toBeInTheDocument();
  });

  it('renders the created-on date in en-SG short format', () => {
    renderTable([olympiad]);
    // Intl.DateTimeFormat('en-SG', { day, month: short, year }) → "1 Mar 2026"
    expect(screen.getByText('1 Mar 2026')).toBeInTheDocument();
  });

  it('group name is a link to the detail page', () => {
    renderTable([olympiad]);
    const link = screen.getByRole('link', { name: 'Olympiad Study Group' });
    expect(link).toHaveAttribute('href', '/groups/customGroups/5');
  });
});
