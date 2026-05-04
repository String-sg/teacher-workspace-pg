import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { PGApiCustomGroupDetail } from '~/api/types';

import { Component as EditCustomGroupView } from './EditCustomGroupView';

vi.mock('~/api/client', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    updateCustomGroup: vi.fn().mockResolvedValue(undefined),
  };
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

function renderAt() {
  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/:id/edit',
        Component: EditCustomGroupView,
        loader: () => detail,
      },
      { path: '/groups/customGroups/:id', element: <div>detail page</div> },
    ],
    { initialEntries: ['/groups/customGroups/5/edit'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('EditCustomGroupView', () => {
  it('renders the page heading "Edit group"', async () => {
    renderAt();
    expect(
      await screen.findByRole('heading', { level: 1, name: /edit group/i }),
    ).toBeInTheDocument();
  });

  it('seeds the title input from the loaded detail', async () => {
    renderAt();
    const input = (await screen.findByLabelText(/title/i)) as HTMLInputElement;
    expect(input.value).toBe('Olympiad Study Group');
  });

  it('shows the existing students count and names', async () => {
    renderAt();
    expect(await screen.findByText(/1 student added/i)).toBeInTheDocument();
    expect(screen.getByText('TAN XIAO MING')).toBeInTheDocument();
  });

  it('clicking Save calls updateCustomGroup and navigates to the detail page', async () => {
    const { updateCustomGroup } = await import('~/api/client');
    renderAt();
    fireEvent.change(await screen.findByLabelText(/title/i), {
      target: { value: 'Olympiad Squad' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await screen.findByText('detail page');
    expect(updateCustomGroup).toHaveBeenCalledWith(5, {
      name: 'Olympiad Squad',
      studentIds: [1],
    });
  });
});
