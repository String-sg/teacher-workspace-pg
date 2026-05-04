import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PGApiSchoolStudent } from '~/api/types';

import { StudentResultsTable } from './StudentResultsTable';

const aldddin: PGApiSchoolStudent = {
  studentId: 1025,
  studentName: 'ALDDIN ANG MO KIO',
  uinFinNo: 'S9000003A',
  classSerialNo: '15',
  classCode: 'H6-05',
  className: 'H6 KINDNESS',
  levelCode: 'H6',
  levelDescription: 'HIGHER 6',
  cca: [],
};

describe('StudentResultsTable', () => {
  it('renders empty state copy when there are no rows', () => {
    render(
      <StudentResultsTable
        rows={[]}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    expect(screen.getByText(/no students match/i)).toBeInTheDocument();
  });

  it('renders one row per student with name, UIN, class', () => {
    render(
      <StudentResultsTable
        rows={[aldddin]}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    expect(screen.getByText('ALDDIN ANG MO KIO')).toBeInTheDocument();
    expect(screen.getByText(/S9000003A/i)).toBeInTheDocument();
    expect(screen.getByText(/H6 KINDNESS/i)).toBeInTheDocument();
  });

  it('calls onToggle with the studentId when a row checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(
      <StudentResultsTable
        rows={[aldddin]}
        selectedIds={new Set()}
        onToggle={onToggle}
        onToggleAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /select alddin/i }));
    expect(onToggle).toHaveBeenCalledWith(1025);
  });

  it('calls onToggleAll with the visible row ids when select-all is clicked', () => {
    const onToggleAll = vi.fn();
    render(
      <StudentResultsTable
        rows={[aldddin]}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={onToggleAll}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /select all on this page/i }));
    expect(onToggleAll).toHaveBeenCalledWith([1025]);
  });
});
