# PGTW-20a: Delete Custom Group — Design Spec

## Goal

Wire the "Delete Forever" button on the custom group detail page to a confirmation modal that deletes the group via PGW's existing endpoint, matching PGW spec §7.6.

## PGW Parity Reference

- **Spec:** §7.6 "Delete Custom Group Modal"
- **API:** `DELETE /api/web/2/staff/groups/custom/:customGroupId` — no request body, 204 No Content, requires CSRF
- **Mock:** already stubbed in `server/internal/pg/mock.go` (line 279)

## Modal UX (matching PGW §7.6)

- **Title:** "Delete custom group?"
- **Body:** `Are you sure you want to delete "[Group Name]"?`
- **Checkbox (required):** "I understand that this action cannot be undone. This will permanently delete the custom group as I am the only staff with access to the group."
- **Button:** "Delete" (disabled until checkbox ticked)
- **No Cancel button** — only the X close icon on the dialog, matching PGW
- **Submitting state:** button shows "Deleting…" and is disabled

## Behaviour

1. User clicks "Delete Forever" on the detail page's Details tab
2. Confirmation dialog opens
3. User ticks the acknowledgement checkbox
4. User clicks "Delete"
5. `DELETE /api/web/2/staff/groups/custom/:id` fires
6. **Success:** navigate to `/groups`, show success toast "Custom group deleted."
7. **Error:** show PGW's error message in a toast, dialog stays open, checkbox + button reset

## Files

| Action | Path                                                                   |
| ------ | ---------------------------------------------------------------------- |
| Create | `web/components/groups/DeleteGroupModal.tsx`                           |
| Modify | `web/containers/CustomGroupDetailView.tsx` — wire button state + modal |
| Modify | `web/api/client.ts` — add `deleteCustomGroup(id: number)`              |
| Create | `web/components/groups/DeleteGroupModal.test.tsx`                      |

## Out of Scope

- Kebab menu delete action on overview rows (broader PGTW-20 scope)
- Multi-select batch delete (deferred pending PG team confirmation)
- Cascade behaviour when group is referenced by posts (open question for PG team)
