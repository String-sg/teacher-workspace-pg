import React, { useMemo } from 'react';

import type { PGApiCustomGroupDetailStudent } from '~/api/types';

interface StudentsByClassListProps {
  students: PGApiCustomGroupDetailStudent[];
}

export const StudentsByClassList: React.FC<StudentsByClassListProps> = ({ students }) => {
  const groups = useMemo(() => {
    const map = new Map<string, PGApiCustomGroupDetailStudent[]>();
    for (const s of students) {
      const list = map.get(s.className) ?? [];
      list.push(s);
      map.set(s.className, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [students]);

  if (students.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No students in this group.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([className, rows]) => (
        <section key={className} className="rounded-md border bg-card">
          <header className="border-b px-4 py-2 text-sm font-semibold">
            {className} ({rows.length})
          </header>
          <ul className="divide-y">
            {rows.map((s) => (
              <li key={s.studentId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">{s.studentName}</div>
                  {s.uinFinNo ? (
                    <div className="text-xs text-muted-foreground">{s.uinFinNo}</div>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">—</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
