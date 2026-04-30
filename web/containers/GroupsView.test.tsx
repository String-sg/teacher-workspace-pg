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

describe('GroupsView', () => {
  it('renders the page heading', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { level: 1, name: /groups/i })).toBeInTheDocument();
  });
});
