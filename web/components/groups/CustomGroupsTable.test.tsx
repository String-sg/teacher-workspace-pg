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

describe('CustomGroupsTable', () => {
  it('renders empty state copy when there are no groups', () => {
    renderTable([]);
    expect(screen.getByText(/no custom groups yet/i)).toBeInTheDocument();
  });
});
