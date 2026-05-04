import React from 'react';

import type { PGApiSchoolStudent } from '~/api/types';
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui';

interface StudentResultsTableProps {
  rows: PGApiSchoolStudent[];
  selectedIds: Set<number>;
  onToggle: (studentId: number) => void;
  onToggleAll: (rowIds: number[]) => void;
}

export const StudentResultsTable: React.FC<StudentResultsTableProps> = ({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
}) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No students match.
      </div>
    );
  }

  const allSelected = rows.every((r) => selectedIds.has(r.studentId));
  const rowIds = rows.map((r) => r.studentId);

  return (
    <div className="h-full overflow-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select all on this page"
                checked={allSelected}
                onCheckedChange={() => onToggleAll(rowIds)}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Class / Index</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.studentId}>
              <TableCell>
                <Checkbox
                  aria-label={`Select ${s.studentName}`}
                  checked={selectedIds.has(s.studentId)}
                  onCheckedChange={() => onToggle(s.studentId)}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium">{s.studentName}</div>
                <div className="text-xs text-muted-foreground">
                  {s.uinFinNo
                    ? `${s.uinFinNo.slice(0, 1)}${'*'.repeat(Math.max(0, s.uinFinNo.length - 4))}${s.uinFinNo.slice(-3)}`
                    : ''}
                </div>
              </TableCell>
              <TableCell>
                <div>{s.className}</div>
                <div className="text-xs text-muted-foreground">#{s.classSerialNo}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
