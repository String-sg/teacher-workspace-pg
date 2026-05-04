import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Component as AddStudentsView } from './AddStudentsView';

const stubLoader = () => ({ students: [], classes: [] });

function renderAt(path = '/groups/customGroups/new/addStudents') {
  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/new/addStudents',
        Component: AddStudentsView,
        loader: stubLoader,
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AddStudentsView', () => {
  it('renders the page heading "Add students"', async () => {
    renderAt();
    expect(
      await screen.findByRole('heading', { level: 1, name: /add students/i }),
    ).toBeInTheDocument();
  });

  it('renders a close link back to /groups/customGroups/new', async () => {
    renderAt();
    const close = await screen.findByRole('link', { name: /close/i });
    expect(close).toHaveAttribute('href', '/groups/customGroups/new');
  });
});
