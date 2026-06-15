# Consent Forms - Complete Redevelopment Spec (Staff & Admin)

**Created**: 2026-06-09
**Purpose**: Comprehensive reference for frontend redevelopment — business logic, validation, functional behavior, and API contracts.

---

## 1. Constants & Constraints

### 1.1 Character Limits

| Field | Max Length |
|-------|-----------|
| Title | 120 characters |
| Description (rich text) | 2,000 characters (plain text count) |
| Custom question title | 120 characters |
| Custom question description | 250 characters |
| Choice label | 120 characters |
| Response remarks/comments | 500 characters |
| Enquiry email | 250 characters |
| Venue | 255 characters |

### 1.2 File Upload Limits

| Constraint | Value |
|-----------|-------|
| Max attachments | 3 files |
| Max photos | 12 photos |
| Max cover photos | 3 |
| Max file size | 5 MB |
| Attachment extensions | `.pdf, .csv, .docx, .xlsx, .xls, .pptx, .jpg, .jpeg, .gif, .png, .mp3, .mp4, .m4v` |
| Photo extensions | `.jpg, .jpeg, .png` |

### 1.3 Custom Questions

| Constraint | Value |
|-----------|-------|
| Max questions per form | 5 |
| Min choices (selection types) | 2 |
| Max choices (selection types) | 7 |

### 1.4 Other

| Constraint | Value |
|-----------|-------|
| Max web links | 3 |
| Schedule min delay | 5 minutes from now |
| Schedule max delay | 21 days (configurable via `SCHEDULE_POST_MAX_NUM_DAYS` env) |
| Schedule interval | 5-minute intervals only |

---

## 2. Business Logic Rules

### 2.1 Response Type Rules

| Rule | Detail |
|------|--------|
| Custom questions | Only valid when `responseType === 'YES_NO'` |
| Custom question replies | Mandatory when reply is `YES` and questions exist |
| Custom question replies | Must be null/omitted when reply is `NO` |
| Acknowledgement | Only `YES` is valid (no `NO` option) |
| Reminder banner | Only shown for YES_NO forms: "Custodians may edit their responses till the due date." |

### 2.2 Status Model

**Backend** (`EResourceStatus`): `DRAFT`, `POSTED`, `SCHEDULED`, `POSTING`

**Frontend display** (`EConsentFormAPIResponseStatus`):
| Display Status | Derived From |
|----------------|-------------|
| `DRAFT` | EResourceStatus.DRAFT |
| `OPEN` | POSTED where `consentByDate` > today |
| `CLOSED` | POSTED where `consentByDate` <= today |
| `SCHEDULED` | EResourceStatus.SCHEDULED |
| `POSTING` | EResourceStatus.POSTING |

### 2.3 Response Editing Restrictions

| Condition | Staff can edit? |
|-----------|----------------|
| YES_NO, custodian onboarded, BEFORE due date | **No** |
| YES_NO, custodian onboarded, AFTER due date | Yes |
| YES_NO, custodian NOT onboarded | Yes (anytime) |
| ACKNOWLEDGEMENT form | Yes (anytime, only YES valid) |

### 2.4 Access Control

| Action | Creator | Staff-in-Charge | School Admin |
|--------|---------|-----------------|--------------|
| View form details | Yes | Yes | Yes |
| View responses | Yes | Yes | Yes |
| Edit student response | Yes | No | No |
| Add staff-in-charge | Yes | No | No |
| Remove self as staff | N/A | Yes | N/A |
| Edit enquiry email | Yes | No | No |
| Edit due date | Yes | No | No |
| Delete form | Yes | No | Yes |
| Duplicate posted form | Yes | Yes | No |
| Edit/delete draft | Yes | No | No |

### 2.5 School Type Variants

**IHL (Institute of Higher Learning):**
- In-app shortcuts field hidden entirely
- Response table: "IHL Class" and "Student ID" (UIN/FIN) instead of "Class/Index"

**SPED (Special Education):**
- Excludes shortcut: `EDIT_CONTACT_DETAILS`
- Other shortcuts (e.g. `DECLARE_TRAVELS`) remain available

### 2.6 Scheduling Rules

| Rule | Detail |
|------|--------|
| Scheduled time | Must be future (min 5 minutes), at 5-minute intervals |
| Max window | 21 days (configurable) |
| Group resolution | Targets resolved at SEND time, not schedule time |
| Pre-send reminder | Sent to creator unless scheduled <24h from now |
| Must be before | Event start, event end, due date, and reminder date |
| Cancel | Reverts to DRAFT, records `cancelledBy`/`cancelledAt` |
| Failure | `scheduledSendFailureCode` set on draft if send fails |

### 2.7 Optimistic Concurrency

- Draft updates: `updatedAt` from previous response must match DB value → 409 on mismatch
- Enquiry email: `prevEnquiryEmailAddress` must match current value → 409 on mismatch

### 2.8 Auto-Save

**Trigger**: Fires when `autoSaveStates === TRIGGER` AND form is dirty.

**Pre-conditions** (all must be non-empty):
1. enquiryEmailAddress
2. title
3. content (plain text extracted from rich text)
4. selectedIndividualStudentGroups (at least one)
5. responseType
6. consentByDate
7. For scheduled: both `scheduledDateTime.date` and `.time`

**Header**: `pg-no-extend: ''` prevents session extension during auto-save.

**States**: `PENDING` → `TRIGGER` → `SUCCESS` | `FAILED`

### 2.9 Navigation Prevention

- Triggers when `isDirtyState && !isPosting`
- Message: "You are about to leave this page. Any unsaved changes will be lost."
- Uses `useUnloadEvent` hook for browser close/refresh

### 2.10 Duplicate Behavior

**Copied**: Title, description, rich text, venue, web links, shortcuts, photos, attachments, response type, custom questions, event dates, due date, reminder settings, staff-in-charge, target groups.

**NOT copied**: Student responses, posted date, audit/history records.

### 2.11 Soft Delete

Sets `isDeleted: true` on: consent form, owners, targets, audit records, URLs, shortcuts. Records stay in DB.

---

## 3. Validation Rules

### 3.1 Required for Publishing

1. Recipients (at least one student group)
2. Enquiry email address (valid format)
3. Title (non-empty, max 120 chars)
4. Description (non-empty, max 2000 chars, valid rich text JSON)
5. Response type (`YES_NO` or `ACKNOWLEDGEMENT`)
6. Due date (today or future)

### 3.2 Field Validation

| Field | Rule |
|-------|------|
| Title | Non-empty, max 120 chars. Error: "Exceeded by X characters" |
| Description | Non-empty plain text, max 2000 chars, valid JSON schema |
| Due date | Today or future. Error: "Please enter a valid date from today onwards." |
| Reminder date | Must be before or equal to due date |
| Event dates | If one is set, both must be valid. No past-date restriction |
| Schedule date | Future (5 min+), within 21 days, 5-min interval, before event/due/reminder dates. Error: "Please enter a valid date before {labels}" |
| Web links | `isValidLink` (URL format), `isSafeLink` (safety), `isMimeSafeLink` (MIME) |
| Enquiry email | Valid email format |
| Attachments | Valid non-expired token, size <= 5MB, accepted extension |
| Photos | Valid non-expired token, accepted extension (jpg/jpeg/png) |
| Question title | Non-empty, max 120 chars |
| Question choices | Min 2, max 7, no duplicates (case-insensitive, trimmed), each max 120 chars |

### 3.3 Draft Save Blocking

Save is blocked ONLY when:
- Title exceeds 120 characters
- Description exceeds 2000 characters
- Schedule date/time is incomplete (only date OR only time filled)

All other fields can be empty/partial for draft save.

### 3.4 Edit Response Validation

| Field | Rule |
|-------|------|
| consentType | Required: `YES` or `NO` (YES_NO) or `YES` (Acknowledgement) |
| remarks | Optional, max 500 chars |
| Custom replies | Required when `YES` AND form has questions |
| Text answers | Required for `text` type when reply is YES |
| Single selection | Exactly 1 valid choice ID |
| Multi selection | >= 1 valid choice IDs |

---

## 4. Functional Behavior

### 4.1 Create/Edit Form — Field Order

1. Recipients (Parents) — student group combo box
2. Recipients (School Staff) — staff group combo box
3. Enquiry Email — selector: staff email / school email / custom
4. Title — text input with 120 char counter
5. Description — rich text editor with 2000 char counter
6. In-App Shortcuts — multi-select checkboxes (hidden for IHL)
7. Website Links — up to 3 (URL + description each)
8. File Attachments — upload up to 3 (5MB each)
9. Photo Gallery — upload up to 12 (max 3 cover)
10. Event Start Date/Time
11. Event End Date/Time
12. Venue — text input
13. Response Type — YES_NO or ACKNOWLEDGEMENT
14. Custom Questions — dynamic list (only for YES_NO)
15. Due Date — date picker (today or future)
16. Reminders — type selector + date
17. Schedule Post — optional date/time picker

### 4.2 List Page — Created by You

**Columns**: Title, Date, Status, To Parents Of, # Responded (progress bar)

**Actions per status**:
| Status | Actions |
|--------|---------|
| DRAFT | Edit, Delete, Duplicate |
| SCHEDULED | Reschedule, Cancel send |
| POSTING | (none) |
| OPEN | Duplicate |
| CLOSED | Duplicate |

### 4.3 List Page — Shared with You

**Columns**: Title, Date, Status, Created By, To Parents Of, # Responded

**Actions**: Duplicate only (OPEN/CLOSED)

### 4.4 List Page — School Admin

All posted forms in school. Actions: View details, Delete.

### 4.5 Details Page — Responses Tab

**Summary Stats** (clickable to filter table):
- YES_NO: Total, Yes, No, Pending
- ACKNOWLEDGEMENT: Total, Yes, Pending

**Filters**:
- Status: All, Onboarded, Not Onboarded, Inactive, Left School
- Class: Sorted list (No Class Allocated first, Left School last, Pre-P1 first)
- Reply: All, Yes, No, Pending
- Columns: Multi-select toggle visibility

**Table Columns**:
| Column | Standard | IHL Variant |
|--------|----------|-------------|
| Name + Edit link | Always shown | Same |
| Class/Index | Class, index number | Class only |
| IHL Student ID | N/A | UIN/FIN |
| Gender | M/F | M/F |
| Response | Yes/No/Pending | Same |
| Custom Questions (1..N) | Dynamic per question | Same |
| Comments | Remarks | Same |
| Last Responded By | Identity, Name, Contact | Same |
| Last Responded On | Date/time | Same |
| Status | Onboarded/Not Onboarded | Same |

**Custom Question Columns**: Only populated when response is YES. Multi-selection values joined with semicolons.

**Last Responded By**: Custodian shows (Relationship, Name, Phone). Staff shows ("Teacher", Name, Email). Multiple edits show "View more" → Reply Audit modal (reverse chronological, "Submitted" then "Edited" labels).

### 4.6 Details Page — Details Tab

Sections in order:
1. Posting details: "Posted on [Date] by [Staff Name]"
2. Staff-in-charge: Creator first, others listed, "Add" button (creator only)
3. Enquiry email + "Edit" button (creator only)
4. Description (rich text / plain text)
5. Shortcuts with icons
6. Venue
7. Web links with descriptions
8. Attachments with download links
9. Photo gallery
10. Type of response + description text
11. Custom questions (numbered, with choices listed)
12. Response due date and reminders + edit history
13. View history (expandable accordion)
14. OTHER ACTIONS: Duplicate, Delete (with disclaimer checkbox)

### 4.7 Export to Excel

- Desktop only (hidden on mobile)
- Exports only visible/selected columns
- File name: form title with special chars → dashes
- Names prefixed with apostrophe for Excel text preservation
- Custom questions exported only for YES answers
- Multi-selection joined with semicolons
- Pending responses show "No response"

### 4.8 Post Flow

1. Preview → Confirmation modal (title + target student count)
2. API call → If rescan needed, poll `GET /drafts/:id`
3. When `postedConsentFormId` is set → post complete
4. Redirect to list + success notification + WOGAA transaction (prod only)

### 4.9 Reschedule/Cancel from List

**Reschedule**: Opens date/time picker modal. Shows event dates, due date, reminder for reference. Validates same as initial schedule.

**Cancel**: Confirmation: "Cancel sending this post? Once cancelled, the post will be moved to Drafts." → Reverts to DRAFT.

### 4.10 Edit Due Date Flow

1. Opens overlay with: new due date picker, reminder type selector, reminder date
2. Displays event date range for reference
3. Confirmation: "Confirm New Due Date?" showing old → new date
4. Note: "Notifications will now be sent to parents who have not responded."
5. Creates audit history record

### 4.11 Edit Enquiry Email Flow

1. Opens overlay with: email selector (staff email / school email / other)
2. Confirmation: "Confirm Enquiry Email?" showing current email
3. Uses `prevEnquiryEmailAddress` for concurrency

### 4.12 Add/Remove Staff-in-Charge

**Add**: Creator opens overlay → selects staff (excludes self) → success notification.

**Remove self**: Staff-in-charge clicks remove → confirmation → redirects to list.

### 4.13 Delete Form

1. Disclaimer checkbox: "I am sure I want to delete this form."
2. Delete button enabled only after checkbox checked
3. Confirmation modal
4. Soft delete → redirect to list + success notification

### 4.14 Analytics Events (WOGAA)

| Event | Trigger |
|-------|---------|
| FormPreviewButtonPressed | Preview clicked |
| FormPostButtonPressed | Post clicked |
| FormCreated | Successful creation |
| SchedulePostFormButtonClick | Schedule clicked |
| SchedulePostFormCreated | Successful schedule |
| SchedulePostFormCancelled | Schedule cancelled |
| FormBackButtonPressed | Back/cancel |
| DueDateTooltipPressed | Due date tooltip |
| ReminderTooltipPressed | Reminder tooltip |
| ExportToExcelButtonPressed | Export clicked |
| EditEnquiryEmailButtonPressed | Edit email |
| EditDueDateButtonPressed | Edit due date |
| AddStaffButtonPressed | Add staff |
| DuplicatePostCreateDetailsPressed | Duplicate from details |
| FormDeleted | Form deleted |
| ChangeResponseAuditLogViewed | Audit modal opened |

WOGAA: `window.wogaaCustom`, production only. Schedule uses transactional tracking (start on click, complete on success with UUID).

---

## 5. API Contracts

### Base

- **Base URL**: `/api/v2`
- **Staff**: `/api/v2/staff/consentForms`
- **Admin**: `/api/v2/schoolAdmins/consentForms`
- **Auth**: SchoolStaffSessionMiddleware (staff), SchoolStaffSessionMiddleware with `accessControlScope: 'Admin'` (admin)
- **Auto-save header**: `pg-no-extend: ''`

### Response Wrapper (all endpoints)

```typescript
{ resultCode: number; message: string; body: T; metadata?: Record<string, any> }
```

---

### 5.1 POST `/staff/consentForms` — Publish

**Rate Limited**: Yes.

**Request**:
```typescript
{
  consentFormDraftId?: number;
  title: string;
  content: Record<string, any>;
  enquiryEmailAddress: string;
  targets: Array<{ targetType: 'CLASS'|'LEVEL'|'SCHOOL'|'CCA'|'GROUP'; targetId: number; targetAcadYear?: string }>;
  consentByDate: string;
  responseType: 'YES_NO' | 'ACKNOWLEDGEMENT';
  addReminderType: 'NONE' | 'ONE_TIME' | 'DAILY';
  reminderDate?: string;
  startDateTime?: string;
  endDateTime?: string;
  venue?: string;
  staffInCharge: number[];
  customQuestions?: Array<{ title: string; description: string; type: 'text'|'single_selection'|'multi_selection'; properties?: { choices: Array<{ id: string; label: string }> } }>;
  webLinkList: Array<{ webLink: string; linkDescription: string }>;
  inAppShortcutLink?: string[];
  photos: Array<{ fileToken: string; isCover: boolean }>;
  attachments: Array<{ fileToken: string }>;
}
```

**Response**: `{ body: { consentForm: { id: number; ... } } }` OR `{ body: number }` (draft ID needing file rescan)

---

### 5.2 POST `/staff/consentForms/drafts` — Create Draft

**Request** (`TConsentFormDraftRequestBody`):
```typescript
{
  title?: string;
  content?: Record<string, any> | string;
  venue?: string;
  addReminderType?: 'NONE'|'ONE_TIME'|'DAILY'|'';
  enquiryEmailAddress?: string;
  consentByDate?: string;
  reminderDate?: string;
  eventStartDate?: { date: string; time: string } | null;
  eventEndDate?: { date: string; time: string } | null;
  responseType?: 'YES_NO'|'ACKNOWLEDGEMENT'|'';
  questions?: Array<{ id?: string; title: string; description: string; type: 'text'|'single_selection'|'multi_selection'; properties?: { choices: Array<{ id?: string; label: string }> } }>;
  studentGroups?: Array<{ type: string; label: string; value: string|number }>;
  staffGroups?: Array<{ type: string; label: string; value: string|number }>;
  images?: Array<{ fileToken: string; isCover: boolean }>;
  attachments?: Array<{ fileToken: string }>;
  urls?: Array<{ webLink: string; linkDescription: string }>;
  shortcuts?: string[];
  scheduledDateTime?: null;
  status?: 'DRAFT';
}
```

**Response**: `{ body: { consentFormDraftId: number; updatedAt: string } }`

---

### 5.3 PUT `/staff/consentForms/drafts/:consentFormDraftId` — Update Draft

**Request**: Same as 5.2.

**Response**: `{ body: { updatedAt: string } }`

---

### 5.4 GET `/staff/consentForms/drafts/:consentFormDraftId` — Get Draft

**Response**:
```typescript
{
  body: [{
    consentFormDraftId: number;
    status: 'DRAFT' | 'SCHEDULED' | 'POSTING';
    postedConsentFormId: number | null;
    studentGroups: Array<{ type: string; label: string; value: string }>;
    staffGroups: Array<{ type: string; label: string; value: string }>;
    title: string;
    content: string | null;
    richTextContent: Record<string, any> | null;
    enquiryEmailAddress: string;
    urls: Array<{ webLink: string; linkDescription: string }>;
    shortcuts: string[];
    attachments: Array<{ fileToken: string; name: string; size: number; status: 'success'|'failed'|'expired' }>;
    images: { images: Array<{ fileToken: string; name: string; size: number; isCover: boolean; status: 'success'|'failed'|'expired' }>; imagesOrigin: string };
    responseType: 'YES_NO' | 'ACKNOWLEDGEMENT' | '';
    questions: Array<{ id: string; title: string; description: string; type: 'text'|'single_selection'|'multi_selection'; properties?: { choices: Array<{ id: string; label: string }> } }>;
    eventStartDate: { date: string; time: string } | null;
    eventEndDate: { date: string; time: string } | null;
    venue: string;
    consentByDate: string;
    addReminderType: 'NONE' | 'ONE_TIME' | 'DAILY' | '';
    reminderDate: string;
    updatedAt: string;
    pgSchoolId: number;
    createdBy: number;
    scheduledDateTime: Date | null;
    cancelledBy: number | null;
    cancelledAt: string | null;
  }]
}
```

**Post-status polling** (same endpoint, when checking if publish completed):
```typescript
{ body: [{ consentFormDraftId: number; status: 'POSTING'|'POSTED'; postedConsentFormId: number|null; attachments: [...]; images: [...] }] }
```

---

### 5.5 DELETE `/staff/consentForms/drafts/:consentFormDraftId` — Delete Draft

**Response**: Standard success.

---

### 5.6 POST `/staff/consentForms/drafts/duplicate` — Duplicate Draft

**Request**: `{ consentFormDraftId: number }`

**Response**: `{ body: { consentFormDraftId: number; updatedAt: string } }`

---

### 5.7 POST `/staff/consentForms/duplicate` — Duplicate Posted Form

**Request**: `{ consentFormId: number }`

**Response**: `{ body: { consentFormDraftId: number; updatedAt: string } }`

---

### 5.8 POST `/staff/consentForms/drafts/schedule` — Schedule New

**Request**: Same as 5.2 with mandatory `scheduledDateTime: Date`.

**Response**: `{ body: { consentFormDraftId: number; updatedAt: string } }`

---

### 5.9 PUT `/staff/consentForms/drafts/schedule/:consentFormDraftId` — Update Scheduled

**Request**: Same as 5.8.

**Response**: Same as 5.8.

---

### 5.10 PUT `/staff/consentForms/drafts/:consentFormDraftId/rescheduleSchedule` — Reschedule

**Request**: `{ scheduledDateTime: Date }`

**Response**: `{ body: { updatedAt: string } }`

---

### 5.11 POST `/staff/consentForms/drafts/:consentFormDraftId/cancelSchedule` — Cancel

**Request**: None.

**Response**: Standard success (`IPgApiResponse<boolean>`).

---

### 5.12 GET `/staff/consentForms` — List Created by You

**Response**:
```typescript
{
  body: Array<{
    id: string; postId: number; title: string; date: Date;
    eventStartDate: { date: string; time: string } | null;
    eventEndDate: { date: string; time: string } | null;
    consentByDate: Date | null;
    eventReminderDate: Date | null;
    status: 'DRAFT'|'OPEN'|'CLOSED'|'SCHEDULED'|'POSTING';
    toParentsOf: string[];
    respondedMetrics: { respondedPerStudent: number; totalStudents: number };
    scheduledSendFailureCode: string | null;
  }>
}
```

---

### 5.13 GET `/staff/consentForms/shared` — List Shared with You

**Response**:
```typescript
{
  body: Array<{
    id: string; postId: number; title: string; date: Date;
    status: 'OPEN' | 'CLOSED';
    createdByName: string;
    toParentsOf: string[];
    respondedMetrics: { respondedPerStudent: number; totalStudents: number };
  }>
}
```

---

### 5.14 GET `/staff/consentForms/:consentFormId` — Get Posted Form Details

**Response**:
```typescript
{
  body: [{
    consentFormId: number;
    title: string;
    venue: string | null;
    content: string;
    richTextContent: Record<string, any> | null;
    responseType: 'YES_NO' | 'ACKNOWLEDGEMENT';
    eventStartDate: Date | null;
    eventEndDate: Date | null;
    consentByDate: Date;
    addReminderType: string | null;
    reminderDate: Date | null;
    postedDate: Date;
    enquiryEmailAddress: string;
    fileName: string | null;
    fileSize: number | null;
    staffName: string;
    createdBy: number;
    createdAt: Date;
    webLinkList: Array<{ webLink: string; linkDescription: string | null }>;
    shortcutLinkList: Array<{ shortcutName: string }>;
    targets: Array<{ consentFormId: number; targetSchool: number; targetType: string; targetAcadYear: string|null; targetId: number; targetName: string }>;
    staffOwners: Array<{ staffName: string; staffID: number }>;
    images: Array<{ imageId: number; size: number; name: string; url: string; thumbnailUrl: string; expiryDate?: string; isCover: boolean }>;
    consentFormRecipients: Array<{
      consentFormId: number;
      studentId: number;
      reply: 'YES' | 'NO' | null;
      replyByParent: number | null;
      replyDate: Date | null;
      remarks: string | null;
      staff: { staffEmailAddress: string; staffName: string } | null;
      parent: { parentId: number; parentName: string; phone: string; relationship: string|null } | null;
      student: { studentId: number; studentName: string; indexNumber: string; className: string; studentSex: string; uinFinNo: string };
      customQuestionReply: Array<{ customQuestionId: string; answer: { text?: string; choice?: string; choices?: string[] } }> | null;
      replyAppVersion: string | null;
      onBoardedCategory: 'Onboarded' | 'Not Onboarded';
      replyAudit: Array<
        { type: 'custodian'; id: number; updatedAt: Date; name: string|null; phone: string|null; relationship: string|null }
        | { type: 'staff'; id: number; name: string|null; updatedAt: Date; email: string|null }
      > | null;
    }>;
    customQuestions: Array<{ id: string; title: string; description: string; type: 'text'|'single_selection'|'multi_selection'; properties?: { choices: Array<{ id: string; label: string }> } }> | null;
    consentFormHistory: Array<{ id: number; auditField: object|null; auditType: 'CREATE_CONSENT_FORM'|'UPDATE_DUE_DATE'|'DELETE_CONSENT_FORM'; createdBy: number; createdAt: Date; staff: { staffName: string } }>;
    attachments?: Array<{ name: string; size: number; sequence: number; downloadUrl: string }>;
  }]
}
```

---

### 5.15 PUT `/staff/consentForms/:consentFormId/student/:studentId/reply` — Edit Response

**Request**:
```typescript
{
  consentType: 'YES' | 'NO';
  remarks?: string | null;
  customQuestionReply?: Array<{ customQuestionId: string; answer: { text?: string; choice?: string; choices?: string[] } }> | null;
}
```

**Response**: Updated consent form details.

---

### 5.16 DELETE `/staff/consentForms/:consentFormId` — Delete Posted Form

**Response**: Standard success.

---

### 5.17 POST `/staff/consentForms/:consentFormId/addStaffInCharge` — Add Staff

**Request**: `{ staffIDs: number[] }`

**Response**: Standard success.

---

### 5.18 PUT `/staff/consentForms/:consentFormId/removeAccess` — Remove Self

**Request**: None.

**Response**: Standard success.

---

### 5.19 PUT `/staff/consentForms/:consentFormId/updateEnquiryEmail` — Update Email

**Request**:
```typescript
{ enquiryEmailAddress: string; prevEnquiryEmailAddress: string }
```

**Response**: Standard success.

---

### 5.20 PUT `/staff/consentForms/:consentFormId/updateDueDate` — Update Due Date

**Request**:
```typescript
{ consentByDate: Date; eventReminderDate?: Date|null; addReminderType: 'NONE'|'ONE_TIME'|'DAILY' }
```

**Response**: Standard success. Creates audit record `auditType: 'UPDATE_DUE_DATE'`.

---

### 5.21 GET `/schoolAdmins/consentForms` — Admin List (Legacy)

**Response**: Array of summary data.

---

### 5.22 GET `/schoolAdmins/r12/consentForms` — Admin List (Current)

**Response**:
```typescript
{
  body: Array<{
    id: string; postId: number; title: string; date: Date;
    status: 'OPEN' | 'CLOSED';
    createdByName: string; toParentsOf: string[];
    respondedMetrics: { respondedPerStudent: number; totalStudents: number };
  }>
}
```

---

### 5.23 GET `/schoolAdmins/consentForms/:consentFormId` — Admin Get Details

**Response**: Same shape as 5.14.

---

### 5.24 DELETE `/schoolAdmins/consentForms/:consentFormId` — Admin Delete

**Response**: Standard success.

---

## 6. Error Handling

### 6.1 Server Error Messages

| Key | Message |
|-----|---------|
| invalidDates | Consent Form end date must be after start date |
| dateBeforeToday | Consent Form date must be today or later |
| invalidTargetAcadYear | Consent Form targets are invalid, wrong academic year detected |
| noTargetAccess | Consent Form targets are not accessible by this staff |
| notExists | Consent Form is not found |
| unauthorised | Unauthorised access of Consent Form |
| invalidSchema | Field has failed schema check |
| noAccess | No access to Consent Form |
| noEditingBeforeDueDate | Editing Consent Form responses is not allowed before the due date |
| noConsentByDate | Consent by date is not found |
| noConsentFormStudent | Consent form student is not found |
| noConsentFormRecipient | Consent form recipient is not found |
| CUSTOM_QUESTIONS.lengthMismatch | Number of custom questions does not match |
| CUSTOM_QUESTIONS.idMismatch | Custom question id does not match |
| CUSTOM_QUESTIONS.choiceMismatch | Custom question choice does not match |
| dateAt5MinuteInterval | Date must be at 5-minute interval |
| atLeast5MinutesFromNow | Date must be at least 5 minutes from now |

### 6.2 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Validation error |
| 401 | Unauthorized (session expired) |
| 403 | Forbidden (insufficient permission) |
| 404 | Not found |
| 409 | Conflict (stale updatedAt / concurrent edit) |
| 429 | Rate limited |
| 500 | Internal error |
