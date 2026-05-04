import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { Component as CreateCustomGroupView } from './CreateCustomGroupView';

vi.mock('~/api/client', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    createCustomGroup: vi.fn().mockResolvedValue({ customGroupId: 42 }),
  };
});

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

  it('shows an "+ Add Students" dropdown with "Add manually" enabled (links to subpage) and "Upload via Excel" disabled', async () => {
    renderView();
    const triggers = screen.getAllByRole('button', { name: /add students/i });
    fireEvent.click(triggers[0]);
    const manual = await screen.findByRole('menuitem', { name: /add manually/i });
    const excel = await screen.findByRole('menuitem', { name: /upload via excel/i });
    expect(manual).not.toHaveAttribute('aria-disabled', 'true');
    expect(excel).toHaveAttribute('aria-disabled', 'true');
    // The menuitem renders a Link — assert it points at the subpage.
    expect(manual.querySelector('a')).toHaveAttribute(
      'href',
      '/groups/customGroups/new/addStudents',
    );
  });

  it('clicking "Create Now" with a title and students POSTs and navigates to /groups/customGroups/:id', async () => {
    const { createCustomGroup } = await import('~/api/client');
    const router = createMemoryRouter(
      [
        { path: '/groups/customGroups/new', Component: CreateCustomGroupView },
        { path: '/groups/customGroups/:id', element: <div>detail page</div> },
      ],
      {
        initialEntries: [
          {
            pathname: '/groups/customGroups/new',
            state: {
              addedStudents: [
                {
                  studentId: 1,
                  studentName: 'ALDDIN',
                  uinFinNo: 'S9000003A',
                  classSerialNo: '15',
                  classCode: 'H6-05',
                  className: 'H6 KINDNESS',
                  levelCode: 'H6',
                  levelDescription: 'HIGHER 6',
                  cca: [],
                },
              ],
            },
          },
        ],
      },
    );
    render(<RouterProvider router={router} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Olympiad' } });
    fireEvent.click(screen.getByRole('button', { name: /create now/i }));

    await screen.findByText('detail page');
    expect(createCustomGroup).toHaveBeenCalledWith({ name: 'Olympiad', studentIds: [1] });
  });

  it('reads addedStudents from router state and renders counter + names', async () => {
    const router = createMemoryRouter(
      [{ path: '/groups/customGroups/new', Component: CreateCustomGroupView }],
      {
        initialEntries: [
          {
            pathname: '/groups/customGroups/new',
            state: {
              addedStudents: [
                {
                  studentId: 1,
                  studentName: 'ALDDIN ANG',
                  uinFinNo: 'S9000003A',
                  classSerialNo: '15',
                  classCode: 'H6-05',
                  className: 'H6 KINDNESS',
                  levelCode: 'H6',
                  levelDescription: 'HIGHER 6',
                  cca: [],
                },
              ],
            },
          },
        ],
      },
    );
    render(<RouterProvider router={router} />);
    expect(await screen.findByText(/1 student added/i)).toBeInTheDocument();
    expect(screen.getByText('ALDDIN ANG')).toBeInTheDocument();
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
