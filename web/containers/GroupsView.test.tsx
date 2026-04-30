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
});
