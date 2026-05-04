# PGTW-14: Share Custom Group with Staff — Design Spec

## Goal

Add a share modal to the custom group detail page that lets the group owner share access with other staff members, matching PGW's existing behavior.

## Architecture

A `ShareGroupModal` dialog component reuses the existing `StaffSelector` (which wraps `EntitySelector`). The modal opens from the detail page's "Share Group" action card. On submit, it calls `shareCustomGroup()` which POSTs to the BFF. After success, the detail page refetches to update the shared-with list.

## Components

### ShareGroupModal

- **Trigger**: "Share Group" button on the detail page's Details tab (currently disabled — enable it)
- **Content**:
  - `StaffSelector` pre-loaded with `fetchSchoolStaff()` data, filtered to exclude:
    - The group creator (`data.createdBy`)
    - Already-shared staff (`data.sharedWith[].staffId`)
  - Permissions info (matching PGW verbatim):
    > By sharing this group, other staff members will have access to:
    >
    > - View and send to the group
    > - Edit the group name
    > - Add or delete students
    > - Share the group with other staff
  - "Share group" button — disabled when no staff selected or while submitting
  - "Sharing..." loading state during submission

### API

- `shareCustomGroup(id: number, staffIds: number[]): Promise<void>` — `PUT /groups/custom/:id/share` with body `{ selectedStaff: staffIds }` (real PGW field name, not contract-doc `staffIds`)
- Uses existing `mutateApi` for CSRF + timeout handling

### Detail Page Updates

- Enable "Share Group" button → opens `ShareGroupModal` via dialog state
- Pass `data.createdBy` + `data.sharedWith` to the modal for filtering
- After successful share: call `router.revalidate()` or `navigate(0)` to refetch loader data so shared-with list updates
- Shared-with display already renders from `data.sharedWith` — no changes needed

### What's NOT in scope

- `removeAccess` / "Leave group" — that's PGTW-20 (tied to delete flow; PGW shows it conditionally based on owner count)
- Conditional action card logic (delete vs leave) — PGTW-20
- Share from overview kebab menu — PGW doesn't have this; share is detail-page only

## Data Flow

```
[Detail Page] --click "Share Group"--> [ShareGroupModal opens]
  |                                        |
  |-- passes: groupId, createdBy,          |-- loads: fetchSchoolStaff()
  |   sharedWith (for filtering)           |-- user picks staff
  |                                        |-- click "Share group"
  |                                        |-- calls shareCustomGroup(id, staffIds)
  |                                        |-- on success: close modal + refetch detail
  |<-- detail loader re-runs, sharedWith updates
```

## Error Handling

- Network error on share → toast "Could not share the group. Please try again." (same pattern as edit page)
- Button disabled during in-flight request (prevent double-submit)
- Empty staff selection → button disabled

## Testing

- `ShareGroupModal.test.tsx` — renders permissions list, staff picker, submit calls API, button disabled states
- `CustomGroupDetailView.test.tsx` — Share button opens modal, shared-with list renders names
- Manual smoke test against real PGW in proxy mode

## Wire Format (real PGW)

```
PUT /api/web/2/staff/groups/custom/:customGroupId/share
Content-Type: application/json

{ "selectedStaff": [1014, 1015] }
```

Response: `200 OK` with empty body.
