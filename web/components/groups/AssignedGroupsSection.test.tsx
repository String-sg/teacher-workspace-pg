import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PGApiGroupsAssigned } from '~/api/types';

import { AssignedGroupsSection } from './AssignedGroupsSection';

const empty: PGApiGroupsAssigned = { classes: [], ccaGroups: [] };

describe('AssignedGroupsSection', () => {
  it('renders empty-state copy when no classes or CCAs are assigned', () => {
    render(<AssignedGroupsSection assigned={empty} />);
    expect(screen.getByText(/no assigned groups/i)).toBeInTheDocument();
  });

  it('renders one card per class with the class name and a "Form Class" label', () => {
    render(
      <AssignedGroupsSection
        assigned={{
          classes: [
            {
              classId: 1005,
              className: 'P1 KINDNESS',
              level: 'P1',
              year: 2026,
              role: 'FT',
              studentCount: 30,
            },
          ],
          ccaGroups: [],
        }}
      />,
    );
    expect(screen.getByText('P1 KINDNESS')).toBeInTheDocument();
    expect(screen.getByText(/form class/i)).toBeInTheDocument();
  });

  it('renders one card per CCA with the description and a "CCA" label', () => {
    render(
      <AssignedGroupsSection
        assigned={{
          classes: [],
          ccaGroups: [{ ccaId: 1001, ccaDescription: 'AIR RIFLE / SHOOTING', studentCount: 12 }],
        }}
      />,
    );
    expect(screen.getByText('AIR RIFLE / SHOOTING')).toBeInTheDocument();
    expect(screen.getByText(/^cca$/i)).toBeInTheDocument();
  });
});
