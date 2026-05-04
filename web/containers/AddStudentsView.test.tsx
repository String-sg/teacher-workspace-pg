import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { PGApiSchoolClass, PGApiSchoolStudent } from '~/api/types';

import { Component as AddStudentsView } from './AddStudentsView';

const studentRoster: PGApiSchoolStudent[] = [
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
  {
    studentId: 2,
    studentName: 'BERNICE LIM',
    uinFinNo: 'S9000004B',
    classSerialNo: '02',
    classCode: 'P1-01',
    className: 'P1 KINDNESS',
    levelCode: 'P1',
    levelDescription: 'PRIMARY 1',
    cca: [],
  },
];

const classRoster: PGApiSchoolClass[] = [
  {
    type: 'class',
    label: 'P1 KINDNESS (2026)',
    labelDescription: 'P1 KINDNESS',
    value: 1001,
    acadYear: '2026',
    schoolId: 1,
  },
];

function renderWithData(
  studentsList: PGApiSchoolStudent[] = studentRoster,
  classes: PGApiSchoolClass[] = classRoster,
  opts?: { alreadyAdded?: number[] },
) {
  const entry = opts?.alreadyAdded
    ? {
        pathname: '/groups/customGroups/new/addStudents',
        state: { alreadyAdded: opts.alreadyAdded },
      }
    : '/groups/customGroups/new/addStudents';

  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/new/addStudents',
        Component: AddStudentsView,
        loader: () => ({ students: studentsList, classes }),
      },
      { path: '/groups/customGroups/new', element: <div>create page</div> },
    ],
    { initialEntries: [entry] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AddStudentsView', () => {
  it('renders the page heading "Add students"', async () => {
    renderWithData([], []);
    expect(
      await screen.findByRole('heading', { level: 1, name: /add students/i }),
    ).toBeInTheDocument();
  });

  it('renders a close link back to /groups/customGroups/new', async () => {
    renderWithData([], []);
    const close = await screen.findByRole('link', { name: /close/i });
    expect(close).toHaveAttribute('href', '/groups/customGroups/new');
  });

  it('renders the full roster initially', async () => {
    renderWithData();
    expect(await screen.findByText('ALDDIN ANG')).toBeInTheDocument();
    expect(screen.getByText('BERNICE LIM')).toBeInTheDocument();
  });

  it('toggling a row checkbox updates the "Add N selected" button', async () => {
    renderWithData();
    fireEvent.click(await screen.findByRole('checkbox', { name: /select alddin ang/i }));
    expect(screen.getByRole('button', { name: /add 1 selected/i })).toBeEnabled();
  });

  it('search filters rows by name', async () => {
    renderWithData();
    fireEvent.change(await screen.findByPlaceholderText(/search student/i), {
      target: { value: 'bernice' },
    });
    expect(screen.queryByText('ALDDIN ANG')).not.toBeInTheDocument();
    expect(screen.getByText('BERNICE LIM')).toBeInTheDocument();
  });

  it('Level filter narrows by levelDescription', async () => {
    renderWithData();
    fireEvent.change(await screen.findByLabelText(/level/i), {
      target: { value: 'PRIMARY 1' },
    });
    expect(screen.queryByText('ALDDIN ANG')).not.toBeInTheDocument();
    expect(screen.getByText('BERNICE LIM')).toBeInTheDocument();
  });

  it('Add N selected button is disabled when nothing is selected', async () => {
    renderWithData();
    expect(await screen.findByRole('button', { name: /add 0 selected/i })).toBeDisabled();
  });

  it('pre-selects students passed via alreadyAdded state', async () => {
    renderWithData(studentRoster, classRoster, { alreadyAdded: [1] });
    const cb = await screen.findByRole('checkbox', { name: /select alddin ang/i });
    expect(cb).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /select bernice lim/i })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /add 1 selected/i })).toBeEnabled();
  });
});
