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

  it('shows the empty students state with a "0 students added" counter and "No students added yet." copy', () => {
    renderView();
    expect(screen.getByText(/0 students added/i)).toBeInTheDocument();
    expect(screen.getByText(/no students added yet/i)).toBeInTheDocument();
  });

  it('shows an "+ Add Students" dropdown with two disabled items', async () => {
    renderView();
    // `DropdownMenuTrigger asChild` wraps the inner Button, producing two
    // matching elements; the first is the actual trigger.
    const triggers = screen.getAllByRole('button', { name: /add students/i });
    fireEvent.click(triggers[0]);
    const manual = await screen.findByRole('menuitem', { name: /add manually/i });
    const excel = await screen.findByRole('menuitem', { name: /upload via excel/i });
    expect(manual).toHaveAttribute('aria-disabled', 'true');
    expect(excel).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows a Cancel link that navigates back to /groups', async () => {
    renderView();
    const cancel = await screen.findByRole('link', { name: /cancel/i });
    expect(cancel).toHaveAttribute('href', '/groups');
  });

  it('disables the Create Now button when there are no students', () => {
    renderView();
    const create = screen.getByRole('button', { name: /create now/i });
    expect(create).toBeDisabled();

    // Even with a title, no students → still disabled.
    const input = screen.getByLabelText(/title/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Some title' } });
    expect(create).toBeDisabled();
  });
});
