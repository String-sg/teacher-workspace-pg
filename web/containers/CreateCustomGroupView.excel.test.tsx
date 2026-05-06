import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('~/components/groups/parse-excel-file', () => ({
  parseExcelFile: vi.fn(),
}));

vi.mock('~/components/groups/validate-upload-students', () => ({
  validateUploadStudents: vi.fn(),
}));

import { parseExcelFile } from '~/components/groups/parse-excel-file';
import { validateUploadStudents } from '~/components/groups/validate-upload-students';

const mockedParse = vi.mocked(parseExcelFile);
const mockedValidate = vi.mocked(validateUploadStudents);

function renderView() {
  const router = createMemoryRouter(
    [{ path: '/groups/customGroups/new', Component: CreateCustomGroupView }],
    { initialEntries: ['/groups/customGroups/new'] },
  );
  return render(<RouterProvider router={router} />);
}

function xlsxFile(name = 'students.xlsx') {
  return new File(['fake'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('CreateCustomGroupView — Excel upload integration', () => {
  it('enables "Upload via Excel" in the dropdown when no students exist', async () => {
    renderView();
    const trigger = screen.getAllByRole('button', { name: /add students/i })[0];
    fireEvent.click(trigger);
    const excel = await screen.findByRole('menuitem', { name: /upload via excel/i });
    expect(excel).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('clicking "Upload via Excel" shows the ExcelUploadPanel', async () => {
    renderView();
    const trigger = screen.getAllByRole('button', { name: /add students/i })[0];
    fireEvent.click(trigger);
    const excel = await screen.findByRole('menuitem', { name: /upload via excel/i });
    fireEvent.click(excel);

    await waitFor(() => {
      expect(screen.getByLabelText(/upload/i)).toBeInTheDocument();
    });
  });

  it('adds valid students from Excel upload to the student list', async () => {
    mockedParse.mockResolvedValue([
      { Name: 'Alice Tan', Class: '1A' },
      { Name: 'Bob Lee', Class: '2B' },
    ]);
    mockedValidate.mockResolvedValue({
      validStudents: [
        {
          pgStudentId: 101,
          studentId: 'S1111111A',
          studentName: 'Alice Tan',
          className: '1A',
          classCode: 'P1-01',
          levelCode: 'P1',
          levelCodeDescription: 'PRIMARY 1',
        },
        {
          pgStudentId: 102,
          studentId: 'S2222222B',
          studentName: 'Bob Lee',
          className: '2B',
          classCode: 'P2-01',
          levelCode: 'P2',
          levelCodeDescription: 'PRIMARY 2',
        },
      ],
      invalidStudents: [],
    });

    renderView();

    // Open dropdown, click Upload via Excel
    fireEvent.click(screen.getAllByRole('button', { name: /add students/i })[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /upload via excel/i }));

    // Upload a file
    const input = await screen.findByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    // Results screen shows, click confirm to add
    const confirm = await screen.findByRole('button', { name: /add 2 student/i });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(screen.getByText('Alice Tan')).toBeInTheDocument();
      expect(screen.getByText('Bob Lee')).toBeInTheDocument();
    });
    expect(screen.getByText(/2 students added/i)).toBeInTheDocument();
  });

  it('shows invalid students with error messages after upload', async () => {
    mockedParse.mockResolvedValue([
      { Name: 'Alice Tan', Class: '1A' },
      { Name: 'Unknown', Class: '9Z' },
    ]);
    mockedValidate.mockResolvedValue({
      validStudents: [
        {
          pgStudentId: 101,
          studentId: 'S1111111A',
          studentName: 'Alice Tan',
          className: '1A',
          classCode: 'P1-01',
          levelCode: 'P1',
          levelCodeDescription: 'PRIMARY 1',
        },
      ],
      invalidStudents: [{ name: 'Unknown', className: '9Z', message: 'Student not found', row: 3 }],
    });

    renderView();

    fireEvent.click(screen.getAllByRole('button', { name: /add students/i })[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /upload via excel/i }));

    const input = await screen.findByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    await waitFor(() => {
      expect(screen.getByText(/1 valid/i)).toBeInTheDocument();
      expect(screen.getByText(/1 invalid/i)).toBeInTheDocument();
      expect(screen.getByText(/student not found/i)).toBeInTheDocument();
    });
  });

  it('hides the upload panel and shows student list after confirming upload results', async () => {
    mockedParse.mockResolvedValue([{ Name: 'Alice', Class: '1A' }]);
    mockedValidate.mockResolvedValue({
      validStudents: [
        {
          pgStudentId: 101,
          studentId: 'S1',
          studentName: 'Alice',
          className: '1A',
          classCode: 'P1-01',
          levelCode: 'P1',
          levelCodeDescription: 'PRIMARY 1',
        },
      ],
      invalidStudents: [],
    });

    renderView();

    fireEvent.click(screen.getAllByRole('button', { name: /add students/i })[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /upload via excel/i }));

    const input = await screen.findByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [xlsxFile()] } });

    // After results come back, a confirm button appears
    const confirm = await screen.findByRole('button', { name: /add.*student/i });
    fireEvent.click(confirm);

    // Upload panel goes away, student list shows
    await waitFor(() => {
      expect(screen.queryByLabelText(/upload/i)).not.toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });
});
