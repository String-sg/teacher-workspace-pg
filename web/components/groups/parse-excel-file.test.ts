import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { parseExcelFile } from './parse-excel-file';

function createXlsxBlob(rows: Record<string, unknown>[], sheetName = 'Sheet1'): File {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], 'test.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function createEmptyXlsx(): File {
  const ws = XLSX.utils.aoa_to_sheet([]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new File([buf], 'empty.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('parseExcelFile', () => {
  it('parses rows from the first sheet', async () => {
    const file = createXlsxBlob([
      { Name: 'Alice', Class: '1A' },
      { Name: 'Bob', Class: '2B' },
    ]);
    const rows = await parseExcelFile(file);
    expect(rows).toEqual([
      { Name: 'Alice', Class: '1A' },
      { Name: 'Bob', Class: '2B' },
    ]);
  });

  it('returns empty array for blank file', async () => {
    const file = createEmptyXlsx();
    const rows = await parseExcelFile(file);
    expect(rows).toEqual([]);
  });

  it('reads only the first sheet even if multiple exist', async () => {
    const ws1 = XLSX.utils.json_to_sheet([{ Name: 'Alice', Class: '1A' }]);
    const ws2 = XLSX.utils.json_to_sheet([{ Name: 'Ignored', Class: 'X' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'First');
    XLSX.utils.book_append_sheet(wb, ws2, 'Second');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([buf], 'multi.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const rows = await parseExcelFile(file);
    expect(rows).toEqual([{ Name: 'Alice', Class: '1A' }]);
  });

  it('preserves numeric values as-is from xlsx', async () => {
    const file = createXlsxBlob([{ 'Student ID': 'S1234567A' }, { 'Student ID': 'S9876543Z' }]);
    const rows = await parseExcelFile(file);
    expect(rows).toEqual([{ 'Student ID': 'S1234567A' }, { 'Student ID': 'S9876543Z' }]);
  });
});
