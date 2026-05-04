# PGTW-13a: Groups Module Shell — Overview + Create-Empty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Light up the `/groups` module foundation — a top-level route showing the user's existing custom groups + assigned groups, a sidebar nav entry, and a `/groups/customGroups/new` create-page shell with the title input and empty states. Save remains disabled until PGTW-13b adds the manual student-selection subpage.

**Architecture:** Mirror PGW's `/groups` IA exactly (URLs are part of parity — see [pg-specs.md §7](../references/pg-specs.md)). New top-level `/groups` and `/groups/customGroups/new` routes load via the existing `react-router` lazy + `Component` + `loader` pattern (same as PostsView). New container files under `web/containers/`, new presentational components under `web/components/groups/`. Reuse `loadCustomGroups()` and `loadGroupsAssigned()` from `web/api/client.ts` — both already wired and BFF-mock-stubbed. No new endpoints called in this plan; the create page's Save button stays disabled until 13b.

**Tech Stack:** React 19, react-router 7, TypeScript 6, Tailwind 4, Vitest + React Testing Library + jsdom. UI primitives from `~/components/ui`; icons from `lucide-react` (matching the existing PostsView idiom).

**Spec reference:** [docs/audits/pgtw-13-20-custom-groups-parity-scope.md](../audits/pgtw-13-20-custom-groups-parity-scope.md) — PGTW-13a sub-item under "Suggested ordering".

---

## File Structure

| File                                                   | Responsibility                                                                                                                                       | Action |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `web/containers/GroupsView.tsx`                        | Route container for `/groups`. Loader fetches custom + assigned groups. Renders Assigned + Custom sections + Create CTA.                             | Create |
| `web/containers/GroupsView.test.tsx`                   | Container integration tests for `GroupsView` (rendering, empty states, navigation).                                                                  | Create |
| `web/containers/CreateCustomGroupView.tsx`             | Route container for `/groups/customGroups/new`. Renders title input, empty students state, disabled add-students dropdown, Cancel/Create Now footer. | Create |
| `web/containers/CreateCustomGroupView.test.tsx`        | Container integration tests.                                                                                                                         | Create |
| `web/components/groups/CustomGroupsTable.tsx`          | Presentational table of custom groups.                                                                                                               | Create |
| `web/components/groups/CustomGroupsTable.test.tsx`     | Component tests.                                                                                                                                     | Create |
| `web/components/groups/AssignedGroupsSection.tsx`      | Presentational card grid for assigned classes + CCAs.                                                                                                | Create |
| `web/components/groups/AssignedGroupsSection.test.tsx` | Component tests.                                                                                                                                     | Create |
| `web/App.tsx`                                          | Add `/groups` and `/groups/customGroups/new` lazy routes.                                                                                            | Modify |
| `web/containers/RootLayout.tsx`                        | Add Groups sidebar item + extend `selected` switch.                                                                                                  | Modify |

No changes to `web/api/client.ts`, `web/api/types.ts`, or BFF — all required types and endpoints exist already.

---

## Task 1: GroupsView container shell + `/groups` route

**Files:**

- Create: `web/containers/GroupsView.tsx`
- Create: `web/containers/GroupsView.test.tsx`
- Modify: `web/App.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// web/containers/GroupsView.test.tsx
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Component as GroupsView } from './GroupsView';

function renderAt(path = '/groups') {
  const router = createMemoryRouter(
    [
      {
        path: '/groups',
        Component: GroupsView,
        loader: () => ({ customGroups: [], assigned: { classes: [], ccaGroups: [] } }),
      },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe('GroupsView', () => {
  it('renders the page heading', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { level: 1, name: /groups/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- GroupsView`
Expected: FAIL — module `./GroupsView` not found.

- [ ] **Step 3: Implement the minimal container**

```tsx
// web/containers/GroupsView.tsx
import React from 'react';
import { useLoaderData } from 'react-router';

import { loadCustomGroups, loadGroupsAssigned } from '~/api/client';
import type { PGApiCustomGroupSummary, PGApiGroupsAssigned } from '~/api/types';

interface GroupsLoaderData {
  customGroups: PGApiCustomGroupSummary[];
  assigned: PGApiGroupsAssigned;
}

export async function loader(): Promise<GroupsLoaderData> {
  const [customList, assigned] = await Promise.all([loadCustomGroups(), loadGroupsAssigned()]);
  return { customGroups: customList.customGroups, assigned };
}

const GroupsView: React.FC = () => {
  const data = useLoaderData() as GroupsLoaderData;
  void data;
  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold">Groups</h1>
    </div>
  );
};

export { GroupsView as Component };
```

- [ ] **Step 4: Wire the lazy route**

Edit `web/App.tsx`. After the `posts/:id/edit` entry and before `components`, add:

```tsx
{
  path: 'groups',
  lazy: () => import('./containers/GroupsView'),
},
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `pnpm test -- GroupsView`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/containers/GroupsView.tsx web/containers/GroupsView.test.tsx web/App.tsx
git commit -m "feat(groups): PGTW-13a scaffold \`/groups\` route + \`GroupsView\` shell"
```

---

## Task 2: Sidebar nav entry for Groups

**Files:**

- Modify: `web/containers/RootLayout.tsx`

- [ ] **Step 1: Write the failing test**

Append to `web/containers/GroupsView.test.tsx`:

```tsx
// inside describe('GroupsView', () => { ... })
import RootLayout from './RootLayout';

it('renders a Groups sidebar item that highlights at /groups', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        Component: RootLayout,
        children: [
          {
            path: 'groups',
            Component: GroupsView,
            loader: () => ({ customGroups: [], assigned: { classes: [], ccaGroups: [] } }),
          },
        ],
      },
    ],
    { initialEntries: ['/groups'] },
  );
  render(<RouterProvider router={router} />);
  const nav = await screen.findByRole('link', { name: /groups/i });
  expect(nav).toHaveAttribute('href', '/groups');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- GroupsView`
Expected: FAIL — no link with name "Groups" found.

- [ ] **Step 3: Add the sidebar entry**

Edit `web/containers/RootLayout.tsx`.

a) Extend the icon import:

```tsx
import { HelpCircle, Home, Mail, UsersRound, FolderKanban } from '@flow/icons';
```

(If `FolderKanban` isn't exported by `@flow/icons`, fall back to `Users` or `Folder` — confirm with `mcp__flow__list_icons` query "folder" or "group" before substituting.)

b) Extend the `selected` switch:

```tsx
const selected = useMemo(() => {
  switch (segment) {
    case 'students':
    case 'posts':
    case 'groups':
      return segment;
    default:
      return '/';
  }
}, [segment]);
```

c) Add the `SidebarItem` after the Posts item, inside `<SidebarContent>`:

```tsx
<SidebarItem
  icon={FolderKanban}
  label="Groups"
  tooltip="Groups"
  to="/groups"
  selected={selected === 'groups'}
/>
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- GroupsView`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/containers/RootLayout.tsx web/containers/GroupsView.test.tsx
git commit -m "feat(groups): PGTW-13a add Groups sidebar nav entry"
```

---

## Task 3: `CustomGroupsTable` — empty state

**Files:**

- Create: `web/components/groups/CustomGroupsTable.tsx`
- Create: `web/components/groups/CustomGroupsTable.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// web/components/groups/CustomGroupsTable.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { CustomGroupsTable } from './CustomGroupsTable';

function renderTable(groups: Parameters<typeof CustomGroupsTable>[0]['groups']) {
  return render(
    <MemoryRouter>
      <CustomGroupsTable groups={groups} />
    </MemoryRouter>,
  );
}

describe('CustomGroupsTable', () => {
  it('renders empty state copy when there are no groups', () => {
    renderTable([]);
    expect(screen.getByText(/no custom groups yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- CustomGroupsTable`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the empty-state-only component**

```tsx
// web/components/groups/CustomGroupsTable.tsx
import React from 'react';

import type { PGApiCustomGroupSummary } from '~/api/types';

interface CustomGroupsTableProps {
  groups: PGApiCustomGroupSummary[];
}

export const CustomGroupsTable: React.FC<CustomGroupsTableProps> = ({ groups }) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No custom groups yet.
      </div>
    );
  }
  return null;
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- CustomGroupsTable`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/components/groups/CustomGroupsTable.tsx web/components/groups/CustomGroupsTable.test.tsx
git commit -m "feat(groups): PGTW-13a \`CustomGroupsTable\` empty state"
```

---

## Task 4: `CustomGroupsTable` — populated rows

**Files:**

- Modify: `web/components/groups/CustomGroupsTable.tsx`
- Modify: `web/components/groups/CustomGroupsTable.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `CustomGroupsTable.test.tsx` inside the existing `describe`:

```tsx
import type { PGApiCustomGroupSummary } from '~/api/types';

const olympiad: PGApiCustomGroupSummary = {
  customGroupId: 5,
  name: 'Olympiad Study Group',
  studentCount: 8,
  createdBy: 1013,
  createdByName: 'TAN GUANG SHIN',
  isShared: false,
  createdAt: '2026-03-01T08:00:00.000Z',
};

it('renders one row per group with name, student count, created on, and created by', () => {
  renderTable([olympiad]);
  expect(screen.getByText('Olympiad Study Group')).toBeInTheDocument();
  expect(screen.getByText('8')).toBeInTheDocument();
  expect(screen.getByText('TAN GUANG SHIN')).toBeInTheDocument();
  expect(screen.getByText(/1 mar 2026/i)).toBeInTheDocument();
});

it('group name is a link to the detail page', () => {
  renderTable([olympiad]);
  const link = screen.getByRole('link', { name: 'Olympiad Study Group' });
  expect(link).toHaveAttribute('href', '/groups/customGroups/5');
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test -- CustomGroupsTable`
Expected: 2 FAIL — rendered DOM is null.

- [ ] **Step 3: Implement the populated table**

```tsx
// web/components/groups/CustomGroupsTable.tsx
import { Users } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import type { PGApiCustomGroupSummary } from '~/api/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui';
import { formatDate } from '~/helpers/dateTime';

interface CustomGroupsTableProps {
  groups: PGApiCustomGroupSummary[];
}

export const CustomGroupsTable: React.FC<CustomGroupsTableProps> = ({ groups }) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No custom groups yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Group name</TableHead>
          <TableHead className="text-right">No. of students</TableHead>
          <TableHead>Created on</TableHead>
          <TableHead>Created by</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((g) => (
          <TableRow key={g.customGroupId}>
            <TableCell>
              <Link
                to={`/groups/customGroups/${g.customGroupId}`}
                className="font-medium text-foreground hover:underline"
              >
                {g.name}
              </Link>
            </TableCell>
            <TableCell className="text-right">
              <span className="inline-flex items-center gap-1">
                <Users className="size-4 text-muted-foreground" aria-hidden />
                {g.studentCount}
              </span>
            </TableCell>
            <TableCell>{formatDate(g.createdAt)}</TableCell>
            <TableCell>{g.createdByName}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

Note: if `formatDate(g.createdAt)` doesn't render as `1 Mar 2026` (the helper might use a different format), tweak the test's regex to match the actual output — DO NOT change the helper. Existing PostsView already calls `formatDate` so its output format is canonical.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test -- CustomGroupsTable`
Expected: 3 PASS (empty state + 2 new).

- [ ] **Step 5: Commit**

```bash
git add web/components/groups/CustomGroupsTable.tsx web/components/groups/CustomGroupsTable.test.tsx
git commit -m "feat(groups): PGTW-13a \`CustomGroupsTable\` populated rows"
```

---

## Task 5: Wire `CustomGroupsTable` into `GroupsView`

**Files:**

- Modify: `web/containers/GroupsView.tsx`
- Modify: `web/containers/GroupsView.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to the existing `describe('GroupsView', …)` block:

```tsx
it('renders the custom-groups table populated from the loader', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '/groups',
        Component: GroupsView,
        loader: () => ({
          customGroups: [
            {
              customGroupId: 5,
              name: 'Olympiad Study Group',
              studentCount: 8,
              createdBy: 1013,
              createdByName: 'TAN GUANG SHIN',
              isShared: false,
              createdAt: '2026-03-01T08:00:00.000Z',
            },
          ],
          assigned: { classes: [], ccaGroups: [] },
        }),
      },
    ],
    { initialEntries: ['/groups'] },
  );
  render(<RouterProvider router={router} />);
  expect(await screen.findByText('Olympiad Study Group')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- GroupsView`
Expected: FAIL — "Olympiad Study Group" not in document.

- [ ] **Step 3: Wire the table into `GroupsView`**

Edit `web/containers/GroupsView.tsx`. Add the import and replace the body:

```tsx
import { CustomGroupsTable } from '~/components/groups/CustomGroupsTable';
```

Replace the `<div>` body with:

```tsx
return (
  <div className="px-4 py-6 md:px-6">
    <h1 className="text-2xl font-semibold">Groups</h1>
    <section className="mt-8">
      <h2 className="text-lg font-semibold">
        Custom Groups{' '}
        <span className="text-sm font-normal text-muted-foreground">
          ({data.customGroups.length} created)
        </span>
      </h2>
      <div className="mt-3">
        <CustomGroupsTable groups={data.customGroups} />
      </div>
    </section>
  </div>
);
```

Remove the `void data;` line.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- GroupsView`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/containers/GroupsView.tsx web/containers/GroupsView.test.tsx
git commit -m "feat(groups): PGTW-13a render \`CustomGroupsTable\` inside \`GroupsView\`"
```

---

## Task 6: `AssignedGroupsSection` component

**Files:**

- Create: `web/components/groups/AssignedGroupsSection.tsx`
- Create: `web/components/groups/AssignedGroupsSection.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// web/components/groups/AssignedGroupsSection.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PGApiGroupsAssigned } from '~/api/types';

import { AssignedGroupsSection } from './AssignedGroupsSection';

const empty: PGApiGroupsAssigned = { classes: [], ccaGroups: [] };

describe('AssignedGroupsSection', () => {
  it('renders empty-state copy when no classes or CCAs are assigned', () => {
    render(<AssignedGroupsSection assigned={empty} />);
    expect(screen.getByText(/no assigned groups/i)).toBeInTheDocument();
  });

  it('renders one card per class with the class name and a "Form Class" label', () => {
    render(
      <AssignedGroupsSection
        assigned={{
          classes: [
            {
              classId: 1005,
              className: 'P1 KINDNESS',
              level: 'P1',
              year: 2026,
              role: 'FT',
              studentCount: 30,
            },
          ],
          ccaGroups: [],
        }}
      />,
    );
    expect(screen.getByText('P1 KINDNESS')).toBeInTheDocument();
    expect(screen.getByText(/form class/i)).toBeInTheDocument();
  });

  it('renders one card per CCA with the CCA description and a "CCA" label', () => {
    render(
      <AssignedGroupsSection
        assigned={{
          classes: [],
          ccaGroups: [{ ccaId: 1001, ccaDescription: 'AIR RIFLE / SHOOTING', studentCount: 12 }],
        }}
      />,
    );
    expect(screen.getByText('AIR RIFLE / SHOOTING')).toBeInTheDocument();
    expect(screen.getByText(/^cca$/i)).toBeInTheDocument();
  });
});
```

Type shapes verified against [web/api/types.ts:388-401](../../web/api/types.ts#L388-L401): `PGApiGroupsAssignedClass = { classId, className, level, year, role, studentCount }`; `PGApiGroupsAssignedCcaGroup = { ccaId, ccaDescription, studentCount }`. Do NOT modify the types — if these change before implementation, update the fixtures, not the type.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test -- AssignedGroupsSection`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the section**

```tsx
// web/components/groups/AssignedGroupsSection.tsx
import React from 'react';

import type { PGApiGroupsAssigned } from '~/api/types';

interface AssignedGroupsSectionProps {
  assigned: PGApiGroupsAssigned;
}

export const AssignedGroupsSection: React.FC<AssignedGroupsSectionProps> = ({ assigned }) => {
  const isEmpty = assigned.classes.length === 0 && assigned.ccaGroups.length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No assigned groups.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {assigned.classes.map((c) => (
        <article key={`class-${c.classId}`} className="rounded-md border border-border bg-card p-4">
          <h3 className="font-medium">{c.className}</h3>
          <p className="text-xs text-muted-foreground">Form Class</p>
        </article>
      ))}
      {assigned.ccaGroups.map((g) => (
        <article key={`cca-${g.ccaId}`} className="rounded-md border border-border bg-card p-4">
          <h3 className="font-medium">{g.ccaDescription || 'Untitled CCA'}</h3>
          <p className="text-xs text-muted-foreground">CCA</p>
        </article>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test -- AssignedGroupsSection`
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add web/components/groups/AssignedGroupsSection.tsx web/components/groups/AssignedGroupsSection.test.tsx
git commit -m "feat(groups): PGTW-13a \`AssignedGroupsSection\` card grid"
```

---

## Task 7: Wire `AssignedGroupsSection` into `GroupsView`

**Files:**

- Modify: `web/containers/GroupsView.tsx`
- Modify: `web/containers/GroupsView.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to the existing `describe('GroupsView', …)` block:

```tsx
it('renders the assigned-groups section above the custom-groups section', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '/groups',
        Component: GroupsView,
        loader: () => ({
          customGroups: [],
          assigned: {
            classes: [
              {
                classId: 1005,
                className: 'P1 KINDNESS',
                level: 'P1',
                year: 2026,
                role: 'FT',
                studentCount: 30,
              },
            ],
            ccaGroups: [],
          },
        }),
      },
    ],
    { initialEntries: ['/groups'] },
  );
  render(<RouterProvider router={router} />);
  expect(await screen.findByText('P1 KINDNESS')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- GroupsView`
Expected: FAIL — "P1 KINDNESS" not in document.

- [ ] **Step 3: Wire the section**

Edit `web/containers/GroupsView.tsx`. Add the import:

```tsx
import { AssignedGroupsSection } from '~/components/groups/AssignedGroupsSection';
```

Insert this section ABOVE the existing Custom Groups section in the JSX:

```tsx
<section className="mt-6">
  <h2 className="text-lg font-semibold">Assigned Groups</h2>
  <div className="mt-3">
    <AssignedGroupsSection assigned={data.assigned} />
  </div>
</section>
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- GroupsView`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/containers/GroupsView.tsx web/containers/GroupsView.test.tsx
git commit -m "feat(groups): PGTW-13a render \`AssignedGroupsSection\` inside \`GroupsView\`"
```

---

## Task 8: "+ Create custom group" CTA on overview

**Files:**

- Modify: `web/containers/GroupsView.tsx`
- Modify: `web/containers/GroupsView.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to the existing `describe('GroupsView', …)` block:

```tsx
it('shows a "Create custom group" CTA that links to /groups/customGroups/new', async () => {
  const router = createMemoryRouter(
    [
      {
        path: '/groups',
        Component: GroupsView,
        loader: () => ({ customGroups: [], assigned: { classes: [], ccaGroups: [] } }),
      },
    ],
    { initialEntries: ['/groups'] },
  );
  render(<RouterProvider router={router} />);
  const cta = await screen.findByRole('link', { name: /create custom group/i });
  expect(cta).toHaveAttribute('href', '/groups/customGroups/new');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- GroupsView`
Expected: FAIL — link not found.

- [ ] **Step 3: Add the CTA**

Edit `web/containers/GroupsView.tsx`. Add imports:

```tsx
import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '~/components/ui';
```

Wrap the heading in a flex row so the CTA sits on the right:

```tsx
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-semibold">Groups</h1>
  <Button asChild>
    <Link to="/groups/customGroups/new">
      <Plus className="size-4" aria-hidden />
      Create custom group
    </Link>
  </Button>
</div>
```

If the local `Button` primitive doesn't expose `asChild`, fall back to `<Link>` with a button-like className — check `web/components/ui/button.tsx` first; mirror whichever pattern PostsView uses for the "+ New post" CTA.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- GroupsView`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/containers/GroupsView.tsx web/containers/GroupsView.test.tsx
git commit -m "feat(groups): PGTW-13a \`+ Create custom group\` CTA on overview"
```

---

## Task 9: `CreateCustomGroupView` shell + `/groups/customGroups/new` route

**Files:**

- Create: `web/containers/CreateCustomGroupView.tsx`
- Create: `web/containers/CreateCustomGroupView.test.tsx`
- Modify: `web/App.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// web/containers/CreateCustomGroupView.test.tsx
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { Component as CreateCustomGroupView } from './CreateCustomGroupView';

function renderView() {
  const router = createMemoryRouter(
    [{ path: '/groups/customGroups/new', Component: CreateCustomGroupView }],
    { initialEntries: ['/groups/customGroups/new'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('CreateCustomGroupView', () => {
  it('renders the page heading "Create new group"', async () => {
    renderView();
    expect(
      await screen.findByRole('heading', { level: 1, name: /create new group/i }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- CreateCustomGroupView`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the shell + register the route**

```tsx
// web/containers/CreateCustomGroupView.tsx
import React from 'react';

const CreateCustomGroupView: React.FC = () => {
  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold">Create new group</h1>
    </div>
  );
};

export { CreateCustomGroupView as Component };
```

Edit `web/App.tsx`. After the `groups` entry, add:

```tsx
{
  path: 'groups/customGroups/new',
  lazy: () => import('./containers/CreateCustomGroupView'),
},
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- CreateCustomGroupView`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/containers/CreateCustomGroupView.tsx web/containers/CreateCustomGroupView.test.tsx web/App.tsx
git commit -m "feat(groups): PGTW-13a scaffold \`/groups/customGroups/new\` + \`CreateCustomGroupView\` shell"
```

---

## Task 10: Title input with 120-char limit + counter

**Files:**

- Modify: `web/containers/CreateCustomGroupView.tsx`
- Modify: `web/containers/CreateCustomGroupView.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to the existing `describe`:

```tsx
import { fireEvent } from '@testing-library/react';

it('allows typing into the title input and shows the remaining-character counter', () => {
  renderView();
  const input = screen.getByLabelText(/title/i) as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Olympiad Squad' } });
  expect(input.value).toBe('Olympiad Squad');
  expect(screen.getByText(/106 characters left/i)).toBeInTheDocument();
});

it('does not allow typing past 120 characters', () => {
  renderView();
  const input = screen.getByLabelText(/title/i) as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'a'.repeat(150) } });
  expect(input.value.length).toBe(120);
  expect(screen.getByText(/0 characters left/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test -- CreateCustomGroupView`
Expected: 2 FAIL — input not found.

- [ ] **Step 3: Implement the controlled input + counter**

Replace the body of `CreateCustomGroupView.tsx` with:

```tsx
import React, { useState } from 'react';

import { Input } from '~/components/ui';

const TITLE_MAX = 120;

const CreateCustomGroupView: React.FC = () => {
  const [title, setTitle] = useState('');

  return (
    <div className="px-4 py-6 md:px-6">
      <h1 className="text-2xl font-semibold">Create new group</h1>
      <div className="mt-6 max-w-2xl">
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
      </div>
    </div>
  );
};

export { CreateCustomGroupView as Component };
```

If the local `Input` primitive's API differs (e.g. accepts `onValueChange` instead of `onChange`), match its signature — read `web/components/ui/input.tsx` and mirror PostsView's title input.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test -- CreateCustomGroupView`
Expected: 3 PASS (heading + 2 new).

- [ ] **Step 5: Commit**

```bash
git add web/containers/CreateCustomGroupView.tsx web/containers/CreateCustomGroupView.test.tsx
git commit -m "feat(groups): PGTW-13a title input with 120-char counter on create page"
```

---

## Task 11: Empty students state

**Files:**

- Modify: `web/containers/CreateCustomGroupView.tsx`
- Modify: `web/containers/CreateCustomGroupView.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to the existing `describe`:

```tsx
it('shows the empty students state with a "0 students added" counter and "No students added yet." copy', () => {
  renderView();
  expect(screen.getByText(/0 students added/i)).toBeInTheDocument();
  expect(screen.getByText(/no students added yet/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- CreateCustomGroupView`
Expected: FAIL.

- [ ] **Step 3: Add the empty students section**

In `CreateCustomGroupView.tsx`, append below the title block (still inside the `max-w-2xl` div):

```tsx
<div className="mt-6">
  <p className="text-sm font-medium">0 students added.</p>
  <div className="mt-2 rounded-md bg-muted p-6 text-center text-sm text-muted-foreground">
    No students added yet.
  </div>
</div>
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test -- CreateCustomGroupView`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/containers/CreateCustomGroupView.tsx web/containers/CreateCustomGroupView.test.tsx
git commit -m "feat(groups): PGTW-13a empty students state on create page"
```

---

## Task 12: "+ Add Students" dropdown with disabled items

**Files:**

- Modify: `web/containers/CreateCustomGroupView.tsx`
- Modify: `web/containers/CreateCustomGroupView.test.tsx`

PGW shows two items in this dropdown ("Add manually", "Upload via Excel"). Both are wired in PGTW-13b/13d; in 13a the button renders but both items are `disabled` so clicking has no navigation effect.

- [ ] **Step 1: Write the failing test**

Add to the existing `describe`:

```tsx
it('shows an "+ Add Students" dropdown with two disabled items', async () => {
  renderView();
  const trigger = screen.getByRole('button', { name: /add students/i });
  fireEvent.click(trigger);
  const manual = await screen.findByRole('menuitem', { name: /add manually/i });
  const excel = await screen.findByRole('menuitem', { name: /upload via excel/i });
  expect(manual).toHaveAttribute('aria-disabled', 'true');
  expect(excel).toHaveAttribute('aria-disabled', 'true');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test -- CreateCustomGroupView`
Expected: FAIL — button not found.

- [ ] **Step 3: Add the dropdown**

Edit `CreateCustomGroupView.tsx`. Add imports:

```tsx
import { Plus } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui';
```

Replace the empty-students block from Task 11 with:

```tsx
<div className="mt-6">
  <div className="flex items-center justify-between">
    <p className="text-sm font-medium">0 students added.</p>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" aria-hidden />
          Add Students
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem disabled>Add manually</DropdownMenuItem>
        <DropdownMenuItem disabled>Upload via Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  <div className="mt-2 rounded-md bg-muted p-6 text-center text-sm text-muted-foreground">
    No students added yet.
  </div>
</div>
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test -- CreateCustomGroupView`
Expected: ALL PASS.

If `DropdownMenuItem` renders `aria-disabled="true"` on `disabled` automatically, the test passes as written. If not, the local primitive may need an explicit `aria-disabled={true}` prop — check the existing PostsView dropdown usage and mirror it.

- [ ] **Step 5: Commit**

```bash
git add web/containers/CreateCustomGroupView.tsx web/containers/CreateCustomGroupView.test.tsx
git commit -m "feat(groups): PGTW-13a disabled \`+ Add Students\` dropdown on create page"
```

---

## Task 13: Cancel + Create Now footer (Cancel works, Create disabled)

**Files:**

- Modify: `web/containers/CreateCustomGroupView.tsx`
- Modify: `web/containers/CreateCustomGroupView.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add to the existing `describe`:

```tsx
it('shows a Cancel link that navigates back to /groups', async () => {
  renderView();
  const cancel = await screen.findByRole('link', { name: /cancel/i });
  expect(cancel).toHaveAttribute('href', '/groups');
});

it('disables the Create Now button when there are no students or no title', async () => {
  renderView();
  const create = screen.getByRole('button', { name: /create now/i });
  expect(create).toBeDisabled();

  // Even with a title, no students → still disabled.
  const input = screen.getByLabelText(/title/i) as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Some title' } });
  expect(create).toBeDisabled();
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test -- CreateCustomGroupView`
Expected: 2 FAIL — buttons not found.

- [ ] **Step 3: Add the footer**

Edit `CreateCustomGroupView.tsx`. Add imports:

```tsx
import { Link } from 'react-router';
```

Append to the bottom of the `max-w-2xl` div:

```tsx
<div className="mt-8 flex items-center justify-end gap-3">
  <Link to="/groups" className="text-sm font-medium text-muted-foreground hover:underline">
    Cancel
  </Link>
  <Button disabled title="Add at least one student to create the group">
    Create Now
  </Button>
</div>
```

The `disabled` attribute is hard-coded in 13a — there is no way to add students yet. PGTW-13b will replace this with a `disabled={title.length === 0 || students.length === 0}` expression once selected students are wired into state.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test -- CreateCustomGroupView`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add web/containers/CreateCustomGroupView.tsx web/containers/CreateCustomGroupView.test.tsx
git commit -m "feat(groups): PGTW-13a Cancel + (disabled) Create Now footer on create page"
```

---

## Task 14: Manual smoke test in mock mode

The unit tests above lock in component behavior; this task confirms the route boots end-to-end against the BFF mock per [memory: port pgw-web tests first; otherwise curl+click before marking done](../../../.claude/projects/-Users-shin-Desktop-projects-tw-pg-experiment/memory/feedback-verify-before-done.md).

- [ ] **Step 1: Start both servers**

In two shells from the repo root (with `TW_PG_MOCK=true` in your `.env`):

```bash
go run ./server/cmd/tw    # shell 1 — BFF on :3000
pnpm dev                  # shell 2 — Vite on :5173
```

- [ ] **Step 2: Open http://localhost:5173/groups in a browser**

Confirm:

- Sidebar highlights "Groups".
- Page heading reads "Groups".
- Assigned Groups section renders cards from `groups_assigned.json`.
- Custom Groups table shows the "Olympiad Study Group" row from `groups_custom.json`.
- Clicking the row's group name navigates to `/groups/customGroups/5` (404 expected — no detail route in 13a).
- "+ Create custom group" CTA is visible top-right.

- [ ] **Step 3: Click "+ Create custom group"**

Confirm:

- URL is `/groups/customGroups/new`.
- Heading reads "Create new group".
- Title input accepts up to 120 characters; counter updates as you type.
- Empty students state shows "0 students added." and "No students added yet."
- "+ Add Students" dropdown opens; both items appear visually disabled.
- "Cancel" link navigates back to `/groups`.
- "Create Now" button is disabled.

- [ ] **Step 4: Run the full unit-test suite**

```bash
pnpm test
```

Expected: full suite PASSES, including the new GroupsView, CreateCustomGroupView, CustomGroupsTable, AssignedGroupsSection tests.

- [ ] **Step 5: Run lint + typecheck**

```bash
pnpm lint
pnpm format
go test ./...        # confirm no BFF regressions
golangci-lint run    # if installed
```

Expected: clean.

- [ ] **Step 6: Final sanity commit (if anything was tweaked during smoke testing)**

If steps 1-5 surfaced minor fixes, commit them:

```bash
git add -p          # review and stage interactively
git commit -m "fix(groups): PGTW-13a address smoke-test findings"
```

If no fixes were needed, skip this step.

---

## Out of scope (deferred to later PGTW-13/14/15/20 sub-plans)

- Manual student-selection subpage `/groups/customGroups/:id/edit/addStudents` (PGTW-13b).
- Group detail page + edit page (PGTW-13c).
- Share modal + "Shared with you" tab (PGTW-14).
- Single + multi-select delete (PGTW-20a, b).
- Excel upload pipeline (PGTW-13d — blocked on PG-team confirmation; see open questions in [docs/audits/pgtw-13-20-custom-groups-parity-scope.md](../audits/pgtw-13-20-custom-groups-parity-scope.md)).
- SC custom group (PGTW-15 — blocked).
- "+ Create new group" shortcut from the posts recipient picker (cross-cutting follow-up).
- Wiring the kebab menu (View / Edit / Delete) on each table row — depends on detail/edit/delete pages above.

---

## Self-review checklist (run after implementation)

- [ ] Every task's tests pass in isolation (`pnpm test -- <file>`) and as a suite (`pnpm test`).
- [ ] `/groups` route renders against the mock fixtures with no console errors.
- [ ] Sidebar highlights "Groups" when on `/groups` and on `/groups/customGroups/new`.
- [ ] Title-counter copy matches PGW spec ("N characters left") — check [pg-specs.md §7.7](../references/pg-specs.md).
- [ ] No new endpoints called; no changes to `web/api/client.ts`, `types.ts`, or BFF mock.
- [ ] No backwards-compat shims, no TODO comments, no dead code.
