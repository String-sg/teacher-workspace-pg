# Feature Specification: Consent Forms

**Feature Branch**: `003-consent-forms`
**Created**: 2026-05-12
**Status**: Reverse-Engineered
**Input**: Reverse-engineered from existing codebase

---

## Overview

Consent Forms is a core communication feature in Parents Gateway Web that allows school staff to create, publish, and manage consent/acknowledgement forms sent to parents. Parents respond via the PG mobile app; staff track responses, filter data, edit responses on behalf of parents, and export results to Excel. The feature supports two response types (Yes/No and Acknowledgement), custom follow-up questions, scheduled posting, draft management, and duplication of both drafts and posted forms.

---

## User Scenarios & Testing

### US-1: Create a New Consent Form (Staff)

**As a** school staff member,
**I want to** create a new consent form with all required fields,
**So that** I can collect consent from parents for school activities.

**Acceptance Criteria:**

- Staff navigates to `/consentForms/new`.
- Staff selects target student groups (by class, level, school, CCA, or custom group) and optionally individual students.
- Staff selects staff-in-charge (co-owners who can view responses).
- Staff enters enquiry email address (from staff email, school email, or custom).
- Staff enters title (max 120 characters) and description (rich text, max 2000 characters).
- Staff optionally adds in-app shortcuts (e.g., Declare Travels, Edit Contact Details -- hidden for SPED schools).
- Staff adds web links (URL + optional description), file attachments (up to limit), and photo gallery images (with cover photo designation).
- Staff selects response type: **Yes/No** or **Acknowledgement**.
- If Yes/No is selected, staff can optionally add custom questions (text, single selection, or multi selection).
- Staff enters event details: start date/time, end date/time, venue.
- Staff enters consent due date (mandatory) and configures reminders (none, one-time, or daily).
- Staff can optionally set a scheduled post date/time for future publishing.
- A preview is shown before posting.
- On post, a confirmation modal shows the form title and number of target students.
- Successful post redirects to the consent forms list with a success notification.
- WOGAA transaction tracking is fired for scheduled posts.

### US-2: Save Form as Draft

**As a** school staff member,
**I want to** save an incomplete consent form as a draft,
**So that** I can continue editing it later.

**Acceptance Criteria:**

- Staff can click "Save as Draft" at any point during creation.
- Draft is saved via `POST /staff/consentForms/drafts` (new) or `PUT /staff/consentForms/drafts/:id` (existing).
- After first save, the URL updates to `/consentForms/drafts/:id`.
- Auto-save triggers on session timeout countdown (auto-save state context).
- Toast notification confirms successful save.
- Draft upload expiry is tracked for attachments and photos.
- If title or description exceeds character limits, save is blocked with inline error.
- Incomplete schedule date/time (only date or only time filled) blocks save with error.

### US-3: Edit a Draft Consent Form

**As a** school staff member,
**I want to** open an existing draft and continue editing,
**So that** I can finalize and post the form.

**Acceptance Criteria:**

- Staff navigates to `/consentForms/drafts/:id`.
- The `useDraftGetter` hook fetches the draft via `ConsentFormDraftManager.getConsentFormDraftById`.
- All fields are pre-populated from the draft data (student groups, staff groups, title, content, email, shortcuts, URLs, attachments, photos, response type, custom questions, event dates, venue, due date, reminder, schedule).
- Expired attachments/photos show an expiry alert notification.
- Staff can edit any field and save again as draft or post.

### US-4: Schedule a Consent Form Post

**As a** school staff member,
**I want to** schedule a consent form to be posted at a future date/time,
**So that** I can prepare forms in advance.

**Acceptance Criteria:**

- Staff fills in the schedule date/time picker.
- On preview, staff clicks "Schedule Post" which opens a confirmation modal showing the scheduled date, time, and a note that student/staff assignments are evaluated at send time.
- On confirm, the form is saved via `ConsentFormScheduleService.post` (new) or `.put` (existing draft).
- Scheduled forms appear in the "Created by you" list with status SCHEDULED.
- Staff can reschedule or cancel scheduled forms from the list action menu.
- Rescheduling calls `ConsentFormScheduleService.rescheduleScheduledConsentForm`.
- Cancellation calls `ConsentFormScheduleService.cancelScheduledConsentForm`.
- Scheduled send failure codes are tracked and displayed.

### US-5: View Consent Forms List (Staff)

**As a** school staff member,
**I want to** see all consent forms I created or that are shared with me,
**So that** I can manage and track responses.

**Acceptance Criteria:**

- Staff navigates to `/consentForms`.
- Page shows two tabs: "Created by you" and "Shared with you" (Mantine Tabs, URL query param `tab`).
- **Created by you** tab: shows forms with columns Title, Date, Status, To Parents Of, # Responded, and an action menu.
  - Statuses: DRAFT, OPEN, CLOSED, SCHEDULED, POSTING.
  - Action menu varies by status: Draft (Edit, Duplicate, Delete), Open/Closed (Duplicate), Scheduled (Reschedule, Cancel).
  - Response progress bar shows `respondedPerStudent / totalStudents`.
  - Date column is sortable. Status, To Parents Of columns are filterable.
- **Shared with you** tab: shows forms shared by other staff with columns Title, Date, Status, Created By, To Parents Of, # Responded, and action menu (Duplicate for Open/Closed only).
- "Create New" button navigates to `/consentForms/new`.

### US-6: View Consent Form Details and Responses (Staff)

**As a** school staff member,
**I want to** view detailed responses for a posted consent form,
**So that** I can track parent consent and take action.

**Acceptance Criteria:**

- Staff navigates to `/consentForms/details/:id`.
- Page shows a header with title, event date range, and target groups.
- Two tabs: "Responses" and "Details".
- **Responses tab:**
  - Summary stats at top showing Total, Yes, No, Pending counts (or Total, Yes, Pending for Acknowledgement type).
  - Clicking a stat filters the response table by that reply value.
  - Filter section with dropdowns for Status (Onboarded/Not Onboarded), Class, and Show Columns (multi-select).
  - Response data table with configurable columns: Name (fixed), Class/Index, Gender, Response, Custom Questions (dynamic per question), Comments, Last Responded By, Last Responded On, Status.
  - IHL schools have alternative column layout (IHL Class, Student ID instead of Class/Index).
  - "Edit Response" link per student (restricted for onboarded custodians before due date for Yes/No forms).
  - "Export to Excel" button (desktop only) exports filtered data to .xlsx.
  - "View more" link on Last Responded By shows reply audit history modal.
  - For Yes/No response type, a reminder banner is displayed: "Custodians may edit their responses till the due date."
- **Details tab:**
  - Shows posting details (date, staff name), staff-in-charge (with Add button), enquiry email (with Edit button), description, shortcuts, venue, web links, file attachments, photo gallery, type of response, custom questions with choices, due date and reminder info (with Edit button), view history (accordion), and Other Actions (Duplicate, Delete).

### US-7: Edit a Student's Response (Staff)

**As a** school staff member,
**I want to** edit a parent's response on behalf of them,
**So that** I can correct or update consent information.

**Acceptance Criteria:**

- Staff clicks "Edit Response" for a student in the Responses tab.
- An overlay opens showing the student name, submitted-by info, and editable fields.
- Staff can change the reply (Yes/No or Yes for Acknowledgement).
- If Yes is selected and custom questions exist, staff can edit custom question answers (text input, radio buttons for single selection, checkboxes for multi selection).
- Staff can edit optional comments (max 500 characters).
- On save, a confirmation modal appears. On confirm, the response is updated via `PUT /staff/consentForms/:id/student/:studentId/reply`.
- Custom question replies are only sent when reply is YES.
- Success notification shown; response table refreshes.

### US-8: Manage Staff-in-Charge

**As a** school staff member,
**I want to** add or remove staff-in-charge for a consent form,
**So that** the right staff can manage responses.

**Acceptance Criteria:**

- From the Details tab, staff clicks "Add" next to Staff-in-charge.
- An overlay shows a staff selector; selected staff are added via `POST /staff/consentForms/:id/addStaffInCharge`.
- Staff can remove themselves via "Remove" link, which calls `PUT /staff/consentForms/:id/removeAccess` and redirects to the list.

### US-9: Edit Enquiry Email and Due Date

**As a** school staff member,
**I want to** update the enquiry email or extend the due date of a posted form,
**So that** parents have the correct contact information and enough time to respond.

**Acceptance Criteria:**

- Edit Enquiry Email overlay allows selecting from staff email, school email, or custom. Calls `PUT /staff/consentForms/:id/updateEnquiryEmail`.
- Edit Due Date overlay allows changing due date and reminder. Calls `PUT /staff/consentForms/:id/updateDueDate`.
- History records are created for due date changes and shown in the View History section.

### US-10: Delete a Consent Form

**As a** school staff member,
**I want to** permanently delete a consent form,
**So that** obsolete forms are removed.

**Acceptance Criteria:**

- From the Details tab, staff checks a disclaimer checkbox and clicks "Delete Forever".
- A confirmation modal appears.
- On confirm, the form is deleted via `DELETE /staff/consentForms/:id` (or `/schoolAdmins/consentForms/:id` for admins).
- Redirects to the consent forms list with a success notification.

### US-11: Duplicate a Consent Form

**As a** school staff member,
**I want to** duplicate an existing consent form (draft or posted),
**So that** I can reuse it with modifications.

**Acceptance Criteria:**

- From the list action menu or Details tab, staff can duplicate.
- Draft duplication calls `POST /staff/consentForms/drafts/duplicate`.
- Posted form duplication calls `POST /staff/consentForms/duplicate`.
- Both return a new draft ID; staff is redirected to `/consentForms/drafts/:newId` with a success toast.
- Analytics events are tracked for duplication.

### US-12: View Consent Forms List (School Admin)

**As a** school admin,
**I want to** view all consent forms across my school,
**So that** I can oversee school communications.

**Acceptance Criteria:**

- Admin navigates to `/admin/consentForms`.
- Legacy list view showing all posted forms with title, event dates, due date indicator, creator name, posted date, and total recipient count.
- Clicking navigates to `/admin/consentForms/details/:id`.
- Admin has `isAdmin=true` flag which maps to `/schoolAdmins/consentForms` API endpoint.
- Admin can delete forms but cannot add/remove staff or edit email/due date.

---

## Requirements

### Functional Requirements

#### FR-1: Form Creation

- Support two response types: `YES_NO` and `ACKNOWLEDGEMENT`.
- Support custom questions with types: `text`, `single_selection`, `multi_selection`.
- Custom questions are only applicable when response type is `YES_NO`.
- Each custom question has a title, optional description, and for selection types, a list of choices with id/label.
- Support event date range (start date/time, end date/time), venue, consent due date.
- Support three reminder types: `NONE` (default due-date reminder only), `ONE_TIME` (additional reminder on specific date), `DAILY` (daily reminders from date until due date).
- Support rich text content (JSON format via `richTextContent` field).
- Support file attachments and photo gallery with file token-based upload.
- Support in-app shortcuts selection.
- Support web links with optional descriptions.
- Support staff groups selection for co-ownership.
- Title max length: 120 characters. Description max length: 2000 characters.

#### FR-2: Draft Management

- Auto-save on session timeout trigger.
- Manual save as draft at any time.
- Draft persists all form fields including scheduled post date/time.
- Draft upload expiry tracking for attachments and photos.
- Drafts can be edited, deleted, or duplicated.

#### FR-3: Scheduled Posting

- Forms can be scheduled for future posting with a specific date and time.
- Scheduled forms can be rescheduled or cancelled.
- Students and staff assignments are evaluated at the time of actual sending, not scheduling.
- A reminder is sent to the creator before the scheduled time (unless within 24 hours).
- Scheduled send failure codes are tracked and displayed.

#### FR-4: Response Tracking

- Track responses per student: YES, NO, or Pending (for YES_NO); YES or Pending (for ACKNOWLEDGEMENT).
- Display response summary stats with interactive filtering.
- Support filtering by class, onboarding status, and reply type.
- Support configurable column visibility.
- Custom question responses displayed inline in the data table.
- Reply audit trail shows history of response changes (by custodian or teacher).

#### FR-5: Response Editing

- Staff can edit responses on behalf of parents.
- For Yes/No forms, editing is restricted for onboarded custodians until after the due date.
- Custom question replies are mandatory when reply is YES.
- Comments are optional (max 500 characters).

#### FR-6: Export

- Export filtered response data to Excel (.xlsx).
- Export respects column visibility and filter settings.
- Export includes class, index, name, gender, response, custom questions, comments, last responded by/on, status.
- Export is not available on mobile devices.

#### FR-7: Roles and Access

- **Staff**: Full CRUD on own forms, edit responses, manage staff-in-charge, edit email/due date.
- **Staff (shared)**: View responses, duplicate posted forms. No edit/delete.
- **School Admin**: View all school forms, delete forms. No staff management or field editing. Uses `/schoolAdmins/` API path.
- **IHL (Institute of Higher Learning)**: Alternative column layout with Student ID instead of index number.
- **SPED (Special Education)**: In-app shortcut "Edit Contact Details" is hidden.

#### FR-8: Navigation Prevention

- Unsaved changes trigger a browser navigation prompt ("You are about to leave this page. Any unsaved changes will be lost.").
- `useUnloadEvent` hook prevents accidental page close.

### Key Entities

| Entity                  | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| `ConsentForm`           | A posted consent form with full response data             |
| `ConsentFormDraft`      | A draft consent form (pre-posting)                        |
| `ConsentFormRecipient`  | A student-parent pair targeted by a form, with reply data |
| `CustomQuestion`        | A follow-up question attached to a Yes/No form            |
| `CustomQuestionReply`   | A parent's answer to a custom question                    |
| `ConsentFormTarget`     | Target group (class, level, school, CCA, custom group)    |
| `ConsentFormOwner`      | Staff member who owns/co-owns the form                    |
| `ConsentFormHistory`    | Audit trail of form changes (creation, due date edits)    |
| `ConsentFormReplyAudit` | Audit trail of individual reply changes                   |

---

## Success Criteria

1. **Form Creation**: Staff can successfully create and post a consent form with all field types, receiving confirmation and seeing it in the list.
2. **Draft Persistence**: Drafts save all fields and restore correctly on reload, including auto-save on timeout.
3. **Scheduled Posting**: Scheduled forms are sent at the correct time; reschedule and cancel work without data loss.
4. **Response Tracking**: Response summary stats are accurate; filters work correctly across all combinations; data table displays all columns including dynamic custom question columns.
5. **Response Editing**: Staff can edit responses with all custom question types; validation enforces mandatory fields; confirmation modal prevents accidental changes.
6. **Export Accuracy**: Excel export matches the filtered data table exactly, including custom question columns.
7. **Role-Based Access**: Admin and staff views correctly restrict/enable actions based on role; IHL and SPED variants render correctly.
8. **Data Integrity**: Optimistic concurrency via `updatedAt` field; file upload state tracking (success/fail/expired).

---

## Assumptions

1. The backend API is a Node.js BFF (Backend-For-Frontend) running alongside the React frontend, using Sequelize ORM (`@pgw/db-migration`).
2. File uploads (attachments, photos) use a token-based upload flow where files are uploaded separately and referenced by `fileToken`.
3. The mobile app (Parents Gateway) handles the parent-side response flow; this spec covers only the staff web portal.
4. Rich text content is stored as JSON (`richTextContent`) with a plain-text fallback (`content`).
5. The `isIhl` and `isSped` flags are derived from school configuration and stored in the Redux `indexPage` state.
6. WOGAA (Whole-of-Government Application Analytics) tracking is a Singapore government requirement for public-facing applications.
7. The `EResourceStatus` enum (DRAFT, POSTED, SCHEDULED, POSTING) comes from a shared status type; the frontend maps POSTED to OPEN/CLOSED based on the consent-by date.
8. Session timeout auto-save uses the `AutoSaveStatesContext` (PENDING -> TRIGGER -> SUCCESS/FAILED).
