# PGTW-13c: Detail page + Edit page + Save wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the create → detail → edit → save loop for custom groups. Wire `Create Now` to `POST /groups/custom`, build the `/groups/customGroups/:id` detail page (Students tab + Details tab + action cards), and the `/groups/customGroups/:id/edit` edit page (reuses the same form shape as create + `PUT /groups/custom/:id`).

**Architecture:** Three new client functions in `web/api/client.ts` (`createCustomGroup`, `fetchCustomGroupDetail`, `updateCustomGroup`) — the detail fetch applies a mapper to align real PGW's wire shape (`id`, `groupName`, `studentsList`, etc.) with our internal type. New container `CustomGroupDetailView`; new container `EditCustomGroupView` that reuses the same JSX skeleton as `CreateCustomGroupView`. The existing `AddStudentsView` route gets a parallel edit-flow path (`/groups/customGroups/:id/edit/addStudents`) wired so the same view serves both create and edit flows.

**Tech Stack:** React 19, react-router 7, TypeScript 6, Tailwind 4, Vitest + RTL + jsdom.

**Spec reference:** [docs/audits/pgtw-13-20-custom-groups-parity-scope.md](../audits/pgtw-13-20-custom-groups-parity-scope.md), PGW [pg-specs.md §7.2 / §7.3](../references/pg-specs.md), [pg-api-contract.md §8-9](../references/pg-api-contract.md).

**Phase-1 scope cuts (deferred):**

- Detail-page **Edit / Share / Delete** action cards render but link nowhere. "Edit Group" links to `/groups/customGroups/:id/edit` (the page this plan adds). "Share Group" and "Delete Forever" are non-functional buttons (PGTW-14 / PGTW-20a).
- "Onboarded & Can Respond" ✓/✗ column on the Students tab — flagged as open question (#6 in audit). Render placeholder `—` until PG team confirms which endpoint sources it.
- `sharedWith` shape — confirmed via real-PGW response shape during implementation.
- Real-PGW **detail** endpoint shape — applies same mapper pattern as the list (PGTW-13a's f5c64f4 commit). If proxy-mode response differs from the contract doc, adjust the mapper and update the mock fixture, like we did for `groups_custom.json`.

---

## File Structure

| File                                                   | Responsibility                                                                                                                          | Action |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `web/api/client.ts`                                    | Add `createCustomGroup`, `fetchCustomGroupDetail` (with mapper), `updateCustomGroup`.                                                   | Modify |
| `web/api/types.ts`                                     | Add `PGApiCustomGroupDetail` (internal shape after mapper).                                                                             | Modify |
| `web/containers/CreateCustomGroupView.tsx`             | Wire `Create Now` to call `createCustomGroup` then navigate to `/groups/customGroups/:newId`.                                           | Modify |
| `web/containers/CustomGroupDetailView.tsx`             | Route container for `/groups/customGroups/:id`. Loader fetches detail. Renders header, tabs (Students / Details), action cards.         | Create |
| `web/containers/CustomGroupDetailView.test.tsx`        | Container integration tests.                                                                                                            | Create |
| `web/containers/EditCustomGroupView.tsx`               | Route container for `/groups/customGroups/:id/edit`. Loader fetches detail. Same form layout as create; Save calls `updateCustomGroup`. | Create |
| `web/containers/EditCustomGroupView.test.tsx`          | Container integration tests.                                                                                                            | Create |
| `web/components/groups/StudentsByClassList.tsx`        | Presentational: groups detail-page students by `className` and renders sections.                                                        | Create |
| `web/components/groups/StudentsByClassList.test.tsx`   | Component tests.                                                                                                                        | Create |
| `web/App.tsx`                                          | Add three lazy routes: `/groups/customGroups/:id`, `/groups/customGroups/:id/edit`, `/groups/customGroups/:id/edit/addStudents`.        | Modify |
| `server/internal/pg/fixtures/group_custom_detail.json` | Update to match real PGW raw shape.                                                                                                     | Modify |

---

## Task 1: Add client write functions + detail mapper

**Files:**

- Modify: `web/api/client.ts`
- Modify: `web/api/types.ts`

- [ ] **Step 1: Add `PGApiCustomGroupDetail` type**

In `web/api/types.ts`, after `PGApiCustomGroupSummary`:

```ts
export interface PGApiCustomGroupDetailStudent {
  studentId: number;
  studentName: string;
  className: string;
  indexNumber?: number;
  uinFinNo?: string;
  ccas?: string[];
}

export interface PGApiCustomGroupSharedStaff {
  staffId: number;
  staffName: string;
}

export interface PGApiCustomGroupDetail {
  customGroupId: number;
  name: string;
  createdBy: number;
  createdByName: string;
  isShared: boolean;
  sharedWith: PGApiCustomGroupSharedStaff[];
  students: PGApiCustomGroupDetailStudent[];
  createdAt: string;
}

export interface PGApiCreateCustomGroupResponse {
  customGroupId: number;
}
```

- [ ] **Step 2: Add `createCustomGroup` + `fetchCustomGroupDetail` + `updateCustomGroup`**

In `web/api/client.ts`, after the `fetchCustomGroups` block (around line 770):

```ts
interface PgwRawCustomGroupDetail {
  id: number;
  groupName: string;
  createdBy: string;
  createdAt: string;
  owners?: { staffId: number; staffName: string }[];
  studentsList?: {
    studentId: number;
    studentName: string;
    className: string;
    indexNumber?: number;
    uinFinNo?: string;
    ccas?: string[];
  }[];
}

function mapPgwCustomGroupDetail(raw: PgwRawCustomGroupDetail): PGApiCustomGroupDetail {
  const owners = raw.owners ?? [];
  const creator = owners[0];
  return {
    customGroupId: raw.id,
    name: raw.groupName,
    createdBy: creator?.staffId ?? 0,
    createdByName: raw.createdBy,
    isShared: owners.length > 1,
    sharedWith: owners.slice(1),
    students: (raw.studentsList ?? []).map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      className: s.className,
      indexNumber: s.indexNumber,
      uinFinNo: s.uinFinNo,
      ccas: s.ccas,
    })),
    createdAt: raw.createdAt,
  };
}

export async function fetchCustomGroupDetail(id: number): Promise<PGApiCustomGroupDetail> {
  const raw = await fetchApi<PgwRawCustomGroupDetail>(`/groups/custom/${id}`);
  return mapPgwCustomGroupDetail(raw);
}

export async function createCustomGroup(payload: {
  name: string;
  studentIds: number[];
}): Promise<PGApiCreateCustomGroupResponse> {
  return mutateApi<PGApiCreateCustomGroupResponse>('POST', '/groups/custom', payload);
}

export async function updateCustomGroup(
  id: number,
  payload: { name: string; studentIds: number[] },
): Promise<void> {
  await mutateApi<void>('PUT', `/groups/custom/${id}`, payload);
}
```

Existing `mutateApi` signature (line 253): `(method, path, body, options?)` — handles CSRF retry, timeout, error mapping. Don't write a new helper.

- [ ] **Step 3: Update `web/api/types.ts` exports**

Add `PGApiCustomGroupDetail`, `PGApiCustomGroupDetailStudent`, `PGApiCustomGroupSharedStaff`, `PGApiCreateCustomGroupResponse` to whatever the file's barrel-export is.

- [ ] **Step 4: Update mock fixture**

Replace `server/internal/pg/fixtures/group_custom_detail.json` with the real PGW raw shape:

```json
{
  "id": 5,
  "groupName": "Olympiad Study Group",
  "createdBy": "TAN GUANG SHIN",
  "createdAt": "2026-03-01T08:00:00.000Z",
  "owners": [{ "staffId": 1013, "staffName": "TAN GUANG SHIN" }],
  "studentsList": [
    {
      "studentId": 1,
      "studentName": "TAN XIAO MING",
      "className": "H6 KINDNESS",
      "indexNumber": 15,
      "uinFinNo": "S9000001A",
      "ccas": ["BOXING"]
    }
  ]
}
```

- [ ] **Step 5: Run the existing test suite to confirm no regression**

```bash
cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a
pnpm test
```

Expected: prior 173 passes hold (the 2 PGTW-11 failures persist).

- [ ] **Step 6: Commit**

```bash
git add web/api/client.ts web/api/types.ts server/internal/pg/fixtures/group_custom_detail.json
git commit -m "feat(api): PGTW-13c add \`createCustomGroup\`, \`fetchCustomGroupDetail\`, \`updateCustomGroup\` + detail mapper"
```

---

## Task 2: Wire `Create Now` on the create page

**Files:**

- Modify: `web/containers/CreateCustomGroupView.tsx`
- Modify: `web/containers/CreateCustomGroupView.test.tsx`

- [ ] **Step 1: Write the failing test**

Append:

```tsx
import { vi } from 'vitest';

vi.mock('~/api/client', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    createCustomGroup: vi.fn().mockResolvedValue({ customGroupId: 42 }),
  };
});

it('clicking "Create Now" with a title and students POSTs and navigates to /groups/customGroups/:id', async () => {
  const { createCustomGroup } = await import('~/api/client');
  const router = createMemoryRouter(
    [
      { path: '/groups/customGroups/new', Component: CreateCustomGroupView },
      { path: '/groups/customGroups/:id', element: <div>detail page</div> },
    ],
    {
      initialEntries: [
        {
          pathname: '/groups/customGroups/new',
          state: {
            addedStudents: [
              {
                studentId: 1,
                studentName: 'ALDDIN',
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

  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Olympiad' } });
  fireEvent.click(screen.getByRole('button', { name: /create now/i }));

  await screen.findByText('detail page');
  expect(createCustomGroup).toHaveBeenCalledWith({ name: 'Olympiad', studentIds: [1] });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
pnpm test -- CreateCustomGroupView
```

Expected: FAIL — `createCustomGroup` never called; navigation didn't happen.

- [ ] **Step 3: Wire the Save handler**

Edit `web/containers/CreateCustomGroupView.tsx`. Add `useNavigate` import and a submit handler:

```tsx
import { useLocation, useNavigate } from 'react-router';
import { createCustomGroup } from '~/api/client';
import { notify } from '~/lib/notify';
```

Inside the component, before `return`:

```tsx
const navigate = useNavigate();
const [submitting, setSubmitting] = useState(false);

async function handleSave() {
  if (!canSave) return;
  setSubmitting(true);
  try {
    const { customGroupId } = await createCustomGroup({
      name: title.trim(),
      studentIds: students.map((s) => s.studentId),
    });
    navigate(`/groups/customGroups/${customGroupId}`);
  } catch (err) {
    setSubmitting(false);
    if (!(err instanceof Error)) throw err;
    // PGError subclasses already toast through `handleErrorResponse`. Generic
    // errors fall through here.
    notify.error('Could not create the group. Please try again.');
  }
}
```

Update the Create Now button:

```tsx
<Button
  disabled={!canSave || submitting}
  title={canSave ? undefined : 'Add at least one student to create the group'}
  onClick={handleSave}
>
  {submitting ? 'Creating…' : 'Create Now'}
</Button>
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
pnpm test -- CreateCustomGroupView
```

Expected: 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add web/containers/CreateCustomGroupView.tsx web/containers/CreateCustomGroupView.test.tsx
git commit -m "feat(groups): PGTW-13c wire \`Create Now\` to POST + navigate to detail"
```

---

## Task 3: Detail-page route + shell + tabs

**Files:**

- Create: `web/containers/CustomGroupDetailView.tsx`
- Create: `web/containers/CustomGroupDetailView.test.tsx`
- Modify: `web/App.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// web/containers/CustomGroupDetailView.test.tsx
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { PGApiCustomGroupDetail } from '~/api/types';

import { Component as CustomGroupDetailView } from './CustomGroupDetailView';

const detail: PGApiCustomGroupDetail = {
  customGroupId: 5,
  name: 'Olympiad Study Group',
  createdBy: 1013,
  createdByName: 'TAN GUANG SHIN',
  isShared: false,
  sharedWith: [],
  students: [
    {
      studentId: 1,
      studentName: 'TAN XIAO MING',
      className: 'H6 KINDNESS',
      indexNumber: 15,
      uinFinNo: 'S9000001A',
      ccas: ['BOXING'],
    },
  ],
  createdAt: '2026-03-01T08:00:00.000Z',
};

function renderAt(loaderData: PGApiCustomGroupDetail = detail) {
  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/:id',
        Component: CustomGroupDetailView,
        loader: () => loaderData,
      },
    ],
    { initialEntries: ['/groups/customGroups/5'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('CustomGroupDetailView', () => {
  it('renders the group name as the page heading', async () => {
    renderAt();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Olympiad Study Group' }),
    ).toBeInTheDocument();
  });

  it('renders both tab triggers', async () => {
    renderAt();
    expect(await screen.findByRole('tab', { name: /students/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /details/i })).toBeInTheDocument();
  });

  it('renders the student count in the Students tab label', async () => {
    renderAt();
    expect(await screen.findByRole('tab', { name: /students \(1\)/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
pnpm test -- CustomGroupDetailView
```

Expected: 3 FAIL — module not found.

- [ ] **Step 3: Implement the shell**

```tsx
// web/containers/CustomGroupDetailView.tsx
import React from 'react';
import { useLoaderData, useParams } from 'react-router';

import { fetchCustomGroupDetail } from '~/api/client';
import type { PGApiCustomGroupDetail } from '~/api/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui';

export async function loader({
  params,
}: {
  params: { id?: string };
}): Promise<PGApiCustomGroupDetail> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw new Response('Invalid group id', { status: 400 });
  return fetchCustomGroupDetail(id);
}

const CustomGroupDetailView: React.FC = () => {
  const data = useLoaderData() as PGApiCustomGroupDetail;
  const params = useParams();
  void params;

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl">
        <header>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Custom Group</p>
          <h1 className="mt-1 text-2xl font-semibold">{data.name}</h1>
        </header>

        <Tabs defaultValue="students" className="mt-6">
          <TabsList>
            <TabsTrigger value="students">Students ({data.students.length})</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="students">{/* Task 4 */}</TabsContent>
          <TabsContent value="details">{/* Task 5 */}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export { CustomGroupDetailView as Component };
```

- [ ] **Step 4: Wire the lazy route**

Edit `web/App.tsx`. After the `groups/customGroups/new/addStudents` entry, add:

```tsx
{
  path: 'groups/customGroups/:id',
  lazy: () => import('./containers/CustomGroupDetailView'),
},
```

- [ ] **Step 5: Run the tests**

```bash
pnpm test -- CustomGroupDetailView
```

Expected: 3 PASS.

- [ ] **Step 6: Commit**

```bash
git add web/containers/CustomGroupDetailView.tsx web/containers/CustomGroupDetailView.test.tsx web/App.tsx
git commit -m "feat(groups): PGTW-13c scaffold detail page with Students + Details tabs"
```

---

## Task 4: `StudentsByClassList` + Students tab body

**Files:**

- Create: `web/components/groups/StudentsByClassList.tsx`
- Create: `web/components/groups/StudentsByClassList.test.tsx`
- Modify: `web/containers/CustomGroupDetailView.tsx`
- Modify: `web/containers/CustomGroupDetailView.test.tsx`

- [ ] **Step 1: Write `StudentsByClassList` tests**

```tsx
// web/components/groups/StudentsByClassList.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PGApiCustomGroupDetailStudent } from '~/api/types';

import { StudentsByClassList } from './StudentsByClassList';

const xiaoming: PGApiCustomGroupDetailStudent = {
  studentId: 1,
  studentName: 'TAN XIAO MING',
  className: 'H6 KINDNESS',
  indexNumber: 15,
  uinFinNo: 'S9000001A',
  ccas: ['BOXING'],
};
const ahkow: PGApiCustomGroupDetailStudent = {
  studentId: 2,
  studentName: 'LIM AH KOW',
  className: 'P1 KINDNESS',
  indexNumber: 2,
  uinFinNo: 'S9000002B',
  ccas: [],
};

describe('StudentsByClassList', () => {
  it('groups students by className and shows count per group', () => {
    render(<StudentsByClassList students={[xiaoming, ahkow]} />);
    expect(screen.getByText(/H6 KINDNESS \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/P1 KINDNESS \(1\)/)).toBeInTheDocument();
  });

  it('renders student name + UIN under each class', () => {
    render(<StudentsByClassList students={[xiaoming]} />);
    expect(screen.getByText('TAN XIAO MING')).toBeInTheDocument();
    expect(screen.getByText('S9000001A')).toBeInTheDocument();
  });

  it('renders empty-state copy when there are no students', () => {
    render(<StudentsByClassList students={[]} />);
    expect(screen.getByText(/no students in this group/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, see fail**

```bash
pnpm test -- StudentsByClassList
```

Expected: 3 FAIL.

- [ ] **Step 3: Implement**

```tsx
// web/components/groups/StudentsByClassList.tsx
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
                <div className="text-xs text-muted-foreground">
                  {/* PGTW-13c-deferred: Onboarded & Can Respond ✓/✗ */}—
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Wire into the Students tab**

Edit `CustomGroupDetailView.tsx`:

```tsx
import { StudentsByClassList } from '~/components/groups/StudentsByClassList';
```

Replace the `<TabsContent value="students" />` placeholder:

```tsx
<TabsContent value="students" className="mt-4">
  <StudentsByClassList students={data.students} />
</TabsContent>
```

- [ ] **Step 5: Add a wire-up test on the detail view**

Append to `CustomGroupDetailView.test.tsx`:

```tsx
it('renders the student list on the Students tab by default', async () => {
  renderAt();
  expect(await screen.findByText('TAN XIAO MING')).toBeInTheDocument();
});
```

- [ ] **Step 6: Run, see pass**

```bash
pnpm test -- StudentsByClassList CustomGroupDetailView
```

Expected: ALL PASS.

- [ ] **Step 7: Commit**

```bash
git add web/components/groups/StudentsByClassList.tsx web/components/groups/StudentsByClassList.test.tsx web/containers/CustomGroupDetailView.tsx web/containers/CustomGroupDetailView.test.tsx
git commit -m "feat(groups): PGTW-13c \`StudentsByClassList\` wired into detail page"
```

---

## Task 5: Details tab + action cards

**Files:**

- Modify: `web/containers/CustomGroupDetailView.tsx`
- Modify: `web/containers/CustomGroupDetailView.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import { fireEvent } from '@testing-library/react';

it('Details tab shows creator metadata + the three action cards', async () => {
  renderAt();
  fireEvent.click(screen.getByRole('tab', { name: /details/i }));
  expect(await screen.findByText(/created/i)).toBeInTheDocument();
  expect(screen.getByText('TAN GUANG SHIN')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /edit group/i })).toHaveAttribute(
    'href',
    '/groups/customGroups/5/edit',
  );
  expect(screen.getByRole('button', { name: /share group/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /delete forever/i })).toBeDisabled();
});
```

The Share / Delete buttons are intentionally disabled in 13c; PGTW-14 / PGTW-20a wire them up.

- [ ] **Step 2: Run, see fail**

```bash
pnpm test -- CustomGroupDetailView
```

- [ ] **Step 3: Render the Details tab body**

In `CustomGroupDetailView.tsx`, add imports:

```tsx
import { Link } from 'react-router';
import { Button } from '~/components/ui';
import { formatDate } from '~/helpers/dateTime';
```

Replace `<TabsContent value="details" />` with:

```tsx
<TabsContent value="details" className="mt-4 space-y-6">
  <p className="text-sm text-muted-foreground">
    Created on {formatDate(data.createdAt)} by {data.createdByName}.
  </p>
  {data.sharedWith.length > 0 ? (
    <div className="text-sm">
      <span className="font-medium">Group shared with:</span>{' '}
      {data.sharedWith.map((s) => s.staffName).join(', ')}
    </div>
  ) : null}

  <div className="grid gap-3 sm:grid-cols-3">
    <article className="rounded-md border p-4">
      <h3 className="font-semibold">Edit this custom group</h3>
      <Button asChild variant="outline" className="mt-3">
        <Link to={`/groups/customGroups/${data.customGroupId}/edit`}>Edit Group</Link>
      </Button>
    </article>
    <article className="rounded-md border p-4">
      <h3 className="font-semibold">Share this custom group</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        You will be granting access to edit this group. Please be certain.
      </p>
      <Button variant="outline" className="mt-3" disabled>
        Share Group
      </Button>
    </article>
    <article className="rounded-md border p-4">
      <h3 className="font-semibold">Delete this custom group</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Once you delete this custom group, you can never get it back again.
      </p>
      <Button variant="outline" className="mt-3" disabled>
        Delete Forever
      </Button>
    </article>
  </div>
</TabsContent>
```

- [ ] **Step 4: Run, see pass**

```bash
pnpm test -- CustomGroupDetailView
```

Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add web/containers/CustomGroupDetailView.tsx web/containers/CustomGroupDetailView.test.tsx
git commit -m "feat(groups): PGTW-13c detail-page Details tab + action cards"
```

---

## Task 6: Edit page route + shell + Save (PUT)

**Files:**

- Create: `web/containers/EditCustomGroupView.tsx`
- Create: `web/containers/EditCustomGroupView.test.tsx`
- Modify: `web/App.tsx`

`EditCustomGroupView` reuses the same JSX skeleton as `CreateCustomGroupView` but seeds initial state from the loader's detail and Save calls `updateCustomGroup` instead of `createCustomGroup`. Reuses `CreateCustomGroupView`'s patterns; if a refactor opportunity emerges (extract a shared `<GroupForm>`), do it inline here as a clean-up under the same task — but only if it keeps both views simpler.

- [ ] **Step 1: Write the failing tests**

```tsx
// web/containers/EditCustomGroupView.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { PGApiCustomGroupDetail } from '~/api/types';

import { Component as EditCustomGroupView } from './EditCustomGroupView';

vi.mock('~/api/client', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    updateCustomGroup: vi.fn().mockResolvedValue(undefined),
  };
});

const detail: PGApiCustomGroupDetail = {
  customGroupId: 5,
  name: 'Olympiad Study Group',
  createdBy: 1013,
  createdByName: 'TAN GUANG SHIN',
  isShared: false,
  sharedWith: [],
  students: [
    {
      studentId: 1,
      studentName: 'TAN XIAO MING',
      className: 'H6 KINDNESS',
      indexNumber: 15,
      uinFinNo: 'S9000001A',
      ccas: ['BOXING'],
    },
  ],
  createdAt: '2026-03-01T08:00:00.000Z',
};

function renderAt() {
  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/:id/edit',
        Component: EditCustomGroupView,
        loader: () => detail,
      },
      { path: '/groups/customGroups/:id', element: <div>detail page</div> },
    ],
    { initialEntries: ['/groups/customGroups/5/edit'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('EditCustomGroupView', () => {
  it('renders the page heading "Edit group"', async () => {
    renderAt();
    expect(
      await screen.findByRole('heading', { level: 1, name: /edit group/i }),
    ).toBeInTheDocument();
  });

  it('seeds the title input from the loaded detail', async () => {
    renderAt();
    const input = (await screen.findByLabelText(/title/i)) as HTMLInputElement;
    expect(input.value).toBe('Olympiad Study Group');
  });

  it('shows the existing students count and names', async () => {
    renderAt();
    expect(await screen.findByText(/1 student added/i)).toBeInTheDocument();
    expect(screen.getByText('TAN XIAO MING')).toBeInTheDocument();
  });

  it('clicking Save calls updateCustomGroup and navigates to the detail page', async () => {
    const { updateCustomGroup } = await import('~/api/client');
    renderAt();
    fireEvent.change(await screen.findByLabelText(/title/i), {
      target: { value: 'Olympiad Squad' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await screen.findByText('detail page');
    expect(updateCustomGroup).toHaveBeenCalledWith(5, {
      name: 'Olympiad Squad',
      studentIds: [1],
    });
  });
});
```

- [ ] **Step 2: Run, see fail**

```bash
pnpm test -- EditCustomGroupView
```

- [ ] **Step 3: Implement**

```tsx
// web/containers/EditCustomGroupView.tsx
import { Plus } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useLoaderData, useLocation, useNavigate, useParams } from 'react-router';

import { fetchCustomGroupDetail, updateCustomGroup } from '~/api/client';
import type { PGApiCustomGroupDetail, PGApiSchoolStudent } from '~/api/types';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '~/components/ui';
import { notify } from '~/lib/notify';

const TITLE_MAX = 120;

export async function loader({
  params,
}: {
  params: { id?: string };
}): Promise<PGApiCustomGroupDetail> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw new Response('Invalid group id', { status: 400 });
  return fetchCustomGroupDetail(id);
}

interface IncomingNavState {
  addedStudents?: PGApiSchoolStudent[];
}

const EditCustomGroupView: React.FC = () => {
  const detail = useLoaderData() as PGApiCustomGroupDetail;
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const groupId = Number(params.id);

  const navState = (location.state as IncomingNavState | null) ?? {};
  // The edit-flow add-students subpage will return PGApiSchoolStudent[]; the
  // initial detail contains PGApiCustomGroupDetailStudent[]. Normalise to the
  // shape we need for display + submit (just `studentId` + display fields).
  const initialStudents = navState.addedStudents
    ? navState.addedStudents.map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        className: s.className,
      }))
    : detail.students.map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        className: s.className,
      }));

  const [title, setTitle] = useState(detail.name);
  const [students] = useState(initialStudents);
  const [submitting, setSubmitting] = useState(false);

  const studentCount = students.length;
  const dirty = title.trim() !== detail.name || navState.addedStudents !== undefined;
  const canSave = title.trim().length > 0 && studentCount > 0 && dirty;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      await updateCustomGroup(groupId, {
        name: title.trim(),
        studentIds: students.map((s) => s.studentId),
      });
      navigate(`/groups/customGroups/${groupId}`);
    } catch (err) {
      setSubmitting(false);
      if (!(err instanceof Error)) throw err;
      notify.error('Could not save the group. Please try again.');
    }
  }

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold">Edit group</h1>
        <div className="mt-6">
          <label htmlFor="group-title" className="text-sm font-medium">
            Title<span className="text-destructive">*</span>
          </label>
          <Input
            id="group-title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
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
                      to={`/groups/customGroups/${groupId}/edit/addStudents`}
                      state={{ alreadyAdded: students.map((s) => s.studentId) }}
                    >
                      Add manually
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>Upload via Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ul className="mt-2 divide-y rounded-md border">
              {students.map((s) => (
                <li key={s.studentId} className="flex items-center justify-between p-3 text-sm">
                  <span>{s.studentName}</span>
                  <span className="text-xs text-muted-foreground">{s.className}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              to={`/groups/customGroups/${groupId}`}
              className="text-sm font-medium text-muted-foreground hover:underline"
            >
              Cancel
            </Link>
            <Button disabled={!canSave || submitting} onClick={handleSave}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { EditCustomGroupView as Component };
```

- [ ] **Step 4: Wire the lazy routes**

Edit `web/App.tsx`. After the `groups/customGroups/:id` entry, add:

```tsx
{
  path: 'groups/customGroups/:id/edit',
  lazy: () => import('./containers/EditCustomGroupView'),
},
{
  path: 'groups/customGroups/:id/edit/addStudents',
  lazy: () => import('./containers/AddStudentsView'),
},
```

The third route reuses `AddStudentsView` — but the existing component's submit always navigates to `/groups/customGroups/new`. The same component must instead navigate back to whichever parent path it was reached from.

- [ ] **Step 5: Generalise `AddStudentsView` submit destination**

In `web/containers/AddStudentsView.tsx`, replace the hardcoded navigate:

```tsx
function submit() {
  const addedStudents = data.students.filter((s) => selectedIds.has(s.studentId));
  const state: OutgoingNavState = { addedStudents };
  // Strip the trailing /addStudents to return to the parent (create or edit).
  const parent = location.pathname.replace(/\/addStudents$/, '');
  navigate(parent, { state });
}
```

Also update the close link + cancel link:

```tsx
const parentPath = location.pathname.replace(/\/addStudents$/, '');
// …
<Link to={parentPath} aria-label="Close" …>
// …
<Link to={parentPath} className="…">Cancel</Link>
```

Update existing AddStudentsView tests to assert on the dynamic parent path:

```tsx
it('renders a close link back to the parent route', async () => {
  renderWithData([], []);
  const close = await screen.findByRole('link', { name: /close/i });
  expect(close).toHaveAttribute('href', '/groups/customGroups/new');
});
```

- [ ] **Step 6: Run, see pass**

```bash
pnpm test -- EditCustomGroupView AddStudentsView
```

Expected: ALL PASS.

- [ ] **Step 7: Commit**

```bash
git add web/containers/EditCustomGroupView.tsx web/containers/EditCustomGroupView.test.tsx web/containers/AddStudentsView.tsx web/containers/AddStudentsView.test.tsx web/App.tsx
git commit -m "feat(groups): PGTW-13c edit page + reuse \`AddStudentsView\` for edit flow"
```

---

## Task 7: Manual smoke test

- [ ] **Step 1: Make sure the stack is up**

```
/tw-up
```

- [ ] **Step 2: Walk through the full create → detail → edit loop**

1. Navigate to http://localhost:5173/groups
2. Click "+ Create custom group" → land on `/groups/customGroups/new`
3. Type a title; Add manually; pick students; Add N selected
4. Click **Create Now** → POST fires; URL becomes `/groups/customGroups/<newId>`
5. Detail page renders: heading is the group name; "Custom Group" subtitle; Students tab shows students grouped by className with count; Details tab shows "Created on … by …", action cards, Edit link works, Share + Delete are disabled
6. Click **Edit Group** → URL becomes `/groups/customGroups/<id>/edit`. Title pre-filled; students list pre-populated; Save is initially disabled (no changes); editing the title enables Save
7. Click **+ Add Students → Add manually** → URL becomes `/groups/customGroups/<id>/edit/addStudents`. Pick more students. Add N selected → returns to edit page with both old + new students
8. Click **Save** → PUT fires; URL returns to `/groups/customGroups/<id>` detail page; new title + students reflected
9. Refresh the detail page → loader re-fetches; data persists in MySQL

- [ ] **Step 3: Run unit tests + lint**

```bash
cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a
pnpm test
pnpm lint
```

- [ ] **Step 4: Commit any smoke-test fixups**

```bash
git add -p
git commit -m "fix(groups): PGTW-13c address smoke-test findings"
```

---

## Known Phase-1 limitations

1. **Onboarded & Can Respond ✓/✗** — placeholder `—` rendered. Open question #6 in the audit.
2. **Edit page state hand-off only carries the latest add-students return** — the `dirty` flag treats new added-students as always-dirty even if they overlap with existing. Acceptable for Phase 1; refine in 13c follow-up if needed.
3. **No "remove student" UX on edit page** — PGW spec §7.3 has a × icon per row. Defer; file as follow-up. Without it, the edit page can only ADD students, not remove.
4. **Stale-tab edits** — last write wins. PGTW-13a audit cross-cutting #5.
5. **Share + Delete buttons are visually disabled** — PGTW-14 / PGTW-20a.

---

## Out of scope

- **PGTW-13d Excel upload** — blocked on PG-team confirmation of `validateStudents` shape.
- **PGTW-14 share modal** — wires the disabled Share Group button.
- **PGTW-20 delete** — wires the disabled Delete Forever button.
- **PGTW-15 SC custom group** — open question.
