# Feature Specification: Announcements

**Feature Branch**: `001-announcements`
**Created**: 2026-06-09
**Status**: Reverse-Engineered
**Input**: Reverse-engineered from existing codebase (`pgw-web`)

---

## Overview

Announcements is a one-way communication feature in Parents Gateway Web that lets school staff broadcast information to parents. Unlike Consent Forms, announcements collect **no parental response** — they track only whether each recipient parent has **read** the post. Staff create announcements targeting student groups (and individual students), assign co-owning staff-in-charge, attach rich-text content, web links, file attachments, and a photo gallery, optionally add in-app shortcuts, and either post immediately, save as a draft (with autosave), or schedule for future sending. After posting, staff track read status per student, filter the recipient table, export to Excel, and duplicate or delete the post. School admins get a read-only oversight list. The feature is a React frontend backed by a Node/Express BFF (`src/server/apiv2/staff/...` and `.../school-admin/...`) using Sequelize models from `@pgw/db-migration`.

---

## User Scenarios & Testing

### US-1: Create and Post an Announcement (Staff)

**As a** school staff member,
**I want to** create a new announcement with all required fields and post it,
**So that** I can keep parents informed.

**Acceptance Criteria:**

- Staff navigates to `/announcements/new` (page `CreateAnnouncementPage.tsx`).
- The form is organized into sections (`FormDivider`): **Recipients (PARENTS)**, **Recipients (SCHOOL STAFF)**, **Enquiry Details**, **Content**, **Gallery**, **Settings**.
- Staff selects target recipients via `IndividualStudentGroupsComboBoxDirty` — by **class, level, school, CCA, custom group, or individual student**. When >1 unique student is selected, a summary line shows "This announcement will be sent to the parents of N students."
- Staff selects **staff-in-charge** via `StaffGroupsComboBoxDirty` (co-owners). Sub-label: "These staff will be able to view read status, and delete the announcement". **There is NO editor/viewer access-type distinction** (see note below).
- Staff selects an **enquiry email** (`EmailSelectorDirty`) from staff email, school email, or a custom "Other" address.
- Staff enters **title** (max 120 chars — error "Exceeded by N characters") and **description** (rich text, max 2000 chars).
- Staff optionally adds **in-app shortcuts** (`MultipleSelectCheckboxDirty`, hidden when `isIhl`).
- Staff adds **web links** (up to 3, URL + optional description), **file attachments** (up to 3, ≤5 MB each), and **photo gallery** images (up to 12, with up to 3 cover photos).
- Staff optionally fills a **schedule post date/time** under Settings.
- Staff clicks **Preview** (`AnnouncementPreview`), then **Post Now**. A confirmation modal reads "You are about to post the announcement "<title>" to N students."
- On confirm, `useSubmitForm` → `AnnouncementManager.postAnnouncement` → `AnnouncementService.post` → `POST /api/web/v2/staff/announcements`.
- On success: redirect to `/announcements` with success notification linking to `/announcements/details/:id`; analytics `AnnouncementCreated` fired.
- Targets are sent only as `{ targetType, targetId }` (acad year omitted; resolved server-side at send time).

> **Difference from Consent Forms:** Announcements have **no response type** (no Yes/No or Acknowledgement), **no custom questions**, **no event date range / venue**, **no consent due date / reminders**. The recipient summary stats and table are about **Read / Unread**, not replies.

> **Note on staff-in-charge access type (verified):** The Consent Forms request mentions EDITOR vs VIEWER. Announcements do **not** implement any such enum. `AnnouncementOwner` carries only `pgStaffId` + `isDeleted` (no `accessType`); `grep` for `accessType|EDITOR|VIEWER` yields only the unrelated email-template variable `editor` (the creator's display name). All staff-in-charge are equal co-owners who can view read status and delete.

### US-2: Save Announcement as Draft

**As a** school staff member,
**I want to** save an incomplete announcement as a draft,
**So that** I can finish it later.

**Acceptance Criteria:**

- Staff clicks "Save as Draft" (`SaveAsDraftStickyBar`).
- New draft → `POST /api/web/v2/staff/announcements/drafts`; existing → `PUT /api/web/v2/staff/announcements/drafts/:announcementDraftId` (`AnnouncementDraftManager.saveAsDraft`).
- After first save, URL replaces to `/announcements/drafts/:announcementDraftId`.
- Toast: "Your draft announcement has been saved successfully."
- Draft body persists `studentGroups`, `staffGroups`, `title`, `content`, `enquiryEmailAddress`, `urls`, `shortcuts`, `attachments`/`images` (by `fileToken`), and `scheduledDateTime`.
- Save is **blocked** if title >120 or description >2000.
- If exactly one of schedule date / time is filled, save is blocked (`incompleteScheduleSendDatetime`).

### US-3: Autosave on Session Timeout

**As a** school staff member,
**I want** my in-progress announcement to be autosaved before my session expires,
**So that** I don't lose work.

**Acceptance Criteria:**

- `useAutoSaveStates` (`AutoSaveStatesContext`) drives a `PENDING → TRIGGER → SUCCESS/FAILED` cycle.
- On `TRIGGER`, if the form is dirty, `processSaveAsDraft(true)` runs with `isAutosave=true`, sending the `pg-no-extend` header so the session is **not** extended.
- Autosave updates `updatedAt` silently (no toast); on failure sets state `FAILED`.

### US-4: Edit a Draft Announcement

**As a** school staff member,
**I want to** reopen and continue editing a draft,
**So that** I can finalize and post it.

**Acceptance Criteria:**

- Staff navigates to `/announcements/drafts/:id`.
- `useDraftGetter` → `AnnouncementDraftManager.getAnnouncementDraftById` → `GET /api/web/v2/staff/announcements/drafts/:announcementDraftId`.
- All fields pre-populate (student groups, staff groups, title, `richTextContent`/`content`, email, shortcuts, urls, attachments, images, `scheduledDateTime`).
- Attachment/photo state derived: `fail → ERROR`, past `expiryDate → EXPIRED`, else `SUCCESS`; expired uploads surface a `NotificationExpiryAlert` via `useDraftUploadExpiryNotifier`.

### US-5: Schedule, Reschedule, and Cancel an Announcement

**As a** school staff member,
**I want to** schedule an announcement for a future date/time and manage that schedule,
**So that** I can prepare posts in advance.

**Acceptance Criteria:**

- Staff fills the `SchedulePostDateTimePicker`; on Preview the sticky bar exposes **Schedule Post**.
- Confirmation modal states students and staff-in-charge are resolved **at send time**, and PG sends a reminder before the scheduled time "unless it's scheduled under the next 24 hours."
- Schedule new → `POST /api/web/v2/staff/announcements/drafts/schedule`; schedule existing draft → `PUT /api/web/v2/staff/announcements/drafts/schedule/:announcementDraftId`.
- Scheduled posts appear in **Created by you** with status SCHEDULED; their rows are click-disabled (also for POSTING).
- **Reschedule** (row action) → `PUT /api/web/v2/staff/announcements/drafts/:announcementDraftId/rescheduleSchedule`.
- **Cancel** (row action) → modal "Cancel sending this post?" ("the post will be moved to Drafts") → `POST /api/web/v2/staff/announcements/drafts/:announcementDraftId/cancelSchedule`.
- A failed scheduled send surfaces `scheduledSendFailureCode`; the row expands to show the mapped error message.
- WOGAA transaction is started on Preview when schedule-eligible and completed on success.

### US-6: View Announcements List (Staff)

**As a** school staff member,
**I want to** see announcements I created and those shared with me,
**So that** I can manage them and track reads.

**Acceptance Criteria:**

- Staff navigates to `/announcements` (`StaffAnnouncementList.tsx`). Mantine `Tabs`: **Created by you** / **Shared with you**, synced to URL query `tab`.
- "Create New" page action → `/announcements/new`.
- **Created by you** (`GET /api/web/v2/staff/announcements`) columns: **Title**, **Date** (sortable), **Status**, **To Parents Of** (filterable), **# Read** (`readPerStudent / totalStudents` + progress bar, shown only for POSTED), and an action menu. Status values from `EAnnouncementAPIResponseStatus` = DRAFT, POSTED, SCHEDULED, POSTING.
  - Action menu by status: DRAFT → Edit / Duplicate / Delete; POSTED → Duplicate; SCHEDULED → Reschedule / Cancel.
  - Row click: DRAFT → `/announcements/drafts/:id`; POSTED → `/announcements/details/:id`; SCHEDULED/POSTING disabled.
  - Search by title (min 3 chars, debounced); filter modal for Date range + Status; table/filter state persisted in URL.
- **Shared with you** (`GET /api/web/v2/staff/announcements/shared`) columns add **Created By**; action menu only offers **Duplicate** for POSTED rows.

### US-7: View Announcement Details and Read Status (Staff)

**As a** school staff member,
**I want to** see who has read a posted announcement,
**So that** I can follow up with parents who haven't.

**Acceptance Criteria:**

- Staff navigates to `/announcements/details/:id`; data via `GET /api/web/v2/staff/announcements/:id`.
- Header shows title, target groups, and individual student targets.
- Two tabs: **Read Status** (default) and **Details**.
- **Read Status tab** (`ResponseScreen.tsx`):
  - Summary stats (`StatsGroup`) showing **Total / Read / Unread**; clicking a stat filters the table by read state.
  - Filter row: **Status** dropdown (onboarding status), **Class** dropdown, **Show Columns** multi-select.
  - Data table columns: **Name** (fixed), **Class/Index**, **Read Status** (Read/Unread), **Read Time**, **First Read By** (parent identity/name/contact), **Status** (onboarding). IHL variant swaps Class/Index for **Class** + **Student ID**.
  - **Export to Excel** button (desktop only; mobile shows "not supported on mobile devices.") → `AnnouncementDetailManager.exportToExcel`. Excel columns ordered per `EXCEL_DATA_COLUMNS`.
- **Details tab** (`DetailsScreen.tsx`): posting details, **Staff-in-charge** (with **Add**, self-**Remove**), **Enquiry Email** (with **Edit**), Description, Shortcuts, Web Link, File attachments, Photo Gallery, and **Other Actions** (Duplicate + Delete).

> **Difference from Consent Forms:** No "Edit Response" per student, no reply-audit history modal, no due-date editing, no "Custodians may edit till due date" banner. There is no per-student write path beyond read tracking.

### US-8: Manage Staff-in-Charge

**As a** school staff member,
**I want to** add or remove staff-in-charge on a posted announcement,
**So that** the right staff can oversee it.

**Acceptance Criteria:**

- Details tab → **Add** opens `AddStaffInChargeOverlay` → `POST /api/web/v2/staff/announcements/:id/addStaffInCharge` (body `{ announcementId, staffIDs }`). New staff receive an email notification.
- A staff-in-charge can **Remove** themselves → confirmation → `PUT /api/web/v2/staff/announcements/:id/removeAccess`; on success redirect to `/announcements`.

### US-9: Edit Enquiry Email (Posted Announcement)

**As a** school staff member,
**I want to** update the enquiry email on a posted announcement,
**So that** parents contact the right person.

**Acceptance Criteria:**

- Details tab → **Edit** (enquiry email) opens `EditEmailAddressOverlay` (staff/school/custom).
- `PUT /api/web/v2/staff/announcements/:id/enquiryEmailAddress` (body includes `enquiryEmailAddress` + `prevEnquiryEmailAddress` for the application log).

> **Difference from Consent Forms:** There is **no Edit Due Date** flow (announcements have no due date).

### US-10: Delete an Announcement

**As a** school staff member,
**I want to** permanently delete an announcement,
**So that** obsolete posts are removed.

**Acceptance Criteria:**

- Details tab → tick "I am sure I want to delete this announcement." then **Delete Forever**, confirmation modal.
- Staff path → `DELETE /api/web/v2/staff/announcements/:id`; admin path → `DELETE /api/web/v2/schoolAdmins/announcements/:id`.
- Notification `delete_announcement_success`; redirect to `/announcements` (or `/admin/announcements` for admin).
- A DRAFT can also be deleted from the Created-by-you list → `DELETE /api/web/v2/staff/announcements/drafts/:announcementDraftId`; the row is optimistically removed from the cache.

### US-11: Duplicate an Announcement (Draft or Posted)

**As a** school staff member,
**I want to** duplicate an existing announcement,
**So that** I can reuse it.

**Acceptance Criteria:**

- Draft duplication → `POST /api/web/v2/staff/announcements/drafts/duplicate` (body `{ announcementDraftId }`).
- Posted duplication → `POST /api/web/v2/staff/announcements/duplicate` (body `{ announcementId }`); the server guards ownership.
- Both return a new `announcementDraftId`; staff is redirected to `/announcements/drafts/:newId` with a success toast.

### US-12: Create from a Prefilled Magic Link

**As a** school staff member,
**I want to** open a pre-populated announcement from a deep link,
**So that** I can quickly post content prepared elsewhere (e.g. an AI-drafted post).

**Acceptance Criteria:**

- Staff navigates to `/announcements/prefilled/:magicLinkId`.
- `usePrefilledGetter` → `GET /api/web/v2/staff/announcements/prefilled/:announcementPrefilledId`.
- Status is `EPrefilledAnnProcessStatus` (`PROCESSING` / `COMPLETED`); while `PROCESSING` the combo boxes show a loading state and the hook **polls** until `COMPLETED` or surfaces a load error.
- Title, content, urls, student groups, and staff groups are pre-filled; the form is marked dirty.

### US-13: View Announcements List (School Admin)

**As a** school admin,
**I want to** oversee all announcements in my school,
**So that** I can monitor communications.

**Acceptance Criteria:**

- Admin navigates to `/admin/announcements` (legacy `R12` list).
- List rows show title, "Created by <staff name>", "on <postedDate>", and a recipient `total` indicator; clicking → `/admin/announcements/details/:id`.
- Admin endpoints under `schoolAdminAnnouncementRouter`: legacy `GET /api/web/v2/schoolAdmins/announcements`; reskin `GET /api/web/v2/schoolAdmins/r12/announcements`; `GET …/:id`; `DELETE …/:id`.
- Admin details view hides **Add staff-in-charge**, **Edit enquiry email**, and **Duplicate**; admin can still **Delete**.

---

## Requirements

### Functional Requirements

#### FR-1: Announcement Creation

- One-way post: **no** response type, custom questions, event dates, venue, or due date.
- Recipients selectable by class, level, school, CCA, custom group, and/or individual student; targets serialized as `{ targetType, targetId }` only.
- Staff-in-charge are equal co-owners (no editor/viewer enum); creator is excluded from the submitted staff-in-charge list.
- Enquiry email from staff email, school email, or custom.
- Title **max 120 chars**; description rich text **max 2000 chars**.
- Rich text via Tiptap — supported marks/nodes: **Document, Paragraph, Text, Bold, Italic, Underline, TextAlign (paragraph/orderedList/bulletList), ListItem, OrderedList, BulletList, HardBreak**, plus History, CharacterCount, Placeholder. Stored as `richTextContent` (JSON) with `content` plain-text fallback.
- Web links: **up to 3**, URL + optional description.
- File attachments: **up to 3**, **≤5 MB each**, uploaded by `fileToken`.
- Photo gallery: **up to 12**, **up to 3 cover photos**.
- In-app shortcuts: `DECLARE_TRAVELS`, `EDIT_CONTACT_DETAILS` (`EAnnouncementShortcutType`). **Hidden entirely when `isIhl`** (no separate SPED hide found — IHL is the variant the code encodes).

#### FR-2: Draft Management

- Manual save and autosave to the drafts endpoints; new vs existing chosen by presence of `:id`.
- Autosave sends `pg-no-extend` header so the session is not extended; states driven by `AutoSaveStatesContext`.
- Drafts persist all fields incl. `scheduledDateTime`; attachment/photo expiry tracked (`expiryDate` → EXPIRED state).
- Save blocked on title/description over-limit and on partially-filled schedule date/time.
- Drafts can be edited, duplicated, or deleted.

#### FR-3: Scheduled Posting

- Schedule on create or from an existing draft; reschedule and cancel from the Created-by-you list.
- Recipients and staff-in-charge are resolved at send time, not at scheduling.
- Creator reminded before send unless within 24 hours.
- `scheduledSendFailureCode` tracked; failure message shown in an expandable row.
- Cancel moves the post back to Drafts.

#### FR-4: Read Tracking

- Per recipient, track **Read / Unread** (`readStatus`/`readDate`); no reply values.
- Summary stats Total / Read / Unread; clicking filters the table.
- Filter by onboarding **Status**, **Class**, and interactive **Read summary**; configurable **Show Columns**.
- `# Read` progress = `readPerStudent / totalStudents`, surfaced only for POSTED.
- "First Read By" shows the parent identity/name/contact of the first read.

#### FR-5: Export

- Export the filtered read-status table to Excel (`.xlsx`).
- Export respects column visibility and current filters; columns ordered per `EXCEL_DATA_COLUMNS`.
- Disabled on mobile.

#### FR-6: Roles and Access

- **Staff (creator/owner):** full CRUD, manage staff-in-charge, edit enquiry email, export, duplicate, schedule.
- **Staff (shared / co-owner):** see in "Shared with you"; can view read status and **Duplicate** posted; staff-in-charge can self-remove and delete the announcement.
- **School Admin:** read-only oversight list + delete; no staff management, enquiry-email edit, or duplicate. Uses `/schoolAdmins/` API path.
- **IHL (Institute of Higher Learning):** in-app shortcuts hidden; response table uses Class + Student ID columns instead of Class/Index.
- **SPED:** Not separately encoded in the announcement code paths reviewed — the only school-type branch is `isIhl`. _(Consent Forms' SPED shortcut-hiding was not found for announcements; flagged rather than invented.)_

#### FR-7: Navigation Prevention

- Unsaved changes trigger a React-Router `Prompt` ("…Any unsaved changes will be lost.") and `useUnloadEvent` guards browser unload while dirty and not posting.

#### FR-8: Listing, Search, and URL State

- Created-by-you / Shared-with-you tabs persisted via `tab` query param.
- Per-tab table state (pagination, sorting, filters, search) persisted in the URL; title search ≥3 chars with debounce.

### Key Entities

| Entity                                         | Description                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Announcement`                                 | A posted announcement with content, targets, owners, students (with read status), images, attachments |
| `AnnouncementDraft`                            | A pre-post draft holding all form fields incl. `scheduledDateTime`, by `fileToken` uploads            |
| `AnnouncementPrefilled`                        | A magic-link pre-population payload with `EPrefilledAnnProcessStatus` (PROCESSING/COMPLETED)          |
| `AnnouncementRecipient`                        | A targeted student + parent with `readDate`, parent name/phone/relationship, `onBoardedCategory`      |
| `AnnouncementTarget`                           | A target group: school/level/class/cca/custom (`ETargetType`), acad year resolved server-side         |
| `AnnouncementOwner`                            | A staff co-owner (`pgStaffId`, `isDeleted`) — **no access-type field**                                |
| `AnnouncementShortcut`                         | In-app shortcut: `DECLARE_TRAVELS`, `EDIT_CONTACT_DETAILS`                                            |
| `AnnouncementUrl`                              | A web link (`webLink` + `linkDescription`)                                                            |
| `AnnouncementAttachment` / `AnnouncementImage` | File attachment / gallery image (name, size, sequence, `isCover`, downloadUrl)                        |
| `EAnnouncementAPIResponseStatus`               | List row status (DRAFT, POSTED, SCHEDULED, POSTING — mapped from `EResourceStatus`)                   |

---

## Success Criteria

1. **Creation**: Staff can create and post an announcement with recipients, staff-in-charge, rich text, links, attachments, and gallery, receiving confirmation and the post appearing in the list.
2. **Draft Persistence**: Drafts save/restore all fields incl. schedule and expiry-aware uploads; autosave fires on session-timeout trigger without extending the session.
3. **Scheduled Posting**: Schedule, reschedule, and cancel work; failure codes render; recipients resolve at send time.
4. **Read Tracking**: Summary stats (Total/Read/Unread) are accurate; Status/Class/Read filters and Show-Columns combine correctly; IHL column variant renders.
5. **Export Accuracy**: Excel export matches the filtered table and column order; unavailable on mobile.
6. **Role-Based Access**: Admin list/details correctly hide add-staff, edit-email, and duplicate; shared-with-you offers only duplicate of posted; IHL hides shortcuts and reskins columns.
7. **Duplication & Deletion**: Draft and posted duplication both yield a new editable draft; deletion (staff and admin paths) removes the post and redirects with success notice.
8. **Navigation Safety**: Dirty-state prompt and unload guard prevent accidental loss.

---

## Assumptions

1. The backend is a Node/Express BFF alongside the React frontend, using Sequelize models from `@pgw/db-migration`; staff routes mount under `/api/web/v2/staff` and admin under `/api/web/v2/schoolAdmins`.
2. File uploads (attachments/photos) use a token flow — files uploaded separately and referenced by `fileToken`.
3. The Parents Gateway mobile app handles the parent reading flow; this spec covers the staff web portal. Announcements are one-way (read tracking only, no parental responses).
4. Rich text is Tiptap JSON in `richTextContent` with a `content` plain-text fallback; supported nodes/marks are exactly those registered in `getSupportedExtensions`.
5. `isIhl` derives from school config in Redux `indexPage`. SPED-specific behavior was **not** found in announcement code paths (only IHL branches); this is flagged, not assumed.
6. WOGAA tracking is a Singapore-government analytics requirement; used for schedule-post transactions and search/filter.
7. `EResourceStatus` (DRAFT, POSTED, POSTING, SCHEDULED) is the canonical status enum; `EAnnouncementAPIResponseStatus` maps it for list rows.
8. The `R12` admin routes (`/schoolAdmins/r12/announcements`) are a transitional reskin coexisting with the legacy admin list.
