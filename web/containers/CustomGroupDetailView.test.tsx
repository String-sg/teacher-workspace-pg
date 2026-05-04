import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { PGApiCustomGroupDetail } from '~/api/types';

import { Component as CustomGroupDetailView } from './CustomGroupDetailView';

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

function renderAt(loaderData: PGApiCustomGroupDetail = detail) {
  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/:id',
        Component: CustomGroupDetailView,
        loader: () => loaderData,
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

  it('Details tab shows creator metadata + the three action cards', async () => {
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
    expect(screen.getByRole('button', { name: /share group/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete forever/i })).toBeDisabled();
  });
});
