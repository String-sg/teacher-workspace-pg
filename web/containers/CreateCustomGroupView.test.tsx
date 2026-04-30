import { fireEvent, render, screen } from '@testing-library/react';
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

  it('allows typing into the title input and shows the remaining-character counter', () => {
    renderView();
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Olympiad Squad' } });
    expect(input.value).toBe('Olympiad Squad');
    expect(screen.getByText(/106 characters left/i)).toBeInTheDocument();
  });

  it('does not allow typing past 120 characters', () => {
    renderView();
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a'.repeat(150) } });
    expect(input.value.length).toBe(120);
    expect(screen.getByText(/0 characters left/i)).toBeInTheDocument();
  });
});
