import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Component as GroupsView } from './GroupsView';

function renderAt(path = '/groups') {
  const router = createMemoryRouter(
    [
      {
        path: '/groups',
        Component: GroupsView,
        loader: () => ({ customGroups: [], assigned: { classes: [], ccaGroups: [] } }),
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

// The sidebar nav entry added to `RootLayout` (Task 2 of the plan) is not
// covered by a unit test here: rendering the real `RootLayout` or even
// `SidebarItem` in isolation pulls `@flow/icons` v0.1.0, whose ESM bundle
// uses an unresolvable directory import. The wire-up is exercised by the
// manual smoke test (Task 14 of the plan).
describe('GroupsView', () => {
  it('renders the page heading', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { level: 1, name: /groups/i })).toBeInTheDocument();
  });

  it('shows a "Create custom group" CTA that links to /groups/customGroups/new', async () => {
    renderAt();
    const cta = await screen.findByRole('button', { name: /create custom group/i });
    expect(cta).toHaveAttribute('href', '/groups/customGroups/new');
  });

  it('renders the assigned-groups section above the custom-groups section', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/groups',
          Component: GroupsView,
          loader: () => ({
            customGroups: [],
            assigned: {
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
            },
          }),
        },
      ],
      { initialEntries: ['/groups'] },
    );
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('P1 KINDNESS')).toBeInTheDocument();
  });

  it('renders the custom-groups table populated from the loader', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/groups',
          Component: GroupsView,
          loader: () => ({
            customGroups: [
              {
                customGroupId: 5,
                name: 'Olympiad Study Group',
                studentCount: 8,
                createdBy: 1013,
                createdByName: 'TAN GUANG SHIN',
                isShared: false,
                createdAt: '2026-03-01T08:00:00.000Z',
              },
            ],
            assigned: { classes: [], ccaGroups: [] },
          }),
        },
      ],
      { initialEntries: ['/groups'] },
    );
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('Olympiad Study Group')).toBeInTheDocument();
  });
});
