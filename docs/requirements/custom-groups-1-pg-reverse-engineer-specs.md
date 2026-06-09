# Feature Specification: Custom Student Groups

**Feature Branch**: `004-custom-groups`
**Created**: 2026-06-09
**Status**: Reverse-Engineered
**Input**: Reverse-engineered from existing codebase (pgw-web)

---

## Overview

Custom Student Groups is a roster-management feature in Parents Gateway Web that lets school staff assemble ad-hoc groups of students that cut across class/level/CCA boundaries. Staff create a group by manually selecting students from the school roster or by bulk-uploading an Excel (`.xlsx`) file, then reuse the saved group as a recipient target when creating Posts/Consent Forms/Announcements. Groups support co-ownership-style sharing (any staff a group is shared with gets full edit/share/send rights), edit (rename, add/remove students), deletion by the last remaining owner, and self-removal by non-last owners. The feature has two roster variants: a mainstream-school (MS) variant keyed on student Name + Class, and an Institute-of-Higher-Learning (IHL) variant keyed on Student ID, with a hard cap of 5,000 students per group. File-upload validation runs as an asynchronous, token-and-polling job on the BFF and returns a valid/invalid breakdown with per-row error reasons.

---

## User Scenarios & Testing

### US-1: Create a Custom Group by Manual Student Selection (Staff)

**As a** school staff member,
**I want to** create a custom group by hand-picking students from my school roster,
**So that** I can target a bespoke set of students in future posts.

**Acceptance Criteria:**

- Staff navigates to `/groups` and clicks "Create New" (links to `/groups/customGroups/new`), firing analytics `NewCustomGroupButtonPressed`.
- The Create page (`CustomGroupPage`, `pageType === 'create'`) shows title "Create new group", a mandatory `Title` field (max 120 chars, placeholder "What would you like to call your group?"), and a Students section.
- Clicking "Add Students" opens a dropdown (`AddStudentDropdownComponent`) with two options: "Add manually" and "Upload via Excel".
- "Add manually" opens the "Add students" overlay (`AddStudentsComponent`) populated from `StudentService.getStudents()` → `GET /api/web/v2/staff/school/students`.
- Selected students render in `StudentTable`, sorted by class description then index. Each row has a delete action; deleting with `studentId === null` opens a "Delete all?" modal ("All **N** student(s) will be removed.").
- The "Create Now" button is enabled only when `groupName.trim().length > 0 && selectedStudentIds.length > 0` (and, for IHL, `selectedStudentIds.length <= 5000`). Label flips to "Creating..." while posting.
- On submit (analytics `CustomGroupCreateButtonPressed`), the FE dedupes IDs (`_.uniq`) and calls `actions.createGroup` → `POST /api/web/v2/staff/groups/custom` with `{ groupName, selectedSchoolStudents }`.
- On success: analytics `CustomGroupCreated`, success notification `create_group_success`, redirect to `/groups`.
- Duplicate-name error (`error.errorReason === 'customGroup name duplicated'`) renders inline: "The title you entered already exists. Please use a different title." (Server enforces uniqueness only for IHL — see FR-7.)
- A `Prompt` / `beforeunload` guard ("You are about to leave this page. Any unsaved changes will be lost.") fires if the form is edited and not yet posted.

### US-2: Create a Custom Group by Excel File Upload (Staff)

**As a** school staff member,
**I want to** bulk-add students by uploading an Excel file,
**So that** I can build large groups without selecting students one by one.

**Acceptance Criteria:**

- From the "Add Students" dropdown, staff clicks "Upload via Excel" (analytics `CustomGroupUploadViaExcelPressed`; on create, starts WOGAA transaction `CREATE_CUSTOM_GROUP_FILE_UPLOAD`). This opens the upload overlay (`UploadStudentsComponent`).
- "Upload via Excel" is **disabled when the list already has students**; conversely the manual "Add Students" button is disabled once a file-upload result is displayed. The two paths are mutually exclusive.
- **Accepted file type**: `.xlsx` only (`CUSTOM_GROUP_ACCEPTED_MIME_TYPES`). Wrong type toast: "Only .xlsx file type is allowed." (CSV is **not** accepted.)
- **Max file size**: 5 MB (`MAX_UPLOAD_FILE_SIZE`). Oversize toast: "You may only add files up to 5 MB." **Max files**: 1.
- **Max students**: `CUSTOM_GROUP_MAX_STUDENTS_COUNT = 5000`.
- **Expected columns**:
  - **MS** (`isIhl === false`): two columns `Name` and `Class`. Copy: "Upload an Excel file (.xlsx) with two columns: 'Name' and 'Class'. The columns can be in any order and any position, as long as they are named correctly." Header matching is case-insensitive and whitespace-trimmed.
  - **IHL** (`isIhl === true`): one column `Student ID` (`CUSTOM_GROUP_FILE_UPLOAD_COLUMN_HEADER`).
- First worksheet parsed client-side (`XLSX.read`); user-facing row numbers are `index + 2` (header is row 1).
- **Client-side validation order & exact messages** (`ValidationMessages`):
  - Blank file → "The file is empty. Please check it and re-upload."
  - IHL missing/duplicate header → "The column header must be \"Student ID\". Please amend and re-upload." / "We found duplicate columns with the header \"Student ID\". Please amend and re-upload."
  - IHL over cap → "You may only upload up to 5000 Student IDs. Please amend and re-upload."
  - IHL duplicate IDs → "We found N duplicate Student ID(s). Please amend and re-upload."
  - MS duplicate headers → "The column 'Name' and/or 'Class' appears more than once. Please remove the duplicate(s) and re-upload."
  - MS missing headers → "The columns 'Name' and/or 'Class' are missing. Please add them and re-upload."
  - MS missing values → "Your file is missing 'Name' or 'Class' entries in row(s): {rows}{ and N more}. Please update these rows and re-upload." (first 5 rows listed)
  - MS over cap → "You may only upload up to 5000 students. Please reduce the number and re-upload."
  - MS duplicate Name+Class → "We found duplicate entries with the same 'Name' and 'Class': • {name in rows …}{ and N more}. Please remove the duplicates and re-upload." (case-insensitive; first 5)
  - Generic parse failure → "There was an error processing your file. Please check the format and try again." Server failure → "Sorry, an unexpected error occurred on our side. Please try again later."
- On passing client validation, rows go to the BFF for **server-side roster matching**:
  - `POST /api/web/v2/staff/groups/custom/validateStudents` with `[{ studentId }]` (IHL) or `[{ name, className }]` (MS). **Asynchronous**: BFF stores a `pending` result in Redis (10-min TTL) and returns a signed `token`.
  - FE polls `POST /api/web/v2/staff/groups/custom/validateStudents/results` with `{ token }` every 3 s, up to 100 attempts, until `status === 'success'` (throws on `error`).
- The result (`{ validStudents, invalidStudents }`) renders in collapsible accordions "Valid students (N)" / "Invalid students (N)" with per-row reasons. Header shows filename + size + "Total unique students".
- Only `validStudents.pgStudentId` become the group's students; the group can be created from the valid subset while invalid rows are reported.
- Removing the file opens a "Remove file?" modal which clears students and the validation result.

### US-3: View Custom Groups List (Staff)

**As a** school staff member,
**I want to** see all custom groups I own or that are shared with me,
**So that** I can manage them.

**Acceptance Criteria:**

- `/groups` (`GroupsPage`) renders an "Assigned Groups" section (US-9) above a "Custom Groups" section.
- `getGroupsStaffOwns()` → `GET /api/web/v2/staff/groups/custom?type=summary` returns `IGroupSummaryDetails[]` (`id`, `groupName`, `numberOfStaff`, `numberOfStudents`).
- Each row shows the name + student count; a shared icon prefixes the name when `numberOfStaff > 1`.
- Empty state: "You have not created any groups yet." / "Try creating one now!"
- Only groups with `numberOfStudents > 0` are returned. Clicking a row → `/groups/customGroups/{id}`.

### US-4: View Custom Group Details (Staff)

**As a** school staff member,
**I want to** open a custom group and review its members and metadata,
**So that** I can verify the roster and decide on actions.

**Acceptance Criteria:**

- `/groups/customGroups/:id` (`CustomGroupDetails`); `getSingleGroupWithStudents(id)` → `GET /api/web/v2/staff/groups/custom/:id` (analytics `CustomGroupViewed`).
- Header shows name + "Custom Group" label. Two tabs: "Students (N)" (default) and "Details".
- **Students tab**: members grouped by class (sorted by `classSerialNo`); each row shows name, index/UIN (MS) or Student ID (IHL), gender, and an "Onboarded & Can Respond" status icon. `-404` redirect if the group isn't in the owned list.
- **Details tab**: "Created on {date} by {createdBy}." and "Group shared with" = owner names. "OTHER ACTIONS" exposes Edit / Share / Delete-or-Remove.
- **IHL only**: an "Export to Excel" button on the Students tab (desktop). Columns: Student ID, Name, Class, Course.

### US-5: Edit a Custom Group (Staff)

**As a** staff member with access to a group,
**I want to** rename it and add/remove students,
**So that** I can keep the roster current.

**Acceptance Criteria:**

- Details → "Edit Group" → `/groups/customGroups/:id/edit` (`CustomGroupPage`, `pageType === 'edit'`).
- `getGroupData(id)` → `GET /api/web/v2/staff/groups/custom/:id` pre-populates `groupName` + `selectedStudentIds`.
- Both manual add and Excel upload available. "Save" enabled only when changed (`isFormEdited`) and valid → `PUT /api/web/v2/staff/groups/custom/:id` with `{ groupName, selectedSchoolStudents }`.
- On success: notification `edit_group_success`, redirect to `/groups/customGroups/:id`.

### US-6: Share a Custom Group with Other Staff (Staff)

**As a** staff member who owns/has access to a group,
**I want to** share it with other staff,
**So that** they can also send to and manage the group.

**Acceptance Criteria:**

- Details → "Share this custom group" (body: "You will be granting access to edit this group. Please be certain.") → `ShareGroupOverlay`.
- Pick staff via `ShareStaffComboBox`. "Share group" disabled until ≥1 selected.
- **Permissions model is co-ownership, not editor/viewer.** The overlay states verbatim the granted rights: **View and send to the group**, **Edit the group name**, **Add or delete students**, **Share the group with other staff**. Shared staff become `owners` with the full action set.
- On confirm → `PUT /api/web/v2/staff/groups/custom/:id/share` with `{ selectedStaff }`. Server validates same-school, not-already-owner, and emails the added staff.

### US-7: Delete a Custom Group (Last Owner) (Staff)

**As a** staff member who is the sole owner of a group,
**I want to** delete it permanently,
**So that** obsolete groups are removed.

**Acceptance Criteria:**

- The Delete action appears **only when `owners.length === 1`** and the current staff is that owner. Surfaces an `isPartOfMessageGroup` warning when used by a message group.
- Confirm → `DELETE /api/web/v2/staff/groups/custom/:id`. On success: redirect to `/groups`, notification `delete_group_success`.
- Server guard: deletion only proceeds when the requester is the **last** remaining owner; else `{ success: false, reason: 'Invalid custom group or Staff not last owner' }`.
- **Multi-select / bulk delete is NOT implemented in pgw-web.** Deletion is per-group from the detail page only. (See Assumptions #6.)

### US-8: Remove Own Access from a Shared Group (Non-Last Owner) (Staff)

**As a** staff member sharing a group with others,
**I want to** remove my own access,
**So that** I stop seeing/sending to a group I no longer need, without affecting other owners.

**Acceptance Criteria:**

- The Remove action appears **only when `owners.length > 1`** and the current staff is among them (body: "You will no longer be able to select this group when creating new posts.").
- Confirm → `PUT /api/web/v2/staff/groups/custom/:id/removeAccess`. On success: redirect `/groups`, notification `remove_access_group_success`.
- Server guard: only proceeds when more than one owner exists and the requester is one of them (the last owner must Delete instead).

### US-9: View Assigned (Auto-Provisioned School Cockpit) Groups (Staff)

**As a** school staff member,
**I want to** see the class and CCA groups assigned to me by School Cockpit,
**So that** I can deep-link into them without creating anything.

**Acceptance Criteria:**

- On `/groups`, `getAssignedGroups()` → `GET /api/web/v2/staff/groups/assigned?type=summary` populates an "Assigned Groups" section (shown only when classes or CCA groups exist).
- For MS the title includes the academic year; for IHL it is just "Assigned Groups".
- Assigned **class** → `/groups/class/details/:id`; assigned **CCA** → `/groups/cca/details/:id`.
- These are derived from SC staff allocations (read-only) — not custom groups, no create/edit/share/delete. There is **no separate "SC custom group" entity** — PGTW-15's "SC custom group" maps to this assigned grouping.

### US-10: Reuse a Custom Group as a Post Recipient (Staff)

**As a** staff member composing a post/consent form/announcement,
**I want to** select a saved custom group as a recipient target,
**So that** I don't re-select students each time.

**Acceptance Criteria:**

- The recipient picker (`StudentGroupsComboBox`) exposes a "Group" tab alongside Class / Level / School / CCA / Individual; custom groups surface there (`GroupTypes.GROUP = 'group'`), with an inline "+ Create Custom Group" link.
- A selected group resolves to its current members at send time; recipient counts via `POST .../groups/student/count`. Self-removal (US-8) and deletion (US-7) make the group unavailable as a future recipient.

### US-11: IHL Variant (Student ID vs Index) (Staff)

**As a** staff member at an Institute of Higher Learning,
**I want to** identify students by Student ID rather than class index,
**So that** rosters match my institution's records.

**Acceptance Criteria:**

- `isIhl` (Redux `indexPage.isIhl`, server-derived via `IHL_SCHOOL_IDS`) switches all identity displays (Student ID vs index/UIN), the upload schema (Student ID vs Name+Class), the valid/invalid result tables, and IHL-only Excel export on the detail Students tab.
- The 5,000 cap is gated for IHL at the UI submit, on upload validation, and server-side; MS create/edit don't gate the cap in the button but the BFF still rejects > 5000 on upload.
- IHL additionally enforces **unique group names** server-side on create/edit; MS does not.

---

## Requirements

### Functional Requirements

#### FR-1: Group Creation (manual)

- A group requires a non-empty `groupName` (UI max 120 chars) and at least one student.
- Manual selection sources the roster from `GET /api/web/v2/staff/school/students` and submits deduped `selectedSchoolStudents` to `POST /api/web/v2/staff/groups/custom`.
- Server validates each student exists, is in the school, has an active allocation and a level; else `'custom group has invalid student'`. Duplicate IDs → `'customGroups has duplicate elements'`. Empty target → `'customGroups targets cannot be empty'`.

#### FR-2: File Upload + Validation

- **Accepted type**: `.xlsx` only. **Max size**: 5 MB. **Max files**: 1. **Max students**: 5,000.
- **MS columns**: `Name`, `Class` (any order, case-insensitive, trimmed). **IHL column**: `Student ID`.
- Two-stage validation: (1) client-side structural checks with the exact `ValidationMessages` strings; (2) server-side roster matching via an async token + Redis + 3 s polling job.
- Per-row invalid reasons (`CUSTOM_GROUP_FILE_UPLOAD_INVALID_MESSAGES`): IHL `Not found` / `Currently inactive` / `No level`; MS `Name not found…` / `Class not found…` / `Name and class do not match…` / `Student is marked as inactive…`. Row numbers are `excel index + 2`.
- Only valid students are added; the group may be created with the valid subset. Manual and upload paths are mutually exclusive within one editing session.

#### FR-3: Sharing / Permissions

- Sharing is **co-ownership**: every shared staff becomes an `owner` with rights to view, send to, rename, add/remove students, and re-share. **No editor/viewer distinction.**
- `PUT .../groups/custom/:id/share` with `{ selectedStaff }`. Server rejects out-of-school or already-owner targets; sends a share-notification email.

#### FR-4: Lifecycle / Edit / Delete / Remove-access

- Edit: `PUT .../groups/custom/:id` (rename + replace student set). Save gated on actual change + validity.
- Delete (last owner only): `DELETE .../groups/custom/:id` (server "last owner" guard).
- Remove access (non-last owner only): `PUT .../groups/custom/:id/removeAccess`.
- Delete vs Remove chosen by owner count in the UI. **No bulk/multi-select delete exists.**

#### FR-5: SC / Assigned Groups Integration

- Assigned class/CCA groups come from `GET .../groups/assigned?type=summary` and deep-link to read-only `/groups/class/details/:id` and `/groups/cca/details/:id`. Auto-provisioned from SC allocations; no CRUD/share. No standalone SC-custom-group entity exists.

#### FR-6: Reuse as Recipients

- Saved custom groups appear under the "Group" tab of `StudentGroupsComboBox` when composing posts/forms/announcements, with an inline "+ Create Custom Group" shortcut. Recipient counts via `POST .../groups/student/count`.

#### FR-7: Roles / IHL / Variants

- **Owner (creator or shared)**: full edit/share/send; delete only if last owner; remove-access only if not last owner. All owners are equal.
- **IHL**: Student-ID-keyed upload/match/display; IHL-only Excel export; 5,000 cap gated in UI submit; unique group name enforced server-side.
- **MS**: Name+Class-keyed; UIN/FIN + index display; no UI submit cap (BFF still caps upload at 5,000); group-name uniqueness not enforced.

#### FR-8: Navigation Guard

- Create/Edit pages guard accidental navigation via `Prompt` + `beforeunload` while dirty and not yet posted; Safari bfcache defeated via `onpageshow`.

### Key Entities

| Entity                              | Description                                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CustomGroup`                       | A staff-owned group: `id`, `groupName`, `createdBy`, `createdAt`, `owners[]`, `studentsList[]`, `isPartOfMessageGroup`.                                                  |
| `IGroupSummaryDetails`              | List-row projection: `id`, `groupName`, `numberOfStaff`, `numberOfStudents` (only groups with > 0 students).                                                             |
| `CustomGroupMember`                 | A student in a group: `studentId`, `studentName`, `className`, `classSerialNo`, `levelCode/Description`, `gender`, `uinFinNo`, `schoolStudentId` (IHL), onboarding flag. |
| `CustomGroupOwner`                  | Staff with full access (`staffId`, `staffName`) — the join that encodes co-ownership/sharing.                                                                            |
| `ValidateStudents…Request/Response` | Upload payload `{ studentId }` (IHL) / `{ name, className }` (MS); response `{ token }`; poll result `{ status, data: { validStudents, invalidStudents } }`.             |
| Assigned / SC group                 | Auto-provisioned `class`/`cca` targets from SC; read-only deep-links.                                                                                                    |
| `StudentType` enum                  | `IHL` / `MS` — selects the upload/validation/display variant.                                                                                                            |

---

## Success Criteria

1. **Manual creation**: Staff can create a named group from hand-picked students and see it in the list and as a post recipient.
2. **Upload creation**: A valid `.xlsx` (≤ 5 MB, correct columns, ≤ 5,000 rows) produces a correct valid/invalid breakdown; a group can be created from the valid subset; every encoded validation message renders verbatim.
3. **Async validation robustness**: Token issuance, Redis `pending` seeding, and 3-second polling resolve without UI hang; 10-minute TTL / 100-attempt ceiling respected.
4. **Sharing/co-ownership**: Sharing grants the full action set, triggers the email, and rejects out-of-school or duplicate owners.
5. **Lifecycle guards**: Delete only for last owner; Remove-access only for non-last owners; the UI shows the correct one based on owner count.
6. **IHL/MS parity**: Identity columns, upload schema, export availability, name-uniqueness, and the 5,000 cap behave per variant.
7. **Reuse**: A saved group is selectable under the recipient "Group" tab and resolves to its current membership.

---

## Assumptions

1. The backend is a Node/Express BFF colocated with the React app (Sequelize via `@pgw/db-migration`); routes under `/api/web/v2/staff/groups/custom`.
2. File parsing happens **client-side** (`xlsx`); only structurally valid rows are sent to the BFF, which performs roster matching against School Cockpit data.
3. Upload validation is intentionally asynchronous (token + Redis + polling) to tolerate large files (up to 5,000 students).
4. `isIhl` is derived from school configuration (`IHL_SCHOOL_IDS`), exposed via Redux `indexPage.isIhl`.
5. CSV is **not** an accepted upload format — only `.xlsx`.
6. **No multi-select/bulk group deletion exists in pgw-web** (PGTW-20's "multi-select delete" is not present). Deletion is single-group from the detail page, governed by the last-owner guard. Flagged as a gap rather than invented.
7. "SC custom group" (PGTW-15) corresponds to the read-only Assigned (class/CCA) groups; there is no separate SC-owned custom-group write path.
8. Group-name uniqueness is enforced only for IHL schools server-side.

---

## Jira Mapping

- **PGTW-13 — Create custom group (manual + file upload)**: US-1 (manual), US-2 (Excel upload), US-11 (IHL); FR-1, FR-2, FR-7, FR-8.
- **PGTW-14 — Share + edit custom group**: US-5 (edit), US-6 (share); FR-3, FR-4.
- **PGTW-15 — SC custom group / auto-provisioned groups**: US-9 (Assigned/SC groups); FR-5. (No standalone SC-custom-group write path exists.)
- **PGTW-20 — Delete (single + multi-select)**: US-7 (single delete, last-owner guard), US-8 (remove access); FR-4. **Multi-select delete is NOT implemented in pgw-web — net-new for TW.**
- **Cross-cutting — Reuse as recipients**: US-10; FR-6.
