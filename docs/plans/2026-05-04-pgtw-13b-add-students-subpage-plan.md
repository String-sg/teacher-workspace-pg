# PGTW-13b: Manual Add-Students Subpage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the manual student-selection subpage that PGW exposes at `/groups/customGroups/:id/edit/addStudents` ([pg-specs.md §7.4](../references/pg-specs.md)) — a searchable + filterable + paginated checkbox table that returns the selected students to the parent (create or edit) page. In PGTW-13b we wire it to the **create flow only** (`/groups/customGroups/new/addStudents`); the edit-flow URL lands with PGTW-13c when the edit page exists.

**Architecture:** New route renders `AddStudentsView` which loads `/school/students` + `/school/groups` (classes) via the route loader. Selection state (a `Set<studentId>`) lives in the view and persists across pagination. Submitting "Add N selected" navigates back to `/groups/customGroups/new` with the selected `studentId[]` in `useNavigate`'s `state` option. `CreateCustomGroupView` reads `useLocation().state` on mount and seeds its student counter. Already-added students passed _into_ the subpage via the same `state` channel are pre-checked and excluded from the "available" count.

**Tech Stack:** React 19, react-router 7 (`useLoaderData`, `useNavigate`, `useLocation`), TypeScript 6, Tailwind 4, Vitest + React Testing Library + jsdom. Existing `~/components/ui` primitives (Checkbox, Input, Select, Table, Button). No new dependencies.

**Spec reference:** [docs/audits/pgtw-13-20-custom-groups-parity-scope.md](../audits/pgtw-13-20-custom-groups-parity-scope.md) — PGTW-13b sub-item, plus [pg-specs.md §7.4](../references/pg-specs.md).

**Phase-1 scope cuts (deferred):**

- "All Students | CCA" radio at the top — defer; render All Students only. PGW spec describes the radio but the CCA mode is closer to PGTW-14 sharing logic. File as follow-up.
- Edit-flow URL `/groups/customGroups/:id/edit/addStudents` — lands with PGTW-13c.
- "N students already added" header copy — Phase 1 wires the counter only when the parent passes `alreadyAdded` IDs in. Defer the visual delta until 13c.

---

## File Structure

| File                                                 | Responsibility                                                                                                                                                                                  | Action |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `web/containers/AddStudentsView.tsx`                 | Route container for `/groups/customGroups/new/addStudents`. Loader fetches students + classes. Renders header, filter bar, paginated table, footer. Owns selection + filter + pagination state. | Create |
| `web/containers/AddStudentsView.test.tsx`            | Container integration tests (rendering, selection toggle, select-all, pagination, filters, submit).                                                                                             | Create |
| `web/components/groups/StudentResultsTable.tsx`      | Presentational paginated checkbox table with select-all in the header.                                                                                                                          | Create |
| `web/components/groups/StudentResultsTable.test.tsx` | Component tests.                                                                                                                                                                                | Create |
| `web/components/groups/StudentFilterBar.tsx`         | Presentational Level dropdown + Form Class dropdown + search input. Emits filter changes via callbacks.                                                                                         | Create |
| `web/components/groups/StudentFilterBar.test.tsx`    | Component tests.                                                                                                                                                                                | Create |
| `web/containers/CreateCustomGroupView.tsx`           | Wire "Add manually" → navigate to subpage; receive back selected students via `useLocation().state`; render dynamic counter ("N students added") and the simple list of names.                  | Modify |
| `web/containers/CreateCustomGroupView.test.tsx`      | Add tests for navigation + state hand-off.                                                                                                                                                      | Modify |
| `web/App.tsx`                                        | Add lazy route `/groups/customGroups/new/addStudents`.                                                                                                                                          | Modify |

No changes to `web/api/client.ts`, `web/api/types.ts`, or BFF — all required types (`PGApiSchoolStudent`, `PGApiSchoolClass`) and endpoints (`fetchSchoolStudents`, `fetchSchoolClasses`) exist.

---

## Task 1: Route + `AddStudentsView` shell

**Files:**

- Create: `web/containers/AddStudentsView.tsx`
- Create: `web/containers/AddStudentsView.test.tsx`
- Modify: `web/App.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// web/containers/AddStudentsView.test.tsx
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Component as AddStudentsView } from './AddStudentsView';

const stubLoader = () => ({ students: [], classes: [] });

function renderAt(path = '/groups/customGroups/new/addStudents') {
  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/new/addStudents',
        Component: AddStudentsView,
        loader: stubLoader,
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe('AddStudentsView', () => {
  it('renders the page heading "Add students"', async () => {
    renderAt();
    expect(
      await screen.findByRole('heading', { level: 1, name: /add students/i }),
    ).toBeInTheDocument();
  });

  it('renders a close link back to /groups/customGroups/new', async () => {
    renderAt();
    const close = await screen.findByRole('link', { name: /close|cancel/i });
    expect(close).toHaveAttribute('href', '/groups/customGroups/new');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a
pnpm test -- AddStudentsView
```

Expected: FAIL — module `./AddStudentsView` not found.

- [ ] **Step 3: Implement the shell**

```tsx
// web/containers/AddStudentsView.tsx
import { X } from 'lucide-react';
import React from 'react';
import { Link, useLoaderData } from 'react-router';

import { fetchSchoolClasses, fetchSchoolStudents } from '~/api/client';
import type { PGApiSchoolClass, PGApiSchoolStudent } from '~/api/types';

interface AddStudentsLoaderData {
  students: PGApiSchoolStudent[];
  classes: PGApiSchoolClass[];
}

export async function loader(): Promise<AddStudentsLoaderData> {
  const [students, classes] = await Promise.all([fetchSchoolStudents(), fetchSchoolClasses()]);
  return { students, classes };
}

const AddStudentsView: React.FC = () => {
  const data = useLoaderData() as AddStudentsLoaderData;
  void data;
  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Add students</h1>
          <Link
            to="/groups/customGroups/new"
            aria-label="Close"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="size-5" aria-hidden />
          </Link>
        </header>
      </div>
    </div>
  );
};

export { AddStudentsView as Component };
```

`fetchSchoolClasses` returns the unwrapped class list per `web/api/client.ts:753-756`. If you read that and find it actually returns `{ class: PGApiSchoolClass[] }` instead of a bare array, adjust the destructure in the loader: `const { class: classes } = await fetchSchoolClasses();`. The unit test passes either way because it uses a stub loader.

- [ ] **Step 4: Wire the lazy route**

Edit `web/App.tsx`. After the `groups/customGroups/new` entry, add:

```tsx
{
  path: 'groups/customGroups/new/addStudents',
  lazy: () => import('./containers/AddStudentsView'),
},
```

- [ ] **Step 5: Run the tests and confirm they pass**

```bash
pnpm test -- AddStudentsView
```

Expected: 2 PASS.

- [ ] **Step 6: Commit**

```bash
git add web/containers/AddStudentsView.tsx web/containers/AddStudentsView.test.tsx web/App.tsx
git commit -m "feat(groups): PGTW-13b scaffold \`/groups/customGroups/new/addStudents\` route"
```

---

## Task 2: `StudentResultsTable` — empty state + populated rows

**Files:**

- Create: `web/components/groups/StudentResultsTable.tsx`
- Create: `web/components/groups/StudentResultsTable.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// web/components/groups/StudentResultsTable.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PGApiSchoolStudent } from '~/api/types';

import { StudentResultsTable } from './StudentResultsTable';

const aldddin: PGApiSchoolStudent = {
  studentId: 1025,
  studentName: 'ALDDIN ANG MO KIO',
  uinFinNo: 'S9000003A',
  classSerialNo: '15',
  classCode: 'H6-05',
  className: 'H6 KINDNESS',
  levelCode: 'H6',
  levelDescription: 'HIGHER 6',
  cca: [],
};

describe('StudentResultsTable', () => {
  it('renders empty state copy when there are no rows', () => {
    render(
      <StudentResultsTable
        rows={[]}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    expect(screen.getByText(/no students match/i)).toBeInTheDocument();
  });

  it('renders one row per student with name, UIN, class', () => {
    render(
      <StudentResultsTable
        rows={[aldddin]}
        selectedIds={new Set()}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
      />,
    );
    expect(screen.getByText('ALDDIN ANG MO KIO')).toBeInTheDocument();
    expect(screen.getByText(/S9000003A/i)).toBeInTheDocument();
    expect(screen.getByText(/H6 KINDNESS/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
pnpm test -- StudentResultsTable
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the table**

```tsx
// web/components/groups/StudentResultsTable.tsx
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
    <Table>
      <TableHeader>
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
              <div className="text-xs text-muted-foreground">{s.uinFinNo}</div>
            </TableCell>
            <TableCell>
              <div>{s.className}</div>
              <div className="text-xs text-muted-foreground">#{s.classSerialNo}</div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

If `Checkbox` from `~/components/ui` doesn't accept `onCheckedChange` (e.g. it accepts `onChange` on the underlying input), adapt to whatever signature the existing Checkbox primitive uses — read `web/components/ui/checkbox.tsx` and mirror PostsView's usage if there is one.

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
pnpm test -- StudentResultsTable
```

Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add web/components/groups/StudentResultsTable.tsx web/components/groups/StudentResultsTable.test.tsx
git commit -m "feat(groups): PGTW-13b \`StudentResultsTable\` empty + populated states"
```

---

## Task 3: `StudentResultsTable` — selection toggle + select-all

**Files:**

- Modify: `web/components/groups/StudentResultsTable.test.tsx`

The component already accepts `onToggle` / `onToggleAll`. This task adds tests proving callbacks fire correctly with the right IDs, and checks visual selection state.

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe`:

```tsx
import { fireEvent } from '@testing-library/react';

it('calls onToggle with the studentId when a row checkbox is clicked', () => {
  const onToggle = vi.fn();
  render(
    <StudentResultsTable
      rows={[aldddin]}
      selectedIds={new Set()}
      onToggle={onToggle}
      onToggleAll={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /select aldddin/i }));
  expect(onToggle).toHaveBeenCalledWith(1025);
});

it('shows the row checkbox as checked when its id is in selectedIds', () => {
  render(
    <StudentResultsTable
      rows={[aldddin]}
      selectedIds={new Set([1025])}
      onToggle={vi.fn()}
      onToggleAll={vi.fn()}
    />,
  );
  expect(screen.getByRole('checkbox', { name: /select aldddin/i })).toBeChecked();
});

it('calls onToggleAll with the visible row ids when select-all is clicked', () => {
  const onToggleAll = vi.fn();
  render(
    <StudentResultsTable
      rows={[aldddin]}
      selectedIds={new Set()}
      onToggle={vi.fn()}
      onToggleAll={onToggleAll}
    />,
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /select all on this page/i }));
  expect(onToggleAll).toHaveBeenCalledWith([1025]);
});
```

- [ ] **Step 2: Run the tests and confirm they pass without further code changes**

```bash
pnpm test -- StudentResultsTable
```

Expected: 5 PASS (the impl already supports these contracts; this task locks them in).

- [ ] **Step 3: Commit**

```bash
git add web/components/groups/StudentResultsTable.test.tsx
git commit -m "test(groups): PGTW-13b lock in \`StudentResultsTable\` selection contract"
```

---

## Task 4: `StudentFilterBar` — Level + Form Class dropdowns + search input

**Files:**

- Create: `web/components/groups/StudentFilterBar.tsx`
- Create: `web/components/groups/StudentFilterBar.test.tsx`

PGW spec §7.4: "Search student name or class name" text input, "All levels" dropdown, "All classes" dropdown. Levels are derived from the loaded students' `levelDescription`; classes come from `/school/groups`.

- [ ] **Step 1: Write the failing tests**

```tsx
// web/components/groups/StudentFilterBar.test.tsx
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
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
pnpm test -- StudentFilterBar
```

Expected: 4 FAIL — module not found.

- [ ] **Step 3: Implement the filter bar with native `<select>` elements**

Native `<select>` is used so the test can introspect options without driving Radix popovers. The look is plain; if a designer wants the styled `~/components/ui/Select` later, swap in a follow-up.

```tsx
// web/components/groups/StudentFilterBar.tsx
import React from 'react';

import { Input } from '~/components/ui';

interface ClassOption {
  label: string;
  value: number;
}

interface StudentFilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  levelOptions: string[];
  level: string;
  onLevelChange: (level: string) => void;
  classOptions: ClassOption[];
  classId: string;
  onClassChange: (classId: string) => void;
}

export const StudentFilterBar: React.FC<StudentFilterBarProps> = ({
  query,
  onQueryChange,
  levelOptions,
  level,
  onLevelChange,
  classOptions,
  classId,
  onClassChange,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Input
        placeholder="Search student name or class name"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="sm:col-span-3"
      />
      <label className="flex flex-col gap-1 text-xs font-medium">
        Level
        <select
          aria-label="Level"
          value={level}
          onChange={(e) => onLevelChange(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All levels</option>
          {levelOptions.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Form Class
        <select
          aria-label="Form Class"
          value={classId}
          onChange={(e) => onClassChange(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="">All classes</option>
          {classOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
pnpm test -- StudentFilterBar
```

Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add web/components/groups/StudentFilterBar.tsx web/components/groups/StudentFilterBar.test.tsx
git commit -m "feat(groups): PGTW-13b \`StudentFilterBar\` with search + Level + Form Class filters"
```

---

## Task 5: `AddStudentsView` — selection state + filter wiring + paginated table

This is the meatiest task. We add a `useReducer` for selection + filter + pagination state, derive filtered+paginated rows, and render the filter bar + table.

**Files:**

- Modify: `web/containers/AddStudentsView.tsx`
- Modify: `web/containers/AddStudentsView.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe`:

```tsx
import { fireEvent } from '@testing-library/react';

const studentRoster = [
  {
    studentId: 1,
    studentName: 'ALDDIN ANG',
    uinFinNo: 'S9000003A',
    classSerialNo: '15',
    classCode: 'H6-05',
    className: 'H6 KINDNESS',
    levelCode: 'H6',
    levelDescription: 'HIGHER 6',
    cca: [],
  },
  {
    studentId: 2,
    studentName: 'BERNICE LIM',
    uinFinNo: 'S9000004B',
    classSerialNo: '02',
    classCode: 'P1-01',
    className: 'P1 KINDNESS',
    levelCode: 'P1',
    levelDescription: 'PRIMARY 1',
    cca: [],
  },
];

const classRoster = [
  {
    type: 'class' as const,
    label: 'P1 KINDNESS (2026)',
    labelDescription: 'P1 KINDNESS',
    value: 1001,
    acadYear: '2026',
    schoolId: 1,
  },
];

function renderWithData(
  studentsList = studentRoster,
  classes = classRoster,
  initialState: unknown = undefined,
) {
  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/new/addStudents',
        Component: AddStudentsView,
        loader: () => ({ students: studentsList, classes }),
      },
      { path: '/groups/customGroups/new', element: <div>create page</div> },
    ],
    {
      initialEntries: [{ pathname: '/groups/customGroups/new/addStudents', state: initialState }],
    },
  );
  return render(<RouterProvider router={router} />);
}

it('renders the full roster initially', async () => {
  renderWithData();
  expect(await screen.findByText('ALDDIN ANG')).toBeInTheDocument();
  expect(screen.getByText('BERNICE LIM')).toBeInTheDocument();
});

it('toggling a row checkbox updates the "Add N selected" button', async () => {
  renderWithData();
  fireEvent.click(await screen.findByRole('checkbox', { name: /select aldddin ang/i }));
  expect(screen.getByRole('button', { name: /add 1 selected/i })).toBeEnabled();
});

it('search filters rows by name', async () => {
  renderWithData();
  fireEvent.change(await screen.findByPlaceholderText(/search student/i), {
    target: { value: 'bernice' },
  });
  expect(screen.queryByText('ALDDIN ANG')).not.toBeInTheDocument();
  expect(screen.getByText('BERNICE LIM')).toBeInTheDocument();
});

it('Level filter narrows by levelDescription', async () => {
  renderWithData();
  fireEvent.change(await screen.findByLabelText(/level/i), {
    target: { value: 'PRIMARY 1' },
  });
  expect(screen.queryByText('ALDDIN ANG')).not.toBeInTheDocument();
  expect(screen.getByText('BERNICE LIM')).toBeInTheDocument();
});

it('Add N selected button is disabled when nothing is selected', async () => {
  renderWithData();
  expect(await screen.findByRole('button', { name: /add 0 selected/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
pnpm test -- AddStudentsView
```

Expected: FAIL — checkbox role queries find nothing because the table isn't rendered yet.

- [ ] **Step 3: Implement the full view**

```tsx
// web/containers/AddStudentsView.tsx
import { X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link, useLoaderData, useNavigate, useLocation } from 'react-router';

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

const PAGE_SIZE = 20;

export async function loader(): Promise<AddStudentsLoaderData> {
  const [students, classes] = await Promise.all([fetchSchoolStudents(), fetchSchoolClasses()]);
  return { students, classes };
}

const AddStudentsView: React.FC = () => {
  const data = useLoaderData() as AddStudentsLoaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = (location.state as IncomingNavState | null) ?? {};
  const alreadyAdded = useMemo(() => new Set(incoming.alreadyAdded ?? []), [incoming.alreadyAdded]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('');
  const [classId, setClassId] = useState('');
  // Pagination is intentionally Phase-1-deferred (see Task 6); render the
  // first 200 rows so the UI behaves under realistic data volumes.

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
    return data.students.filter((s) => {
      if (alreadyAdded.has(s.studentId)) return false;
      if (level && s.levelDescription !== level) return false;
      if (
        classId &&
        s.classCode !== data.classes.find((c) => c.value.toString() === classId)?.labelDescription
      ) {
        return false;
      }
      if (q) {
        const hay = `${s.studentName} ${s.className}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.students, data.classes, alreadyAdded, level, classId, query]);

  const visibleRows = filtered.slice(0, PAGE_SIZE * 10); // up to 200 rows in Phase 1

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

  function submit() {
    const addedStudents = data.students.filter((s) => selectedIds.has(s.studentId));
    const state: OutgoingNavState = { addedStudents };
    navigate('/groups/customGroups/new', { state });
  }

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Add students</h1>
          <Link
            to="/groups/customGroups/new"
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
            to="/groups/customGroups/new"
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
```

There is one subtlety in the class filter: PGW's `school/students.classCode` (e.g. `P1-01`) doesn't directly match `school/groups.label` (e.g. `P1 KINDNESS (2026)`) — they share neither the year suffix nor the punctuation. The filter above maps via `labelDescription` (the year-stripped label, e.g. `P1 KINDNESS`) which is what `student-recipient-selector.tsx:31-33` already uses. If it doesn't match in your run, read the live data via the browser's network tab and adjust the comparison.

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
pnpm test -- AddStudentsView
```

Expected: 7 PASS (2 from Task 1 + 5 added here).

- [ ] **Step 5: Commit**

```bash
git add web/containers/AddStudentsView.tsx web/containers/AddStudentsView.test.tsx
git commit -m "feat(groups): PGTW-13b \`AddStudentsView\` filter + selection + submit"
```

---

## Task 6: Wire the create page to the subpage round-trip

PGTW-13a's `CreateCustomGroupView` had the "+ Add Students" dropdown items disabled. Now we enable "Add manually", make it navigate to the subpage, and have the create page consume the returned `addedStudents` from `useLocation().state`.

**Files:**

- Modify: `web/containers/CreateCustomGroupView.tsx`
- Modify: `web/containers/CreateCustomGroupView.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe`:

```tsx
import { Component as AddStudentsViewComp } from './AddStudentsView';

it('"Add manually" navigates to /groups/customGroups/new/addStudents', async () => {
  const router = createMemoryRouter(
    [
      { path: '/groups/customGroups/new', Component: CreateCustomGroupView },
      {
        path: '/groups/customGroups/new/addStudents',
        Component: AddStudentsViewComp,
        loader: () => ({ students: [], classes: [] }),
      },
    ],
    { initialEntries: ['/groups/customGroups/new'] },
  );
  render(<RouterProvider router={router} />);
  const triggers = screen.getAllByRole('button', { name: /add students/i });
  fireEvent.click(triggers[0]);
  fireEvent.click(await screen.findByRole('menuitem', { name: /add manually/i }));
  expect(
    await screen.findByRole('heading', { level: 1, name: /add students/i }),
  ).toBeInTheDocument();
});

it('reads addedStudents from router state and shows the new counter + names', async () => {
  const router = createMemoryRouter(
    [{ path: '/groups/customGroups/new', Component: CreateCustomGroupView }],
    {
      initialEntries: [
        {
          pathname: '/groups/customGroups/new',
          state: {
            addedStudents: [
              {
                studentId: 1,
                studentName: 'ALDDIN ANG',
                uinFinNo: 'S9000003A',
                classSerialNo: '15',
                classCode: 'H6-05',
                className: 'H6 KINDNESS',
                levelCode: 'H6',
                levelDescription: 'HIGHER 6',
                cca: [],
              },
            ],
          },
        },
      ],
    },
  );
  render(<RouterProvider router={router} />);
  expect(await screen.findByText(/1 student added/i)).toBeInTheDocument();
  expect(screen.getByText('ALDDIN ANG')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
pnpm test -- CreateCustomGroupView
```

Expected: FAIL — "Add manually" item is disabled (PGTW-13a's stub) and the create page ignores router state.

- [ ] **Step 3: Update `CreateCustomGroupView.tsx`**

Replace the file contents with:

```tsx
// web/containers/CreateCustomGroupView.tsx
import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router';

import type { PGApiSchoolStudent } from '~/api/types';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '~/components/ui';

const TITLE_MAX = 120;

interface IncomingNavState {
  addedStudents?: PGApiSchoolStudent[];
}

const CreateCustomGroupView: React.FC = () => {
  const [title, setTitle] = useState('');
  const location = useLocation();
  const navState = (location.state as IncomingNavState | null) ?? {};
  const [students, setStudents] = useState<PGApiSchoolStudent[]>(navState.addedStudents ?? []);

  const studentCount = students.length;
  const canSave = title.trim().length > 0 && studentCount > 0;

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Create new group</h1>
        <div className="mt-6">
          <label htmlFor="group-title" className="text-sm font-medium">
            Title<span className="text-destructive">*</span>
          </label>
          <Input
            id="group-title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
            placeholder="What would you like to call your group?"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {TITLE_MAX - title.length} characters left
          </p>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {studentCount} student{studentCount === 1 ? '' : 's'} added.
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Plus className="size-4" aria-hidden />
                    Add Students
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/groups/customGroups/new/addStudents"
                      state={{ alreadyAdded: students.map((s) => s.studentId) }}
                    >
                      Add manually
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>Upload via Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {studentCount === 0 ? (
              <div className="mt-2 rounded-md bg-muted p-6 text-center text-sm text-muted-foreground">
                No students added yet.
              </div>
            ) : (
              <ul className="mt-2 divide-y rounded-md border">
                {students.map((s) => (
                  <li key={s.studentId} className="flex items-center justify-between p-3 text-sm">
                    <span>{s.studentName}</span>
                    <span className="text-xs text-muted-foreground">{s.className}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              to="/groups"
              className="text-sm font-medium text-muted-foreground hover:underline"
            >
              Cancel
            </Link>
            <Button
              disabled={!canSave}
              title={canSave ? undefined : 'Add at least one student to create the group'}
            >
              Create Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CreateCustomGroupView as Component };
```

This intentionally still has Save as a no-op (no API call yet) — actual Save lands when 13c arrives with the create endpoint wiring. The button enables once title + students are present, but clicking it does nothing until POST `/api/web/2/staff/groups/custom` is wired.

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
pnpm test -- CreateCustomGroupView
```

Expected: All previous tests still PASS plus the 2 new ones.

A handful of pre-existing tests in this file may need re-targeting:

- The "+ Add Students dropdown with two disabled items" test from PGTW-13a will now FAIL (Add manually is no longer disabled). Update that test to check ONLY that "Upload via Excel" is `aria-disabled="true"`, and that "Add manually" is now a link to the subpage.
- The "Create Now button disabled when title set but no students" test still passes — `canSave` requires both.

Specifically, replace this previously-passing test:

```tsx
it('shows an "+ Add Students" dropdown with two disabled items', async () => {
```

with:

```tsx
it('shows an "+ Add Students" dropdown with "Add manually" enabled and "Upload via Excel" disabled', async () => {
  renderView();
  const triggers = screen.getAllByRole('button', { name: /add students/i });
  fireEvent.click(triggers[0]);
  const manual = await screen.findByRole('menuitem', { name: /add manually/i });
  const excel = await screen.findByRole('menuitem', { name: /upload via excel/i });
  expect(manual).not.toHaveAttribute('aria-disabled', 'true');
  expect(excel).toHaveAttribute('aria-disabled', 'true');
});
```

- [ ] **Step 5: Commit**

```bash
git add web/containers/CreateCustomGroupView.tsx web/containers/CreateCustomGroupView.test.tsx
git commit -m "feat(groups): PGTW-13b wire create page \`Add manually\` to subpage round-trip"
```

---

## Task 7: Manual smoke test in proxy mode

The mapper (PGTW-13a-final commit f5c64f4) routes raw PGW shape through `fetchCustomGroups`. `fetchSchoolStudents` and `fetchSchoolClasses` are existing endpoints already exercised by PostsView, so they should work in proxy mode without further mapper work — BUT verify on the live data.

- [ ] **Step 1: Make sure the stack is up**

If shells are still running from PGTW-13a, just refresh the browser. If not, use the new slash command from session:

```
/tw-up
```

Or manually:

```bash
docker info >/dev/null 2>&1 || open -a Docker
cd /Users/shin/Desktop/projects/tw-pg-experiment
MYSQL_PASSWORD=iloveida MYSQL_PASSWORD_READ=iloveidaread MYSQL_ROOT_PASSWORD=root docker compose up -d
go run ./server/cmd/tw &        # BFF on :3000 (picks up .env: TW_PG_MOCK=false)
cd .worktrees/pgtw-13a && pnpm dev &     # Vite on :5173
open "http://localhost:3001/api/web/2/staff/identity/login/BypassMIMS?loginId=PGU00032@hq.moe.gov.sg&type=mims"
```

- [ ] **Step 2: Walk through the create flow**

1. Navigate to http://localhost:5173/groups
2. Click "+ Create custom group"
3. Type a title
4. Click "+ Add Students" → "Add manually"
5. URL → `/groups/customGroups/new/addStudents`. Heading "Add students" visible. Roster of real PGW students is rendered.
6. Type into search → roster filters live.
7. Pick a Level → roster narrows.
8. Pick a Form Class → roster narrows further (verify the `classCode`/`labelDescription` mapping holds — if not, file as gap).
9. Tick a few rows. "Add N selected" button updates and enables.
10. Click "Add N selected" → returns to `/groups/customGroups/new`. Counter shows "N students added.". Names render in the list. Title input retains its value (it doesn't — see follow-up below).
11. Click "+ Add Students" → "Add manually" again. Already-added students should be excluded from the visible roster.

- [ ] **Step 3: Run the unit-test suite**

```bash
cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a
pnpm test
```

Expected: previously 159 - 2 = 157 PGTW-13a tests still pass. PGTW-13b adds: 2 (Task 1) + 2 + 3 (Task 2 + 3) + 4 (Task 4) + 5 (Task 5) + 2 (Task 6) - 1 (replaced PGTW-13a test) = 17 new passing tests, for a new total of 174. (The 2 pre-existing PGTW-11 failures remain.)

- [ ] **Step 4: Lint**

```bash
pnpm lint
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 5: Commit any smoke-test fixups**

If steps 1-4 surfaced minor issues (e.g. the class-code mapping needs adjustment), commit them:

```bash
git add -p
git commit -m "fix(groups): PGTW-13b address smoke-test findings"
```

If no fixes were needed, skip this step.

---

## Known Phase-1 limitations (file as follow-ups, not blockers)

1. **Title input does not persist across the round-trip.** When the user navigates to the subpage and back, the title field resets to empty. PGW retains it. Fix in 13c when the create-page state moves from local `useState` to a parent loader/context, or pass the title in `state` alongside `alreadyAdded`.
2. **Pagination is render-capped at 200 rows, not paged.** Real schools have ≤ 1500 students; 200 covers most filter results but a user with no filters could miss tail rows. Add real pagination in a follow-up; not critical for parity.
3. **"All Students | CCA" radio not implemented.** §7.4 of the spec describes it; deferred per the audit.
4. **Class-code → class-label mapping fragility.** `classCode` (e.g. `P1-01`) and `labelDescription` (e.g. `P1 KINDNESS`) come from different endpoints and aren't structurally linked. If PGW renames or re-formats either side, the Form Class filter silently shows nothing. Worth a TODO comment in the filter and an integration test against fixtures from a known school.
5. **Save-on-create is still a no-op.** `Create Now` enables but doesn't POST. Wired in 13c.

---

## Out of scope (revisit after 13b lands)

- **Edit-flow URL** `/groups/customGroups/:id/edit/addStudents` — same component, different parent. Wires when 13c builds the edit page.
- **Excel upload** — PGTW-13d, blocked on PG-team confirmation of `validateStudents` request/response shape.
- **Detail page** — PGTW-13c.
- **Share modal** — PGTW-14.
- **Delete** — PGTW-20.
