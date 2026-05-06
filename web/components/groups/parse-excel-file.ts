import * as XLSX from 'xlsx';

export async function parseExcelFile<T = Record<string, unknown>>(file: File): Promise<T[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json<T>(workbook.Sheets[sheetName]);
}
