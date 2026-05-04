import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PGApiCustomGroupDetailStudent } from '~/api/types';

import { StudentsByClassList } from './StudentsByClassList';

const xiaoming: PGApiCustomGroupDetailStudent = {
  studentId: 1,
  studentName: 'TAN XIAO MING',
  className: 'H6 KINDNESS',
  indexNumber: 15,
  uinFinNo: 'S9000001A',
  ccas: ['BOXING'],
};
const ahkow: PGApiCustomGroupDetailStudent = {
  studentId: 2,
  studentName: 'LIM AH KOW',
  className: 'P1 KINDNESS',
  indexNumber: 2,
  uinFinNo: 'S9000002B',
  ccas: [],
};

describe('StudentsByClassList', () => {
  it('groups students by className and shows count per group', () => {
    render(<StudentsByClassList students={[xiaoming, ahkow]} />);
    expect(screen.getByText(/H6 KINDNESS \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/P1 KINDNESS \(1\)/)).toBeInTheDocument();
  });

  it('renders student name + UIN under each class', () => {
    render(<StudentsByClassList students={[xiaoming]} />);
    expect(screen.getByText('TAN XIAO MING')).toBeInTheDocument();
    expect(screen.getByText('S9000001A')).toBeInTheDocument();
  });

  it('renders empty-state copy when there are no students', () => {
    render(<StudentsByClassList students={[]} />);
    expect(screen.getByText(/no students in this group/i)).toBeInTheDocument();
  });
});
