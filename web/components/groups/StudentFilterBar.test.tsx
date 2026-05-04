import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StudentFilterBar } from './StudentFilterBar';

const baseProps = {
  query: '',
  onQueryChange: vi.fn(),
  levelOptions: ['HIGHER 6', 'PRIMARY 1'],
  level: '',
  onLevelChange: vi.fn(),
  classOptions: [
    { label: 'P1 KINDNESS (2026)', value: 1005 },
    { label: 'H6 KINDNESS (2026)', value: 1018 },
  ],
  classId: '',
  onClassChange: vi.fn(),
};

describe('StudentFilterBar', () => {
  it('renders the search input with the spec placeholder', () => {
    render(<StudentFilterBar {...baseProps} />);
    expect(screen.getByPlaceholderText(/search student name or class name/i)).toBeInTheDocument();
  });

  it('emits onQueryChange when the user types', () => {
    const onQueryChange = vi.fn();
    render(<StudentFilterBar {...baseProps} onQueryChange={onQueryChange} />);
    fireEvent.change(screen.getByPlaceholderText(/search student/i), {
      target: { value: 'al' },
    });
    expect(onQueryChange).toHaveBeenCalledWith('al');
  });

  it('renders one Level option per provided level + an "All levels" sentinel', () => {
    render(<StudentFilterBar {...baseProps} />);
    const select = screen.getByLabelText(/level/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.label);
    expect(options).toEqual(['All levels', 'HIGHER 6', 'PRIMARY 1']);
  });

  it('renders one Form Class option per provided class + an "All classes" sentinel', () => {
    render(<StudentFilterBar {...baseProps} />);
    const select = screen.getByLabelText(/form class/i) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.label);
    expect(options).toEqual(['All classes', 'P1 KINDNESS (2026)', 'H6 KINDNESS (2026)']);
  });
});
