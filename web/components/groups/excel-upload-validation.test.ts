import { describe, expect, it } from 'vitest';

import {
  checkIsBlank,
  checkForMissingHeaders,
  checkForDuplicateHeaders,
  checkForMissingValues,
  checkForDuplicateEntries,
  mapStudentDataHeaders,
  isOverMaxCapacity,
  checkForDuplicateStudentIds,
  MAX_STUDENTS,
} from './excel-upload-validation';

describe('checkIsBlank', () => {
  it('returns true for empty array', () => {
    expect(checkIsBlank([])).toBe(true);
  });

  it('returns false for non-empty array', () => {
    expect(checkIsBlank([{ Name: 'Alice', Class: '1A' }])).toBe(false);
  });
});

describe('checkForMissingHeaders (MS)', () => {
  it('returns false when Name and Class headers present', () => {
    const rows = [{ Name: 'Alice', Class: '1A' }];
    expect(checkForMissingHeaders(rows)).toBe(false);
  });

  it('returns error when Name header missing', () => {
    const rows = [{ StudentName: 'Alice', Class: '1A' }];
    expect(checkForMissingHeaders(rows)).toContain('Name');
    expect(checkForMissingHeaders(rows)).toContain('Class');
  });

  it('returns error when Class header missing', () => {
    const rows = [{ Name: 'Alice', Classroom: '1A' }];
    expect(checkForMissingHeaders(rows)).toBeTruthy();
  });

  it('returns error for empty array', () => {
    expect(checkForMissingHeaders([])).toBeTruthy();
  });
});

describe('checkForDuplicateHeaders', () => {
  it('returns false when no duplicate headers', () => {
    const rows = [{ Name: 'Alice', Class: '1A' }];
    expect(checkForDuplicateHeaders(rows)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(checkForDuplicateHeaders([])).toBe(false);
  });

  it('detects duplicate case-insensitive Name headers', () => {
    const rows = [{ Name: 'Alice', Class: '1A', name: 'dup' }];
    expect(checkForDuplicateHeaders(rows)).toBeTruthy();
  });

  it('detects duplicate case-insensitive Class headers', () => {
    const rows = [{ Name: 'Alice', Class: '1A', class: 'dup' }];
    expect(checkForDuplicateHeaders(rows)).toBeTruthy();
  });

  it('detects Name headers with whitespace', () => {
    const rows = [{ Name: 'Alice', Class: '1A', ' Name ': 'dup' }];
    expect(checkForDuplicateHeaders(rows)).toBeTruthy();
  });

  it('detects Class headers with whitespace', () => {
    const rows = [{ Name: 'Alice', Class: '1A', 'Class ': 'dup' }];
    expect(checkForDuplicateHeaders(rows)).toBeTruthy();
  });

  it('detects xlsx duplicate suffix headers (Name_1)', () => {
    const rows = [{ Name: 'Alice', Class: '1A', Name_1: 'dup' }];
    expect(checkForDuplicateHeaders(rows)).toBeTruthy();
  });

  it('detects xlsx duplicate suffix headers (Class_1)', () => {
    const rows = [{ Name: 'Alice', Class: '1A', Class_1: 'dup' }];
    expect(checkForDuplicateHeaders(rows)).toBeTruthy();
  });

  it('ignores substrings that do not start with header names', () => {
    const rows = [{ Name: 'Alice', Class: '1A', myName: 'ok', myClass: 'ok' }];
    expect(checkForDuplicateHeaders(rows)).toBe(false);
  });
});

describe('mapStudentDataHeaders', () => {
  it('standardises differently-cased Name and Class headers', () => {
    const input = [
      { name: 'Alice', class: '1A' },
      { NAME: 'Bob', CLASS: '2B' },
      { Name: 'Charlie', Class: '3C' },
    ];
    expect(mapStudentDataHeaders(input as Record<string, string>[])).toEqual([
      { Name: 'Alice', Class: '1A' },
      { Name: 'Bob', Class: '2B' },
      { Name: 'Charlie', Class: '3C' },
    ]);
  });

  it('trims whitespace from headers and values', () => {
    const input = [{ ' name ': '  Alice  ', ' class ': '  1A  ' }];
    expect(mapStudentDataHeaders(input as Record<string, string>[])).toEqual([
      { Name: 'Alice', Class: '1A' },
    ]);
  });

  it('returns original row if Name or Class key not found', () => {
    const input = [
      { Name: 'Alice', Classroom: '1A' },
      { StudentName: 'Bob', Class: '2B' },
    ];
    expect(mapStudentDataHeaders(input as Record<string, string>[])).toEqual(input);
  });

  it('returns empty array for empty input', () => {
    expect(mapStudentDataHeaders([])).toEqual([]);
  });

  it('casts numeric values to strings', () => {
    const input = [{ name: 10003, class: 5.1 }];
    expect(mapStudentDataHeaders(input as unknown as Record<string, string>[])).toEqual([
      { Name: '10003', Class: '5.1' },
    ]);
  });

  it('handles mixed header variations in same dataset', () => {
    const input = [
      { name: 'Alice', class: '1A' },
      { 'Name ': 'Bob', ' Class ': '2B' },
      { NAME: 'Charlie', CLASS: '3C' },
    ];
    expect(mapStudentDataHeaders(input as Record<string, string>[])).toEqual([
      { Name: 'Alice', Class: '1A' },
      { Name: 'Bob', Class: '2B' },
      { Name: 'Charlie', Class: '3C' },
    ]);
  });
});

describe('checkForMissingValues', () => {
  it('returns no missing rows when all rows complete', () => {
    const rows = [
      { Name: 'Alice', Class: '1A' },
      { Name: 'Bob', Class: '2B' },
    ];
    const result = checkForMissingValues(rows);
    expect(result.hasMissing).toBe(false);
    expect(result.missingRows).toEqual([]);
  });

  it('reports rows missing Name', () => {
    const rows = [
      { Name: 'Alice', Class: '1A' },
      { Name: '', Class: '2B' },
    ];
    const result = checkForMissingValues(rows);
    expect(result.hasMissing).toBe(true);
    expect(result.missingRows).toEqual([3]);
  });

  it('reports rows missing Class', () => {
    const rows = [{ Name: 'Alice', Class: '' }];
    const result = checkForMissingValues(rows);
    expect(result.hasMissing).toBe(true);
    expect(result.missingRows).toEqual([2]);
  });

  it('uses 1-based row numbers offset by header row', () => {
    const rows = [
      { Name: '', Class: '' },
      { Name: 'Bob', Class: '2B' },
      { Name: '', Class: '3C' },
    ];
    const result = checkForMissingValues(rows);
    expect(result.missingRows).toEqual([2, 4]);
  });
});

describe('checkForDuplicateEntries (MS — Name+Class)', () => {
  it('returns false when no duplicates', () => {
    const students = [
      { Name: 'Alice', Class: '1A' },
      { Name: 'Bob', Class: '1A' },
      { Name: 'Alice', Class: '1B' },
    ];
    expect(checkForDuplicateEntries(students)).toBe(false);
  });

  it('detects duplicate Name+Class entries', () => {
    const students = [
      { Name: 'Alice', Class: '1A' },
      { Name: 'Alice', Class: '1A' },
      { Name: 'Bob', Class: '1B' },
    ];
    const result = checkForDuplicateEntries(students);
    expect(result).toBeTruthy();
    expect(result).toContain('Alice in rows 2, 3');
  });

  it('handles multiple duplicate groups', () => {
    const students = [
      { Name: 'Alice', Class: '1A' },
      { Name: 'Bob', Class: '1B' },
      { Name: 'Alice', Class: '1A' },
      { Name: 'Charlie', Class: '2C' },
      { Name: 'Bob', Class: '1B' },
      { Name: 'Charlie', Class: '2C' },
    ];
    const result = checkForDuplicateEntries(students);
    expect(result).toBeTruthy();
    expect(result).toContain('Alice in rows 2, 4');
    expect(result).toContain('Bob in rows 3, 6');
    expect(result).toContain('Charlie in rows 5, 7');
  });

  it('returns false for empty array', () => {
    expect(checkForDuplicateEntries([])).toBe(false);
  });

  it('limits displayed duplicates to 5 and shows remainder count', () => {
    const students: { Name: string; Class: string }[] = [];
    for (let i = 1; i <= 15; i++) {
      students.push({ Name: `Student ${i}`, Class: `Class ${i}` });
      students.push({ Name: `Student ${i}`, Class: `Class ${i}` });
    }
    const result = checkForDuplicateEntries(students);
    expect(result).toBeTruthy();
    for (let i = 1; i <= 5; i++) {
      expect(result).toContain(`Student ${i} in rows`);
    }
    expect(result).not.toContain('Student 6 in rows');
    expect(result).toContain('and 10 more');
  });

  it('treats comparison as case-insensitive', () => {
    const students = [
      { Name: 'Alice', Class: '1A' },
      { Name: 'ALICE', Class: '1A' },
    ];
    const result = checkForDuplicateEntries(students);
    expect(result).toBeTruthy();
    expect(result).toContain('Alice in rows 2, 3');
  });

  it('handles names with special characters', () => {
    const students = [
      { Name: "João-Maria O'Connor", Class: '1A' },
      { Name: "João-Maria O'Connor", Class: '1a' },
    ];
    const result = checkForDuplicateEntries(students);
    expect(result).toBeTruthy();
    expect(result).toContain("João-Maria O'Connor in rows 2, 3");
  });
});

describe('checkForDuplicateStudentIds (IHL)', () => {
  it('returns false when no duplicate IDs', () => {
    const rows = [{ 'Student ID': 'S1111111A' }, { 'Student ID': 'S2222222B' }];
    expect(checkForDuplicateStudentIds(rows)).toBe(false);
  });

  it('returns error with count when duplicates found', () => {
    const rows = [
      { 'Student ID': 'S1111111A' },
      { 'Student ID': 'S2222222B' },
      { 'Student ID': 'S1111111A' },
    ];
    const result = checkForDuplicateStudentIds(rows);
    expect(result).toBeTruthy();
    expect(result).toContain('1');
    expect(result).toContain('duplicate');
  });

  it('counts distinct duplicate IDs, not total occurrences', () => {
    const rows = [
      { 'Student ID': 'S1111111A' },
      { 'Student ID': 'S1111111A' },
      { 'Student ID': 'S2222222B' },
      { 'Student ID': 'S2222222B' },
      { 'Student ID': 'S2222222B' },
    ];
    const result = checkForDuplicateStudentIds(rows);
    expect(result).toBeTruthy();
    expect(result).toContain('2');
  });
});

describe('isOverMaxCapacity', () => {
  it('returns false at exactly MAX_STUDENTS', () => {
    expect(isOverMaxCapacity(MAX_STUDENTS)).toBe(false);
  });

  it('returns true above MAX_STUDENTS', () => {
    expect(isOverMaxCapacity(MAX_STUDENTS + 1)).toBe(true);
  });

  it('returns false below MAX_STUDENTS', () => {
    expect(isOverMaxCapacity(0)).toBe(false);
  });
});
