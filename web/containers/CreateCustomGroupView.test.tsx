import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Component as CreateCustomGroupView } from './CreateCustomGroupView';

function renderView() {
  const router = createMemoryRouter(
    [{ path: '/groups/customGroups/new', Component: CreateCustomGroupView }],
    { initialEntries: ['/groups/customGroups/new'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('CreateCustomGroupView', () => {
  it('renders the page heading "Create new group"', async () => {
    renderView();
    expect(
      await screen.findByRole('heading', { level: 1, name: /create new group/i }),
    ).toBeInTheDocument();
  });
});
