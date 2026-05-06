import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExcelUploadPanel } from './ExcelUploadPanel';

vi.mock('./parse-excel-file', () => ({
  parseExcelFile: vi.fn(),
}));

vi.mock('./validate-upload-students', () => ({
  validateUploadStudents: vi.fn(),
}));

import { parseExcelFile } from './parse-excel-file';
import { validateUploadStudents } from './validate-upload-students';

const mockedParse = vi.mocked(parseExcelFile);
const mockedValidate = vi.mocked(validateUploadStudents);

function xlsxFile(name = 'students.xlsx') {
  return new File(['fake'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('ExcelUploadPanel', () => {
  it('renders upload instructions for MS schools', () => {
    render(<ExcelUploadPanel isIhl={false} onResult={vi.fn()} />);
    expect(screen.getAllByText(/Name/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Class/).length).toBeGreaterThan(0);
  });

  it('renders upload instructions for IHL schools', () => {
    render(<ExcelUploadPanel isIhl={true} onResult={vi.fn()} />);
    expect(screen.getAllByText(/Student ID/).length).toBeGreaterThan(0);
  });

  it('shows file input accepting only .xlsx', () => {
    render(<ExcelUploadPanel isIhl={false} onResult={vi.fn()} />);
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    expect(input.accept).toContain('.xlsx');
  });

  it('shows validation error when file is blank', async () => {
    mockedParse.mockResolvedValue([]);

    render(<ExcelUploadPanel isIhl={false} onResult={vi.fn()} />);
    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/empty/i);
    });
  });

  it('shows validation error for missing headers (MS)', async () => {
    mockedParse.mockResolvedValue([{ StudentId: 'S123' }]);

    render(<ExcelUploadPanel isIhl={false} onResult={vi.fn()} />);
    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Name.*Class/);
    });
  });

  it('shows validation error for duplicate headers', async () => {
    mockedParse.mockResolvedValue([{ Name: 'A', Class: '1A', name: 'dup' }]);

    render(<ExcelUploadPanel isIhl={false} onResult={vi.fn()} />);
    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/more than once/);
    });
  });

  it('shows validation error when over max capacity', async () => {
    const rows = Array.from({ length: 5001 }, (_, i) => ({
      Name: `Student ${i}`,
      Class: '1A',
    }));
    mockedParse.mockResolvedValue(rows);

    render(<ExcelUploadPanel isIhl={false} onResult={vi.fn()} />);
    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/5000/);
    });
  });

  it('calls validateUploadStudents and onResult on success (MS)', async () => {
    const rows = [
      { Name: 'Alice', Class: '1A' },
      { Name: 'Bob', Class: '2B' },
    ];
    mockedParse.mockResolvedValue(rows);

    const validStudents = [
      {
        pgStudentId: 1,
        studentId: 'S1',
        studentName: 'Alice',
        className: '1A',
        classCode: 'C1',
        levelCode: 'L1',
        levelCodeDescription: 'Level 1',
      },
    ];
    const invalidStudents = [{ name: 'Bob', className: '2B', message: 'Not found', row: 3 }];
    mockedValidate.mockResolvedValue({ validStudents, invalidStudents });

    const onResult = vi.fn();
    render(<ExcelUploadPanel isIhl={false} onResult={onResult} />);
    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith({ validStudents, invalidStudents });
    });

    expect(mockedValidate).toHaveBeenCalledWith({
      type: 'ms',
      students: [
        { name: 'Alice', className: '1A' },
        { name: 'Bob', className: '2B' },
      ],
    });
  });

  it('calls validateUploadStudents with IHL payload shape', async () => {
    const rows = [{ 'Student ID': 'S1111111A' }, { 'Student ID': 'S2222222B' }];
    mockedParse.mockResolvedValue(rows);
    mockedValidate.mockResolvedValue({ validStudents: [], invalidStudents: [] });

    const onResult = vi.fn();
    render(<ExcelUploadPanel isIhl={true} onResult={onResult} />);
    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    await waitFor(() => {
      expect(mockedValidate).toHaveBeenCalledWith({
        type: 'ihl',
        students: [{ studentId: 'S1111111A' }, { studentId: 'S2222222B' }],
      });
    });
  });

  it('shows server error when validateUploadStudents rejects', async () => {
    const rows = [{ Name: 'Alice', Class: '1A' }];
    mockedParse.mockResolvedValue(rows);
    mockedValidate.mockRejectedValue(new Error('Processing failed'));

    render(<ExcelUploadPanel isIhl={false} onResult={vi.fn()} />);
    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/unexpected error/i);
    });
  });

  it('shows loading state while validating', async () => {
    const rows = [{ Name: 'Alice', Class: '1A' }];
    mockedParse.mockResolvedValue(rows);
    let resolveValidation: (v: unknown) => void;
    mockedValidate.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveValidation = resolve;
        }),
    );

    render(<ExcelUploadPanel isIhl={false} onResult={vi.fn()} />);
    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    await waitFor(() => {
      expect(screen.getByText(/validating/i)).toBeInTheDocument();
    });

    resolveValidation!({ validStudents: [], invalidStudents: [] });

    await waitFor(() => {
      expect(screen.queryByText(/validating/i)).not.toBeInTheDocument();
    });
  });

  it('rejects files over 5MB', async () => {
    render(<ExcelUploadPanel isIhl={false} onResult={vi.fn()} />);
    const input = screen.getByLabelText(/upload/i);
    const bigFile = new File(['x'.repeat(6 * 1024 * 1024)], 'big.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fireEvent.change(input, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/5\s*MB/i);
    });
  });
});
