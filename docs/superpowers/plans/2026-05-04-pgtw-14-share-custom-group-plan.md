# PGTW-14: Share Custom Group with Staff — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a share modal to the custom group detail page that lets the group owner share access with other staff members, matching PGW's existing behavior.

**Architecture:** A `ShareGroupModal` dialog component reuses the existing `StaffSelector`. The modal opens from the detail page's "Share Group" action card. On submit it calls `shareCustomGroup()` → `PUT /groups/custom/:id/share`. After success, the detail page refetches to update the shared-with list.

**Tech Stack:** React 19, react-router 7, Vitest + React Testing Library, `@base-ui/react` Dialog, existing `StaffSelector` / `EntitySelector` components, `mutateApi` for CSRF-aware writes, `sonner` toast for errors.

---

## File Structure

| Action | Path                                             | Responsibility                                                  |
| ------ | ------------------------------------------------ | --------------------------------------------------------------- |
| Create | `web/components/groups/ShareGroupModal.tsx`      | Dialog with staff picker + permissions info + submit            |
| Create | `web/components/groups/ShareGroupModal.test.tsx` | Unit tests for modal rendering, submit, disabled states         |
| Modify | `web/api/client.ts:879`                          | Add `shareCustomGroup()` function                               |
| Modify | `web/containers/CustomGroupDetailView.tsx`       | Enable Share button → open modal, pass data, refetch on success |
| Modify | `web/containers/CustomGroupDetailView.test.tsx`  | Update test: Share button enabled, opens modal                  |

---

### Task 1: Add `shareCustomGroup` API client function

**Files:**

- Modify: `web/api/client.ts:879` (after `updateCustomGroup`)

- [ ] **Step 1: Add the `shareCustomGroup` function**

Insert after the `updateCustomGroup` function (line 879):

```typescript
export async function shareCustomGroup(id: number, staffIds: number[]): Promise<void> {
  await mutateApi<void>('PUT', `/groups/custom/${id}/share`, {
    selectedStaff: staffIds,
  });
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a && pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add web/api/client.ts
git commit -m "feat(api): PGTW-14 add \`shareCustomGroup\` client function"
```

---

### Task 2: Create `ShareGroupModal` component with tests

**Files:**

- Create: `web/components/groups/ShareGroupModal.tsx`
- Create: `web/components/groups/ShareGroupModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `web/components/groups/ShareGroupModal.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PGApiSchoolStaff } from '~/api/types';

import { ShareGroupModal } from './ShareGroupModal';

const schoolStaff: PGApiSchoolStaff[] = [
  { staffId: 1001, name: 'ALICE TAN', email: 'alice@school.edu.sg', className: 'P3 BEST' },
  { staffId: 1002, name: 'BOB LIM', email: 'bob@school.edu.sg', className: null },
  { staffId: 1003, name: 'CHARLIE NG', email: 'charlie@school.edu.sg', className: 'P1 KINDNESS' },
];

const excludeStaffIds = [1001];

function renderModal(onShare = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  render(
    <ShareGroupModal
      open={true}
      onClose={onClose}
      staff={schoolStaff}
      excludeStaffIds={excludeStaffIds}
      onShare={onShare}
    />,
  );
  return { onShare, onClose };
}

describe('ShareGroupModal', () => {
  it('renders the dialog title "Share group"', () => {
    renderModal();
    expect(screen.getByText('Share group')).toBeInTheDocument();
  });

  it('renders the permissions bullet list', () => {
    renderModal();
    expect(screen.getByText(/view and send to the group/i)).toBeInTheDocument();
    expect(screen.getByText(/edit the group name/i)).toBeInTheDocument();
    expect(screen.getByText(/add or delete students/i)).toBeInTheDocument();
    expect(screen.getByText(/share the group with other staff/i)).toBeInTheDocument();
  });

  it('renders the "Share group" button disabled when no staff selected', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /share group/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a && pnpm vitest run web/components/groups/ShareGroupModal.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the `ShareGroupModal` component**

Create `web/components/groups/ShareGroupModal.tsx`:

```tsx
import React, { useMemo, useState } from 'react';

import type { PGApiSchoolStaff } from '~/api/types';
import { StaffSelector } from '~/components/comms/staff-selector';
import type { SelectedStaff } from '~/components/comms/staff-selector';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui';
import { notify } from '~/lib/notify';

interface ShareGroupModalProps {
  open: boolean;
  onClose: () => void;
  staff: PGApiSchoolStaff[];
  excludeStaffIds: number[];
  onShare: (staffIds: number[]) => Promise<void>;
}

export const ShareGroupModal: React.FC<ShareGroupModalProps> = ({
  open,
  onClose,
  staff,
  excludeStaffIds,
  onShare,
}) => {
  const [selected, setSelected] = useState<SelectedStaff[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const excludeSet = useMemo(() => new Set(excludeStaffIds), [excludeStaffIds]);
  const filteredStaff = useMemo(
    () => staff.filter((s) => !excludeSet.has(s.staffId)),
    [staff, excludeSet],
  );

  async function handleShare() {
    if (selected.length === 0) return;
    setSubmitting(true);
    try {
      const staffIds = selected.map((s) => Number(s.id));
      await onShare(staffIds);
      onClose();
    } catch {
      notify.error('Could not share the group. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share group</DialogTitle>
          <DialogDescription>
            By sharing this group, other staff members will have access to:
          </DialogDescription>
        </DialogHeader>

        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>View and send to the group</li>
          <li>Edit the group name</li>
          <li>Add or delete students</li>
          <li>Share the group with other staff</li>
        </ul>

        <div>
          <StaffSelector value={selected} onChange={setSelected} staff={filteredStaff} />
        </div>

        <DialogFooter>
          <Button disabled={selected.length === 0 || submitting} onClick={handleShare}>
            {submitting ? 'Sharing…' : 'Share group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a && pnpm vitest run web/components/groups/ShareGroupModal.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add web/components/groups/ShareGroupModal.tsx web/components/groups/ShareGroupModal.test.tsx
git commit -m "feat(groups): PGTW-14 \`ShareGroupModal\` with staff picker + permissions list"
```

---

### Task 3: Wire Share button on the detail page

**Files:**

- Modify: `web/containers/CustomGroupDetailView.tsx`
- Modify: `web/containers/CustomGroupDetailView.test.tsx`

- [ ] **Step 1: Update the existing test — Share button should be enabled**

In `web/containers/CustomGroupDetailView.test.tsx`, update the `'Details tab shows creator metadata + the three action cards'` test. Change the Share button assertion from `toBeDisabled()` to `toBeEnabled()`:

```tsx
it('Details tab shows creator metadata + the three action cards', async () => {
  const { fireEvent } = await import('@testing-library/react');
  renderAt();
  const detailsTab = await screen.findByRole('tab', { name: /details/i });
  fireEvent.click(detailsTab);
  expect(await screen.findByText(/created on/i)).toBeInTheDocument();
  expect(screen.getByText(/TAN GUANG SHIN/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /edit group/i })).toHaveAttribute(
    'href',
    '/groups/customGroups/5/edit',
  );
  expect(screen.getByRole('button', { name: /share group/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /delete forever/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a && pnpm vitest run web/containers/CustomGroupDetailView.test.tsx`
Expected: FAIL — button is disabled

- [ ] **Step 3: Wire the detail page to open ShareGroupModal**

Replace the full contents of `web/containers/CustomGroupDetailView.tsx`:

```tsx
import React, { useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router';

import { fetchCustomGroupDetail, fetchSchoolStaff, shareCustomGroup } from '~/api/client';
import type { PGApiCustomGroupDetail, PGApiSchoolStaff } from '~/api/types';
import { ShareGroupModal } from '~/components/groups/ShareGroupModal';
import { StudentsByClassList } from '~/components/groups/StudentsByClassList';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui';
import { formatDate } from '~/helpers/dateTime';

interface LoaderData {
  detail: PGApiCustomGroupDetail;
  staff: PGApiSchoolStaff[];
}

export async function loader({ params }: { params: { id?: string } }): Promise<LoaderData> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw new Response('Invalid group id', { status: 400 });
  const [detail, staff] = await Promise.all([fetchCustomGroupDetail(id), fetchSchoolStaff()]);
  return { detail, staff };
}

const CustomGroupDetailView: React.FC = () => {
  const { detail: data, staff } = useLoaderData() as LoaderData;
  const revalidator = useRevalidator();
  const [shareOpen, setShareOpen] = useState(false);

  const excludeStaffIds = [data.createdBy, ...data.sharedWith.map((s) => s.staffId)];

  async function handleShare(staffIds: number[]) {
    await shareCustomGroup(data.customGroupId, staffIds);
    revalidator.revalidate();
  }

  return (
    <div className="flex justify-center px-6 py-6">
      <div className="w-full max-w-4xl">
        <header>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Custom Group</p>
          <h1 className="mt-1 text-2xl font-semibold">{data.name}</h1>
        </header>

        <Tabs defaultValue="students" className="mt-6">
          <TabsList>
            <TabsTrigger value="students">Students ({data.students.length})</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="students" className="mt-4">
            <StudentsByClassList students={data.students} />
          </TabsContent>
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
                <Button variant="outline" className="mt-3" onClick={() => setShareOpen(true)}>
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
        </Tabs>

        <ShareGroupModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          staff={staff}
          excludeStaffIds={excludeStaffIds}
          onShare={handleShare}
        />
      </div>
    </div>
  );
};

export { CustomGroupDetailView as Component };
```

Key changes from the previous version:

- Loader now returns `{ detail, staff }` (parallel-fetches `fetchCustomGroupDetail` + `fetchSchoolStaff`)
- `useState` for `shareOpen` dialog state
- `useRevalidator` to refetch after share success
- Share button is no longer `disabled` — it calls `setShareOpen(true)`
- `ShareGroupModal` rendered with `excludeStaffIds` (creator + already-shared)
- `handleShare` calls `shareCustomGroup` then triggers revalidation

- [ ] **Step 4: Update the test to account for the new loader shape**

Replace the full contents of `web/containers/CustomGroupDetailView.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { PGApiCustomGroupDetail, PGApiSchoolStaff } from '~/api/types';

import { Component as CustomGroupDetailView } from './CustomGroupDetailView';

vi.mock('~/api/client', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    shareCustomGroup: vi.fn().mockResolvedValue(undefined),
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

const staff: PGApiSchoolStaff[] = [
  { staffId: 1013, name: 'TAN GUANG SHIN', email: 'gs@school.edu.sg', className: null },
  { staffId: 1014, name: 'ALICE TAN', email: 'alice@school.edu.sg', className: 'P3 BEST' },
];

function renderAt(loaderDetail: PGApiCustomGroupDetail = detail) {
  const router = createMemoryRouter(
    [
      {
        path: '/groups/customGroups/:id',
        Component: CustomGroupDetailView,
        loader: () => ({ detail: loaderDetail, staff }),
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

  it('renders the student list on the Students tab by default', async () => {
    renderAt();
    expect(await screen.findByText('TAN XIAO MING')).toBeInTheDocument();
  });

  it('Details tab shows creator metadata + action cards with Share enabled', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderAt();
    const detailsTab = await screen.findByRole('tab', { name: /details/i });
    fireEvent.click(detailsTab);
    expect(await screen.findByText(/created on/i)).toBeInTheDocument();
    expect(screen.getByText(/TAN GUANG SHIN/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit group/i })).toHaveAttribute(
      'href',
      '/groups/customGroups/5/edit',
    );
    expect(screen.getByRole('button', { name: /share group/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /delete forever/i })).toBeDisabled();
  });

  it('renders shared-with names when group is shared', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const shared: PGApiCustomGroupDetail = {
      ...detail,
      isShared: true,
      sharedWith: [{ staffId: 1014, staffName: 'ALICE TAN' }],
    };
    renderAt(shared);
    const detailsTab = await screen.findByRole('tab', { name: /details/i });
    fireEvent.click(detailsTab);
    expect(await screen.findByText(/group shared with/i)).toBeInTheDocument();
    expect(screen.getByText(/ALICE TAN/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a && pnpm vitest run web/containers/CustomGroupDetailView.test.tsx`
Expected: 6 tests PASS

- [ ] **Step 6: Commit**

```bash
git add web/containers/CustomGroupDetailView.tsx web/containers/CustomGroupDetailView.test.tsx
git commit -m "feat(groups): PGTW-14 wire Share button on detail page to \`ShareGroupModal\`"
```

---

### Task 4: Run full test suite + manual smoke test

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd /Users/shin/Desktop/projects/tw-pg-experiment/.worktrees/pgtw-13a && pnpm vitest run`
Expected: All groups-related test files pass. Pre-existing `CreatePostView.validation.test.tsx` failures (2 tests) are unrelated to this branch.

- [ ] **Step 2: Manual smoke test in mock mode**

1. Navigate to `/groups` → click a custom group → detail page loads
2. Click the "Details" tab → "Share Group" button should be **enabled**
3. Click "Share Group" → modal opens with staff picker + permissions bullet list
4. Select a staff member → "Share group" button becomes **enabled**
5. Click "Share group" → modal closes, page re-renders (mock returns `{}`, shared-with list won't visually update because the mock fixture is static)

- [ ] **Step 3: Manual smoke test in proxy mode (real PGW)**

1. Same steps as above, but with `TW_PG_MOCK=false`
2. After sharing, the detail page should refetch and the "Group shared with:" line should show the newly shared staff member's name
3. Open the PGW web UI and verify the group shows the shared staff member

---

## Self-Review Checklist

**Spec coverage:**

- ✅ `shareCustomGroup` API function — Task 1
- ✅ `ShareGroupModal` with staff picker + permissions list — Task 2
- ✅ Enable Share button on detail page — Task 3
- ✅ Exclude creator + already-shared staff from picker — Task 2 (`excludeStaffIds` prop, filtered in component)
- ✅ Refetch detail after share — Task 3 (`useRevalidator`)
- ✅ Error toast on failure — Task 2 (`notify.error`)
- ✅ Button disabled states (empty selection, submitting) — Task 2
- ✅ Tests — Tasks 2 + 3

**Placeholder scan:** None found.

**Type consistency:**

- `shareCustomGroup(id: number, staffIds: number[])` — same signature in Task 1 (client) and Task 3 (detail page call)
- `ShareGroupModalProps.onShare: (staffIds: number[]) => Promise<void>` — matches Task 2 component and Task 3 `handleShare`
- `ShareGroupModalProps.excludeStaffIds: number[]` — consumed in Task 2, constructed in Task 3 from `[data.createdBy, ...data.sharedWith.map(s => s.staffId)]`
- `LoaderData.staff: PGApiSchoolStaff[]` — matches `fetchSchoolStaff()` return type (`PGApiSchoolStaffList` = `PGApiSchoolStaff[]`)
