import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { PGApiCustomGroupDetail, PGApiSchoolStaff } from '~/api/types';

import { Component as CustomGroupDetailView } from './CustomGroupDetailView';

vi.mock('~/api/client', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    shareCustomGroup: vi.fn().mockResolvedValue(undefined),
  };
});

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

const detail: PGApiCustomGroupDetail = {
  customGroupId: 5,
  name: 'Olympiad Study Group',
  createdBy: 1013,
  createdByName: 'TAN GUANG SHIN',
  isShared: false,
  sharedWith: [],
  students: [
    {
      studentId: 1,
      studentName: 'TAN XIAO MING',
      className: 'H6 KINDNESS',
      indexNumber: 15,
      uinFinNo: 'S9000001A',
      ccas: ['BOXING'],
    },
  ],
  createdAt: '2026-03-01T08:00:00.000Z',
};

const staff: PGApiSchoolStaff[] = [
  { staffId: 1013, name: 'TAN GUANG SHIN', email: 'gs@school.edu.sg', className: null },
  { staffId: 1014, name: 'ALICE TAN', email: 'alice@school.edu.sg', className: 'P3 BEST' },
];

function renderAt(loaderDetail: PGApiCustomGroupDetail = detail) {
  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/:id',
        Component: CustomGroupDetailView,
        loader: () => ({ detail: loaderDetail, staff }),
      },
    ],
    { initialEntries: ['/groups/customGroups/5'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('CustomGroupDetailView', () => {
  it('renders the group name as the page heading', async () => {
    renderAt();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Olympiad Study Group' }),
    ).toBeInTheDocument();
  });

  it('renders both tab triggers', async () => {
    renderAt();
    expect(await screen.findByRole('tab', { name: /students/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /details/i })).toBeInTheDocument();
  });

  it('renders the student count in the Students tab label', async () => {
    renderAt();
    expect(await screen.findByRole('tab', { name: /students \(1\)/i })).toBeInTheDocument();
  });

  it('renders the student list on the Students tab by default', async () => {
    renderAt();
    expect(await screen.findByText('TAN XIAO MING')).toBeInTheDocument();
  });

  it('Details tab shows creator metadata + action cards with Share enabled', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderAt();
    const detailsTab = await screen.findByRole('tab', { name: /details/i });
    fireEvent.click(detailsTab);
    expect(await screen.findByText(/created on/i)).toBeInTheDocument();
    expect(screen.getByText(/TAN GUANG SHIN/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit group/i })).toHaveAttribute(
      'href',
      '/groups/customGroups/5/edit',
    );
    expect(screen.getByRole('button', { name: /share group/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /delete forever/i })).toBeEnabled();
  });

  it('renders shared-with names when group is shared', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const shared: PGApiCustomGroupDetail = {
      ...detail,
      isShared: true,
      sharedWith: [{ staffId: 1014, staffName: 'ALICE TAN' }],
    };
    renderAt(shared);
    const detailsTab = await screen.findByRole('tab', { name: /details/i });
    fireEvent.click(detailsTab);
    expect(await screen.findByText(/group shared with/i)).toBeInTheDocument();
    expect(screen.getByText(/ALICE TAN/)).toBeInTheDocument();
  });
});
