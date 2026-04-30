# PGTW-13/14/15/20 Parity Scoping — Custom Groups

## Context

Gap-analysis / scoping doc for the **custom-groups** subsystem of PGTW-13..25 (see [pgtw-13-25-decomposition.md](pgtw-13-25-decomposition.md) for the cross-subsystem index). Same shape as [pgtw-1-12-parity-scope.md](pgtw-1-12-parity-scope.md): for each Jira ticket, what PGW does today, what `tw-pg-experiment` does on `feat/posts-frontend`, and what's still missing to reach parity.

**IA decision (Phase 1):** custom groups live at the **platform level** at `/groups`, as a peer of `/posts`, mirroring PGW's own IA. They are a shared primitive — already consumed read-only by the posts recipient picker, likely consumed by Meetings/Reports later — so the canonical CRUD UI is **not** nested inside any one consuming app. Consuming apps deep-link in or open `/groups/customGroups/new` in a modal.

**Sources:** [docs/references/pg-api-contract.md §8-9 (lines 880-1000)](../references/pg-api-contract.md), [docs/references/pg-specs.md §7 (lines 1207-1392)](../references/pg-specs.md), [docs/references/pg-bff-design.md](../references/pg-bff-design.md), and direct inspection of `web/`, `server/internal/pg/mock.go`, and the existing fixtures `groups_custom.json` / `group_custom_detail.json`.

**Hard constraint — "PGW backend is untouchable":** every gap is resolved on our side. Endpoints, error codes, enums, field shapes are fixed. If a parity item would require a PGW change, it's out of scope for Phase 1.

**Current high-level state.**

- BFF mock has **all** custom-group endpoints stubbed in [server/internal/pg/mock.go:266-279](../../server/internal/pg/mock.go#L266-L279): list, detail, create, update, delete, share, removeAccess — plus `validateStudents` / `validateStudents/results` (the Excel-upload two-step flow) and `student/count`.
- FE consumes only the **list-summary** endpoint via `loadCustomGroups()` in [web/api/client.ts:767](../../web/api/client.ts#L767), feeding the `Custom Groups` tab in [student-recipient-selector.tsx:99-106](../../web/components/comms/student-recipient-selector.tsx#L99-L106).
- Types defined: `PGApiCustomGroupSummary` and `PGApiCustomGroupsList` in [web/api/types.ts:408-420](../../web/api/types.ts#L408-L420). No detail / share / staff-list types yet.
- **No FE module:** no `/groups` route in [web/App.tsx](../../web/App.tsx), no sidebar entry in [web/components/Sidebar/](../../web/components/Sidebar/), no create/edit/detail components.

---

## PGTW-13 — Manual selection of students and file upload

**PGW behavior.** Two paths from [pg-specs.md §7.7 (Create)](../references/pg-specs.md) and [§7.4 (Add Students)](../references/pg-specs.md):

- **Manual** — `+ Add Students` → "Add manually" → search/filter page (`/groups/customGroups/:id/edit/addStudents`) with Level / Form Class / CCA filters + paginated checkbox table. "Add N selected" returns to the edit page.
- **Excel upload** — `+ Add Students` → "Upload via Excel" → file picker. **Disabled once group has students** ("Cannot be selected when the list has students"). Two-step protocol confirmed by BFF mock at [mock.go:273-274](../../server/internal/pg/mock.go#L273-L274): `POST /groups/custom/validateStudents` (upload + validate) → `POST /groups/custom/validateStudents/results` (confirm + create).

Submit goes to `POST /api/web/2/staff/groups/custom` with `{ name, studentIds }` ([pg-api-contract.md:948-962](../references/pg-api-contract.md#L948-L962)). Title is required, max 120 chars; ≥1 student required.

**Current state.** **No FE create flow.** Endpoints are mock-stubbed but unused. The recipient-selector consumes the list but cannot create. No Excel parser, no add-students subpage.

**Gap.**

- **Whole module missing:** `/groups` overview, `/groups/customGroups/new` create page, `/groups/customGroups/:id/edit/addStudents` subpage, "+ Add Students" dropdown.
- **Excel upload pipeline missing:** UI (drag-drop or file input), client wiring to `validateStudents` → results, validation-error rendering (per PGW: "Cannot be selected when the list has students", malformed file, unknown students).
- **Excel format / sheet schema unconfirmed.** PGW says "Excel" — `.xlsx` only? Headers required? One column or multiple? Flag as open question.
- **Cross-app shortcut:** posts recipient picker has no "+ Create new group" affordance. A future follow-up — out of this audit's ticket scope but listed under cross-cutting.

**Files to create/touch:** new `web/containers/GroupsView.tsx`, `web/containers/CreateCustomGroupView.tsx`, `web/containers/EditCustomGroupView.tsx`, `web/containers/AddStudentsView.tsx`, new `web/components/groups/*` for the file picker + table; routes in [web/App.tsx](../../web/App.tsx); nav entry in [web/components/Sidebar/SidebarContent.tsx](../../web/components/Sidebar/SidebarContent.tsx); types in [web/api/types.ts](../../web/api/types.ts) (detail shape, validateStudents request/response); client functions in [web/api/client.ts](../../web/api/client.ts).

---

## PGTW-14 — Share custom group with staff

**PGW behavior.** Share modal launched from the detail page's "Share Group" action ([pg-specs.md §7.5](../references/pg-specs.md)). Search/autocomplete staff picker; bullet list of what the recipients gain ("View and send to the group", "Edit the group name", "Add or delete students", "Share the group with other staff"); "Share group" CTA disabled until ≥1 staff selected. Endpoints: `PUT /api/web/2/staff/groups/custom/:id/share` with `{ staffIds: number[] }` and `PUT /:id/removeAccess` for removal ([pg-api-contract.md:986-1000](../references/pg-api-contract.md#L986-L1000)). PGW shows the shared-with list on the detail page's Details tab ([pg-specs.md §7.2](../references/pg-specs.md)).

**Current state.** **None.** Endpoints stubbed in BFF mock but no FE. The existing `staff-selector` component used by posts ([web/components/comms/staff-selector.tsx](../../web/components/comms/staff-selector.tsx)) is reusable for the modal's picker.

**Gap.**

- Share modal component (reuse `staff-selector` for the picker; render PGW's bullet list).
- Detail-page integration: "Share Group" action card opens the modal; "Group shared with: [names]" rendered from detail payload.
- Remove-access UX: PGW spec doesn't show the remove-staff UI explicitly — likely an "×" on each name in the shared-with list. Confirm with screenshots / PG team.
- "Shared with you" tab on the overview list: when `isShared: true` and `createdBy` ≠ current staff, the group should show on the shared tab rather than (or in addition to) the owner tab. PGW [§7.1](../references/pg-specs.md) doesn't explicitly describe shared-tab UX on the overview — confirm.

**Files:** new `web/components/groups/ShareGroupModal.tsx`, `web/containers/CustomGroupDetailView.tsx`; reuse [staff-selector.tsx](../../web/components/comms/staff-selector.tsx); client functions for share/removeAccess.

---

## PGTW-15 — School Cockpit (SC) custom group

**Open question — flagged.** "SC" = School Cockpit (PG admin context). Unclear from current references whether this is:

- (a) **A role-gated affordance on the same `/groups` module** — admins see additional powers (create on behalf of any teacher, view school-wide groups, override sharing). Single module, two views via role check.
- (b) **A separate admin surface** — e.g. `/admin/groups` with a different list shape (school-wide), distinct endpoints. PGW's `/groups/custom?type=summary` returns the staff's own + shared; an admin endpoint may exist that returns all groups school-wide.
- (c) **A different create flow only** — admin's create page lets them pick the owning teacher; everything else identical.

**Action:** design the staff path (PGTW-13/14/20) fully now under a single `/groups` module; **revisit PGTW-15 once PG team confirms.** Specific asks for PG team:

1. Does PGW expose an admin-scoped endpoint (e.g. `/api/web/2/admin/groups/custom` or a query param on the existing endpoint)?
2. Is the admin's create page a different route, or the same `/groups/customGroups/new` with role-gated extra fields (e.g. owning teacher picker)?
3. What does "School Cockpit" mean in tw-pg-experiment's IA — a separate top-level area, or the same `/groups` module with role checks?

**Files:** TBD pending answers. Likely: a role check on existing module + extra fields on create page.

---

## PGTW-20 — Delete custom group (single and multi-select)

**PGW behavior — single delete.** Per-row kebab on overview ([§7.1](../references/pg-specs.md): "Kebab: View, Edit, Delete") **and** "Delete this custom group" action card on the detail page ([§7.2](../references/pg-specs.md)) → Delete modal ([§7.6](../references/pg-specs.md)) with required acknowledgement checkbox ("I understand that this action cannot be undone…"); CTA disabled until checkbox ticked; no Cancel button (only X). Endpoint: `DELETE /api/web/2/staff/groups/custom/:id` ([pg-api-contract.md:980](../references/pg-api-contract.md#L980)).

**PGW behavior — multi-select.** **Not documented in our spec.** [§7.1](../references/pg-specs.md) only describes the per-row kebab. Either PGW added it post-spec or this is a TW-specific addition baked into the ticket title.

**Current state.** **No delete UI** anywhere. Endpoint stubbed in mock.

**Gap.**

- Single-delete modal with PGW's required-checkbox UX (mirror [§7.6](../references/pg-specs.md) verbatim).
- Kebab on overview row + action card on detail page, both routing to the same modal.
- **Multi-select delete is undocumented in PGW.** Two options:
  - (a) **Treat as TW-only divergence**: add row checkboxes + a "Delete N selected" toolbar on the overview, with a batched delete dispatched as N parallel `DELETE` calls. Document as TW-only divergence; partial-failure UX (e.g. 3 of 5 deleted) needs a toast that names which failed.
  - (b) **Defer pending PG-team confirmation**: ship single-delete in Phase 1; ask PG team if PGW has multi-select that's missing from the spec, and if so what endpoint shape. If yes, port; if no, reconsider whether multi-select is worth the divergence cost.
  - **Recommend (b)** — minimum risk; multi-select is a marginal-utility feature that doesn't justify divergence until we've confirmed PGW's stance.
- **Cascade behavior unknown.** What happens if a group is deleted while referenced by a draft / scheduled / posted announcement? PGW likely either (i) leaves the post intact with a "ghost group" reference, (ii) cascades and removes recipients, or (iii) refuses delete. Not in our docs. Open question.

**Files:** new `web/components/groups/DeleteGroupModal.tsx`, kebab + toolbar in `GroupsView.tsx`, action card in `CustomGroupDetailView.tsx`.

---

## Cross-cutting gaps (not tied to one ticket)

1. **Sidebar nav entry.** Posts is the only top-level nav today. Adding `/groups` requires a new `SidebarItem` in [SidebarContent.tsx](../../web/components/Sidebar/SidebarContent.tsx) — straightforward, but worth surfacing in the design.
2. **Routing.** Add `/groups`, `/groups/customGroups/new`, `/groups/customGroups/:id`, `/groups/customGroups/:id/edit`, `/groups/customGroups/:id/edit/addStudents` to [App.tsx](../../web/App.tsx). Mirror PGW's URLs exactly (URLs are part of parity).
3. **Detail-payload shape.** [pg-api-contract.md:905-930](../references/pg-api-contract.md#L905-L930) lists `{ customGroupId, name, createdBy, createdByName, isShared, sharedWith[], students[{studentId, studentName, className, indexNumber, ccas[]}], createdAt }` — `sharedWith[]` shape isn't fully documented (staff IDs? names? both?). Need to confirm and add to types.
4. **Excel-upload pipeline.** Two-step protocol (`validateStudents` → `validateStudents/results`) needs full audit before implementation: file size limit, row limit, column schema, error response shape, what `valid: false` payload looks like. **Not in our current docs.** Open question for PG team.
5. **Consuming-app shortcut from Posts recipient picker.** "+ Create new group" affordance on the Custom Groups tab → opens `/groups/customGroups/new` in a modal/new tab, then refreshes the recipient list. **Not in any of the four tickets covered here — called out as a future follow-up so it's not lost.**
6. **Role gating for SC (PGTW-15).** Once SC scope is clarified, the `/groups` module may need a role-aware variant. Pre-build with a clear seam (e.g. `useStaffRole()` hook) so adding admin affordances is additive.
7. **Onboarded-status column.** Detail page's Students tab shows an "Onboarded & Can Respond" ✓/✗ column ([§7.2](../references/pg-specs.md)). Detail-payload student shape from [pg-api-contract.md:919-927](../references/pg-api-contract.md#L919-L927) doesn't include this field. Either it's derived from another endpoint, or it's missing from the contract doc. Audit gap — flag.
8. **Empty / error states.** Overview empty (no groups created), detail empty (no students), Excel upload error states — none designed yet.
9. **PGW feature-flag plumbing.** Custom groups don't appear to be feature-flagged in PGW's known flag set, but worth confirming alongside the existing schedule/duplicate flag work.

---

## Suggested ordering

Smallest unit that ships visible parity, then layer complexity:

1. **PGTW-13a — Overview page + create-empty.** `/groups` overview reading from existing `/groups/custom?type=summary`; `+ Create custom group` button → `/groups/customGroups/new` with title input + empty students state + Save (disabled). Plus sidebar nav entry. **Lights up the route**, ~1 day.
2. **PGTW-13b — Manual add-students subpage.** `/groups/customGroups/:id/edit/addStudents` with Level / Form Class / CCA filters + paginated checkbox table. Wire to existing students/classes endpoints. **The bulk of PGTW-13.**
3. **PGTW-13c — Detail page + edit page.** Read detail; Students tab (grouped by class); Details tab with action cards; Edit page with title + add-students entrypoint.
4. **PGTW-14 — Share modal + Details tab "shared with" list.** Reuse `staff-selector`. Wire to share/removeAccess endpoints.
5. **PGTW-20a — Single-delete modal.** Kebab + action card → modal with required checkbox.
6. **PGTW-13d — Excel upload.** Two-step `validateStudents` pipeline; only after PG team confirms format and error schema (open question).
7. **PGTW-20b — Multi-select delete.** Only if PG team confirms PGW supports it; otherwise drop for Phase 1.
8. **PGTW-15 — SC custom group.** Pending PG-team clarification on what SC means.

Items 1-5 are straight ports; 6 is blocked on PG-team input; 7 is conditional; 8 is fully blocked.

---

## Open questions (need PG team / Grace input)

All framed under the "PGW untouchable" constraint — they ask what PGW _already exposes_, not what PGW could add.

1. **PGTW-15:** what is "SC custom group" on PGW? Separate admin endpoint, role-gated affordance, or different create flow? (See PGTW-15 section above.)
2. **PGTW-20 multi-select:** does PGW's `/groups` overview support multi-select delete? If yes, what's the endpoint shape (one bulk delete, or N parallel)?
3. **PGTW-13 Excel format:** `.xlsx` only or `.xls` / `.csv` accepted? Header row required? Single column (UIN/FIN) or multi-column? Max rows? Max file size?
4. **PGTW-13 validateStudents protocol:** what does the request payload look like (multipart? raw bytes?), and what does `valid: false` look like (per-row errors? aggregate error code?)? Can we get a sample request/response from a PGW dev environment?
5. **Cascade on delete:** if a custom group is referenced by a draft / scheduled / posted announcement, what does PGW do on delete — refuse, cascade, or orphan? Is the recipient resolved by ID at send-time, or snapshotted at post-creation?
6. **Onboarded-status field:** the detail page shows ✓/✗ "Onboarded & Can Respond" per student — which endpoint sources that flag? It isn't in the documented detail payload.
7. **Detail-payload `sharedWith[]` shape:** array of staff IDs, names, or `{ staffId, staffName }` objects?
8. **Removing the only owner / sharing with self:** PGW likely guards both. Confirm.
9. **Shared-with-you tab on `/groups` overview:** does PGW have a "Created by you" / "Shared with you" tab axis on this module like it does on `/announcements`? Spec [§7.1](../references/pg-specs.md) doesn't show it.

---

## Error handling & edge cases

### Excel upload (PGTW-13)

- **File too large** — 413 likely; need explicit size limit + clear error copy. PGW limit unknown.
- **Wrong file type** (not Excel) — client-side mime check + server-side rejection.
- **Malformed Excel** — corrupt file, encrypted, password-protected.
- **Wrong schema** — wrong column headers, missing UIN column, blank file.
- **Unknown student IDs** — PGW likely returns per-row errors; need per-row UI (not just a generic toast).
- **Mixed valid + invalid rows** — does PGW accept the valid subset and return the rest as errors, or reject the whole file? Affects UX (can teacher fix-and-resume vs upload a corrected file).
- **Duplicates within file** — silently dedupe vs error.
- **Excel formulas / merged cells / multiple sheets** — which sheet? probably first; document.
- **Browser-side parse vs server-side** — given the BFF stub already names `validateStudents`, server-side parse is implied. Client just uploads.
- **Excel disabled when group has students** ([§7.3](../references/pg-specs.md)) — enforce this UI rule client-side, plus tooltip "Cannot be selected when the list has students".

### Sharing (PGTW-14)

- **Sharing with self** — PGW likely 400s. Suppress self from picker.
- **Sharing with already-shared staff** — idempotent on PGW? confirm.
- **Removing the only owner** — PGW likely refuses (would orphan the group). Need explicit error UI.
- **Sharing a group that no longer exists** (deleted in another tab) — 404 → toast "This group has been deleted" + navigate back to overview.
- **Race: share + delete from two tabs** — last write wins; need stale-data banner if `updatedAt` advances on a save.

### Delete (PGTW-20)

- **Cascade** (see open question 5) — UX depends on PGW behavior.
- **Required-checkbox modal** ([§7.6](../references/pg-specs.md)) — ensure the checkbox state resets when modal reopens.
- **Multi-select partial failure** (if implemented) — toast must name which IDs failed; rest succeed.
- **Rapid-fire delete** (double-click the modal CTA) — disable button during in-flight call.

### Add-students subpage (PGTW-13b)

- **Empty filters** (no level / class) — show all students paginated; large schools may have thousands. Need virtualisation or aggressive pagination.
- **Already-added** badge: PGW shows "N students already added" — must dedupe client-side; if a student is already in the group, the row is non-checkable.
- **Search across thousands of students** — debounce + server-side search if needed; current client-side search in [student-recipient-selector.tsx](../../web/components/comms/student-recipient-selector.tsx) caps at 20 — may need server-side.
- **Pagination + selection state** — selected rows must persist across pages; common bug.

### Cross-cutting

- **Stale-tab edits** — open the same group in two tabs, edit independently — last write wins. At minimum, show a "this group was edited elsewhere" banner if `updatedAt` advances.
- **Network drop mid-Excel-upload** — retry behavior; client must surface "upload failed, try again" clearly.
- **`-4031` redirect, CSRF token, session expiry** — already handled at the [client.ts](../../web/api/client.ts) layer; new endpoints inherit the existing routing automatically.
- **Permissions guards** — every detail/edit/share/delete check must mirror PGW's check (which we don't fully know — open question 8).

---

## Verification — "how do we know parity is reached"

Per ticket, parity is demonstrated by:

- **UI walkthrough** against PGW [§7.1-§7.7](../references/pg-specs.md): every page, every modal, every dropdown.
- **API payload diff** between BFF call and the PGW contract [§8-9](../references/pg-api-contract.md): every required field present, every enum value matches.
- **Error handling** for every documented PGW error code per endpoint (TBC after open question 4 resolves Excel response shape).
- **End-to-end against the local PGW** (per [PGW-tests-first memory](../../../.claude/projects/-Users-shin-Desktop-projects-tw-pg-experiment/memory/feedback-verify-before-done.md)): create → edit → share → delete a group through the UI, hitting real PGW endpoints in `TW_PG_MOCK=false` mode.

For PGTW-13 specifically: Excel upload requires a real PGW environment to verify the two-step protocol — the mock stubs return only `{valid: true}` and don't model errors.

---

## Out of scope for this audit

- **"+ Create new group" shortcut from the posts recipient picker** — useful follow-up; not in any of the four tickets covered here. Open as a separate ticket if pursued.
- **Reports / Meetings / Login / Calendar** — separate audits per [pgtw-13-25-decomposition.md](pgtw-13-25-decomposition.md).
- **Backend-side Excel parser implementation** — that's a BFF concern; this audit only cares about FE wiring + UX.

Nothing in this doc requires code changes yet — the next step is to invoke `writing-plans` for PGTW-13a/b/c (the 1-3 unblocked items above) once the open questions are triaged.
