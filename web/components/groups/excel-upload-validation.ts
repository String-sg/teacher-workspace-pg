export const MAX_STUDENTS = 5000;

const DISPLAY_LIMIT = 5;

export function checkIsBlank(rows: Record<string, unknown>[]): boolean {
  return rows.length === 0;
}

export function checkForMissingHeaders(rows: Record<string, string>[]): string | false {
  if (rows.length === 0) {
    return "The columns 'Name' and/or 'Class' are missing. Please add them and re-upload.";
  }

  const hasName = rows.some((row) =>
    Object.keys(row).some((k) => k.trim().toLowerCase() === 'name'),
  );
  const hasClass = rows.some((row) =>
    Object.keys(row).some((k) => k.trim().toLowerCase() === 'class'),
  );

  if (!hasName || !hasClass) {
    return "The columns 'Name' and/or 'Class' are missing. Please add them and re-upload.";
  }

  return false;
}

export function checkForDuplicateHeaders(rows: Record<string, string>[]): string | false {
  if (rows.length === 0) return false;

  const keys = Object.keys(rows[0]);

  const nameMatches = keys.filter((k) => {
    const normalized = k.trim().toLowerCase();
    return normalized === 'name' || (normalized.startsWith('name') && normalized !== 'name');
  });

  const classMatches = keys.filter((k) => {
    const normalized = k.trim().toLowerCase();
    return normalized === 'class' || (normalized.startsWith('class') && normalized !== 'class');
  });

  if (nameMatches.length > 1 || classMatches.length > 1) {
    return "The column 'Name' and/or 'Class' appears more than once. Please remove the duplicate(s) and re-upload.";
  }

  return false;
}

export function mapStudentDataHeaders(rows: Record<string, unknown>[]): Record<string, string>[] {
  return rows.map((row) => {
    const keys = Object.keys(row);
    let nameKey: string | undefined;
    let classKey: string | undefined;

    for (const key of keys) {
      const lower = key.trim().toLowerCase();
      if (lower === 'name') nameKey = key;
      else if (lower === 'class') classKey = key;
      if (nameKey && classKey) break;
    }

    if (nameKey && classKey) {
      return {
        Name: String(row[nameKey] ?? '').trim(),
        Class: String(row[classKey] ?? '').trim(),
      };
    }
    return row as Record<string, string>;
  });
}

export function checkForMissingValues(rows: { Name: string; Class: string }[]): {
  hasMissing: boolean;
  missingRows: number[];
} {
  const missingRows: number[] = [];

  rows.forEach((row, index) => {
    if (!row.Name || !row.Class) {
      missingRows.push(index + 2);
    }
  });

  return { hasMissing: missingRows.length > 0, missingRows };
}

export function checkForDuplicateEntries(
  students: { Name: string; Class: string }[],
): string | false {
  const seen = new Map<string, number[]>();
  const duplicates = new Map<string, { rows: number[]; originalName: string }>();

  students.forEach((student, index) => {
    const key = `${student.Name.toLowerCase()}+${student.Class.toLowerCase()}`;
    const rowNum = index + 2;

    if (!seen.has(key)) {
      seen.set(key, [rowNum]);
    } else {
      const existing = seen.get(key)!;
      existing.push(rowNum);

      if (!duplicates.has(key)) {
        const firstIndex = existing[0] - 2;
        duplicates.set(key, { rows: existing, originalName: students[firstIndex].Name });
      } else {
        duplicates.get(key)!.rows = existing;
      }
    }
  });

  if (duplicates.size === 0) return false;

  const entries = Array.from(duplicates.entries()).slice(0, DISPLAY_LIMIT);
  const formatted = entries
    .map(([, data]) => `${data.originalName} in rows ${data.rows.join(', ')}`)
    .join('\n\t• ');

  const extra =
    duplicates.size > DISPLAY_LIMIT ? ` and ${duplicates.size - DISPLAY_LIMIT} more` : '';

  return `We found duplicate entries with the same 'Name' and 'Class':\n\n\t• ${formatted}${extra}.\n\nPlease remove the duplicates and re-upload.`;
}

export function checkForDuplicateStudentIds(rows: { 'Student ID': string }[]): string | false {
  const seen = new Set<string>();
  const dupes = new Set<string>();

  for (const row of rows) {
    const id = row['Student ID'];
    if (seen.has(id)) {
      dupes.add(id);
    } else {
      seen.add(id);
    }
  }

  if (dupes.size === 0) return false;

  const s = dupes.size > 1 ? 's' : '';
  return `We found ${dupes.size} duplicate Student ID${s}. Please amend and re-upload.`;
}

export function isOverMaxCapacity(count: number): boolean {
  return count > MAX_STUDENTS;
}
