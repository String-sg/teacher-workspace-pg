import { X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link, useLoaderData, useLocation, useNavigate } from 'react-router';

import { fetchSchoolClasses, fetchSchoolStudents } from '~/api/client';
import type { PGApiSchoolClass, PGApiSchoolStudent } from '~/api/types';
import { StudentFilterBar } from '~/components/groups/StudentFilterBar';
import { StudentResultsTable } from '~/components/groups/StudentResultsTable';
import { Button } from '~/components/ui';

interface AddStudentsLoaderData {
  students: PGApiSchoolStudent[];
  classes: PGApiSchoolClass[];
}

interface IncomingNavState {
  alreadyAdded?: number[];
}

interface OutgoingNavState {
  addedStudents: PGApiSchoolStudent[];
}

const PAGE_CAP = 200;

export async function loader(): Promise<AddStudentsLoaderData> {
  const [students, classes] = await Promise.all([fetchSchoolStudents(), fetchSchoolClasses()]);
  return { students, classes };
}

const AddStudentsView: React.FC = () => {
  const data = useLoaderData() as AddStudentsLoaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state as IncomingNavState | null) ?? {};
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(incoming.alreadyAdded ?? []));
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [classId, setClassId] = useState('');

  const levelOptions = useMemo(() => {
    const set = new Set(data.students.map((s) => s.levelDescription));
    return Array.from(set).sort();
  }, [data.students]);

  const classOptions = useMemo(
    () =>
      data.classes.map((c) => ({
        label: c.label,
        value: c.value,
      })),
    [data.classes],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const selectedClass = data.classes.find((c) => c.value.toString() === classId);
    return data.students.filter((s) => {
      if (level && s.levelDescription !== level) return false;
      if (selectedClass && s.className !== selectedClass.labelDescription) return false;
      if (q) {
        const hay = `${s.studentName} ${s.className}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.students, data.classes, level, classId, query]);

  const visibleRows = filtered.slice(0, PAGE_CAP);

  function toggle(studentId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function toggleAll(rowIds: number[]) {
    setSelectedIds((prev) => {
      const allSelected = rowIds.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of rowIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  // Strip the trailing /addStudents segment to return to whichever parent
  // (create or edit) launched this subpage. Lets the same component back
  // both `/groups/customGroups/new/addStudents` and
  // `/groups/customGroups/:id/edit/addStudents`.
  const parentPath = location.pathname.replace(/\/addStudents$/, '');

  function submit() {
    const addedStudents = data.students.filter((s) => selectedIds.has(s.studentId));
    const state: OutgoingNavState = { addedStudents };
    navigate(parentPath, { state });
  }

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Add students</h1>
          <Link
            to={parentPath}
            aria-label="Close"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" aria-hidden />
          </Link>
        </header>

        <StudentFilterBar
          query={query}
          onQueryChange={setQuery}
          levelOptions={levelOptions}
          level={level}
          onLevelChange={setLevel}
          classOptions={classOptions}
          classId={classId}
          onClassChange={setClassId}
        />

        <p className="text-sm text-muted-foreground">
          Showing {visibleRows.length} of {filtered.length} matching students.
        </p>

        <StudentResultsTable
          rows={visibleRows}
          selectedIds={selectedIds}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />

        <footer className="flex items-center justify-end gap-3">
          <Link
            to={parentPath}
            className="text-sm font-medium text-muted-foreground hover:underline"
          >
            Cancel
          </Link>
          <Button disabled={selectedIds.size === 0} onClick={submit}>
            Add {selectedIds.size} selected
          </Button>
        </footer>
      </div>
    </div>
  );
};

export { AddStudentsView as Component };
