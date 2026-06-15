# Announcements - Complete Redevelopment Spec (Staff & Admin)

**Created**: 2026-06-09
**Purpose**: Comprehensive reference for frontend redevelopment — business logic, validation, functional behavior, and API contracts.

---

## 1. Constants & Constraints

### 1.1 Character Limits

| Field | Max Length |
|-------|-----------|
| Title | 120 characters |
| Description (rich text) | 2,000 characters (plain text count) |
| Enquiry email | 250 characters |
| Message to Schools (HQ only) | 2,500 characters |

### 1.2 File Upload Limits

| Constraint | Value |
|-----------|-------|
| Max attachments | 3 files |
| Max photos | 12 photos |
| Max cover photos | 3 |
| Max file size | 5 MB |
| Attachment extensions | `.pdf, .csv, .docx, .xlsx, .xls, .pptx, .jpg, .jpeg, .gif, .png, .mp3, .mp4, .m4v` |
| Photo extensions | `.jpg, .jpeg, .png` |

### 1.3 Other

| Constraint | Value |
|-----------|-------|
| Max web links | 3 |
| Schedule min delay | 5 minutes from now |
| Schedule max delay | 21 days (configurable via `SCHEDULE_POST_MAX_NUM_DAYS` env) |
| Schedule interval | 5-minute intervals only |

---

## 2. Business Logic Rules

### 2.1 Status Model

**Backend** (`EResourceStatus`): `DRAFT`, `POSTED`, `SCHEDULED`, `POSTING`

**Frontend display** (`EAnnouncementAPIResponseStatus`):
| Display Status | Derived From |
|----------------|-------------|
| `DRAFT` | EResourceStatus.DRAFT |
| `OPEN` | POSTED (always OPEN for announcements — no due date) |
| `SCHEDULED` | EResourceStatus.SCHEDULED |
| `POSTING` | EResourceStatus.POSTING |

### 2.2 Access Control

| Action | Creator | Staff-in-Charge | School Admin |
|--------|---------|-----------------|--------------|
| View details | Yes | Yes | Yes |
| View read status | Yes | Yes | Yes |
| Add staff-in-charge | Yes | No | No |
| Remove self as staff | N/A | Yes | N/A |
| Edit enquiry email | Yes | No | No |
| Delete announcement | Yes | Yes | Yes |
| Duplicate | Yes | Yes | No |
| Edit/delete draft | Yes | No | No |

### 2.3 School Type Variants

**IHL (Institute of Higher Learning):**
- In-app shortcuts field hidden entirely

**SPED (Special Education):**
- Excludes shortcut: `EDIT_CONTACT_DETAILS`
- Other shortcuts (e.g. `DECLARE_TRAVELS`) remain available

### 2.4 Scheduling Rules

| Rule | Detail |
|------|--------|
| Scheduled time | Must be future (min 5 minutes), at 5-minute intervals |
| Max window | 21 days (configurable) |
| Group resolution | Targets resolved at SEND time, not schedule time |
| Cancel | Reverts to DRAFT |
| Failure codes | `INVALID_CREATOR`, `INVALID_FILE`, `INVALID_IMAGE`, `INVALID_RECIPIENT`, `UNEXPECTED_ERROR` |

### 2.5 Optimistic Concurrency

- Draft updates: `updatedAt` from previous response must match DB value
- Enquiry email: `prevEnquiryEmailAddress` must match current value

### 2.6 Auto-Save

**Trigger**: Fires when `autoSaveStates === TRIGGER` AND form is dirty.

**Pre-conditions** (all must be non-empty):
1. enquiryEmailAddress
2. title
3. content (plain text extracted from rich text)
4. selectedIndividualStudentGroups (at least one)
5. For scheduled: both `scheduledDateTime.date` and `.time`

**Header**: `pg-no-extend: ''` prevents session extension during auto-save.

**States**: `PENDING` → `TRIGGER` → `SUCCESS` | `FAILED`

### 2.7 Navigation Prevention

- Triggers when `isDirtyState && !isPosting`
- Browser unload event handler via `useUnloadEvent`

### 2.8 Duplicate Behavior

**Copied**: Title, description, rich text, enquiry email, web links, shortcuts, photos, attachments, staff-in-charge, target groups.

**NOT copied**: Read receipts, posted date, audit records.

### 2.9 Soft Delete

Sets `isDeleted: true`. Records remain in DB.

### 2.10 Prefilled Announcements

- Staff can create announcements from a platform-provided template
- Accessed via `/announcements/prefilled/:id`
- Pre-populates form fields including students/staff targets
- Validates recipients before populating (shows error for invalid)

---

## 3. Validation Rules

### 3.1 Required for Publishing

1. Recipients (at least one student group)
2. Enquiry email address (valid format)
3. Title (non-empty, max 120 chars)
4. Description (non-empty, max 2000 chars, valid rich text JSON)

### 3.2 Field Validation

| Field | Rule |
|-------|------|
| Title | Non-empty, max 120 chars |
| Description | Non-empty plain text, max 2000 chars, valid JSON schema |
| Enquiry email | Valid email format, max 250 chars |
| Web links | `isValidLink` (URL format), `isSafeLink` (safety), `isMimeSafeLink` (MIME) |
| Attachments | Valid non-expired token, size <= 5MB, accepted extension |
| Photos | Valid non-expired token, accepted extension (jpg/jpeg/png) |
| Schedule date | Future (5 min+), within 21 days, 5-min interval |

### 3.3 Draft Save Blocking

Save is blocked ONLY when:
- Title exceeds 120 characters
- Description exceeds 2000 characters
- Schedule date/time is incomplete (only date OR only time filled)

All other fields can be empty/partial for draft save.

### 3.4 Rich Text Validation

- `isValidSchema()`: Validates JSON structure
- `JsonToCharacterCount()`: Extracts plain text char count
- `JsonToPlainText()`: Converts for counting
- Server rejects: `exceedRichTextLimit` (>2000 chars), `invalidRichTextSchema` (bad JSON)

---

## 4. Functional Behavior

### 4.1 Create/Edit Form — Field Order

1. Recipients (Parents) — student group combo box
2. Recipients (School Staff) — staff group combo box (staff-in-charge)
3. Enquiry Email — selector: staff email / school email / custom
4. Title — text input with 120 char counter
5. Description — rich text editor with 2000 char counter
6. In-App Shortcuts — multi-select checkboxes (hidden for IHL)
7. Website Links — up to 3 (URL + description each)
8. File Attachments — upload up to 3 (5MB each)
9. Photo Gallery — upload up to 12 (max 3 cover)
10. Schedule Post — optional date/time picker

### 4.2 List Page — Created by You

**Columns**: Title, Date, Status, To Parents Of, Read Metrics

**Actions per status**:
| Status | Actions |
|--------|---------|
| DRAFT | Edit, Delete, Duplicate |
| SCHEDULED | Reschedule, Cancel send |
| POSTING | (none) |
| OPEN | Duplicate, Delete |

### 4.3 List Page — Shared with You

**Columns**: Title, Date, Status, Created By, To Parents Of, Read Metrics

**Actions**: Duplicate, Delete (if co-owner)

### 4.4 List Page — School Admin

All posted announcements in school. Actions: View details, Delete.

### 4.5 Details Page — Read Status Tab

**Summary**: Total recipients, Read count, Unread count

**Table Columns**:
- Student Name
- Parent/Guardian Name
- Read Date
- Read Status (Read/Unread/Onboarded status)

**Export to Excel**: Available (desktop only)

### 4.6 Details Page — Details Tab

Sections in order:
1. Posted on [Date] by [Staff Name]
2. Staff-in-charge list + "Add" button (creator only)
3. Enquiry email + "Edit" button (creator only)
4. Description (rich text / plain text)
5. Shortcuts with icons
6. Web links with descriptions
7. Attachments with download links
8. Photo gallery
9. OTHER ACTIONS: Duplicate, Delete

### 4.7 Post Flow

1. Preview → Confirmation modal (title + target student count)
2. API call → If rescan needed, poll draft endpoint
3. Redirect to list + success notification

### 4.8 Reschedule/Cancel from List

**Reschedule**: Opens date/time picker. Validates same as initial schedule.

**Cancel**: Confirmation modal → reverts to DRAFT.

### 4.9 Edit Enquiry Email

1. Overlay with selector (staff email / school email / custom)
2. Confirmation modal
3. Uses `prevEnquiryEmailAddress` for concurrency

### 4.10 Add/Remove Staff-in-Charge

**Add**: Creator opens overlay → selects staff → success notification.

**Remove self**: Staff-in-charge clicks remove → confirmation → redirects to list.

### 4.11 Delete

- Confirmation modal required
- Soft delete
- Redirect to list + success notification

### 4.12 Analytics Events (WOGAA)

| Event | Trigger |
|-------|---------|
| NewAnnouncementButtonPressed | Create button clicked |
| AnnouncementViewed | Detail page loaded |
| AnnouncementReadStatusTabPressed | Read status tab |
| AnnouncementDetailsTabPressed | Details tab |
| DuplicatePostCreateDetailsPressed | Duplicate from details |
| DuplicatePostCreateListingPressed | Duplicate from list |
| DuplicatePostSuccess | Duplicate succeeded |
| DuplicatePostFailure | Duplicate failed |
| AnnouncementDeleted | Deletion completed |
| StaffInChargeTooltipPressed | Tooltip viewed |
| ExportToExcelButtonPressed | Export clicked |
| DeleteAnnouncementButtonPressed | Delete button clicked |
| SchedulePostAnnouncementCancelled | Schedule cancelled |

---

## 5. API Contracts

### Base

- **Base URL**: `/api/v2`
- **Staff**: `/api/v2/staff/announcements`
- **Admin**: `/api/v2/schoolAdmins/announcements`
- **Auth**: SchoolStaffSessionMiddleware (staff), with `accessControlScope: 'Admin'` (admin)
- **Rate Limit**: 250 requests per 60 minutes (staff), 20 per 24h (HQ)
- **Auto-save header**: `pg-no-extend: ''`

### Response Wrapper (all endpoints)

```typescript
{ resultCode: number; message: string; body: T; metadata?: Record<string, any> }
```

---

### 5.1 POST `/staff/announcements` — Publish

**Rate Limited**: Yes.

**Request**:
```typescript
{
  announcementDraftId?: number;
  title: string;
  content: Record<string, any>;         // Rich text JSON
  enquiryEmailAddress: string;
  staffInCharge?: number[];
  targets: Array<{ targetType: 'CLASS'|'LEVEL'|'SCHOOL'|'CCA'|'GROUP'; targetId: number }>;
  webLinkList?: Array<{ webLink: string; linkDescription: string }>;
  photos?: Array<{ fileToken: string; isCover: boolean }>;
  attachments?: Array<{ fileToken: string }>;
  inAppShortcutLink?: string[];
}
```

**Response**:
```typescript
{
  body: {
    announcement: {
      id: number;
      title: string;
      content: string;
      enquiryEmailAddress: string;
      staffInCharge: number[];
      targets: Array<{ targetId: number; targetType: string; targetSchool: number; targetAcadYear: string; groupId: number }>;
      webLinkList: Array<{ webLink: string; linkDescription: string }>;
      createdBy: string;
      inAppShortcutLink: string[];
      owners: Array<{ staffId: number }>;
    };
  }
}
```

OR `{ body: number }` (draft ID needing file rescan)

---

### 5.2 POST `/staff/announcements/drafts` — Create Draft

**Request** (`TAnnouncementDraftRequestBody`):
```typescript
{
  title?: string;
  content?: string | null;
  richTextContent?: Record<string, any> | null;
  enquiryEmailAddress?: string;
  urls?: Array<{ webLink: string; linkDescription: string }>;
  shortcuts?: string[];
  attachments?: Array<{ fileToken: string }>;
  images?: { images: Array<{ fileToken: string; isCover: boolean }>; imagesOrigin: string };
  studentGroups?: Array<{ type: string; label: string; value: string|number }>;
  staffGroups?: Array<{ type: string; label: string; value: string|number }>;
  scheduledDateTime?: Date | null;
}
```

**Response**: `{ body: { announcementDraftId: number; updatedAt: string } }`

---

### 5.3 PUT `/staff/announcements/drafts/:announcementDraftId` — Update Draft

**Request**: Same as 5.2.

**Response**: `{ body: { announcementDraftId: number; updatedAt: string } }`

---

### 5.4 GET `/staff/announcements/drafts/:announcementDraftId` — Get Draft

**Response**:
```typescript
{
  body: [{
    announcementDraftId: number;
    status: 'DRAFT' | 'SCHEDULED' | 'POSTING';
    postedAnnouncementId: number | null;
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
    updatedAt: string;
    pgSchoolId: number;
    createdBy: number;
    scheduledDateTime: Date | null;
    cancelledBy: number | null;
    cancelledAt: string | null;
  }]
}
```

---

### 5.5 DELETE `/staff/announcements/drafts/:announcementDraftId` — Delete Draft

**Response**: Standard success.

---

### 5.6 POST `/staff/announcements/drafts/duplicate` — Duplicate Draft

**Request**: `{ announcementDraftId: number }`

**Response**: `{ body: { announcementDraftId: number; updatedAt: string } }`

---

### 5.7 POST `/staff/announcements/duplicate` — Duplicate Posted

**Request**: `{ announcementId: number }`

**Response**: `{ body: { announcementDraftId: number; updatedAt: string } }`

---

### 5.8 POST `/staff/announcements/drafts/schedule` — Schedule New

**Request**: Same as 5.2 with mandatory `scheduledDateTime: Date`.

**Response**: `{ body: { announcementDraftId: number; updatedAt: string } }`

---

### 5.9 PUT `/staff/announcements/drafts/schedule/:announcementDraftId` — Schedule Existing Draft

**Request**: `{ scheduledDateTime: Date }`

**Response**: Draft details.

---

### 5.10 PUT `/staff/announcements/drafts/:announcementDraftId/rescheduleSchedule` — Reschedule

**Request**: `{ scheduledDateTime: Date }`

**Response**: Updated draft details.

---

### 5.11 POST `/staff/announcements/drafts/:announcementDraftId/cancelSchedule` — Cancel

**Request**: None.

**Response**: Standard success.

---

### 5.12 GET `/staff/announcements` — List Created by You

**Response**:
```typescript
{
  body: Array<{
    id: string; postId: number; title: string; date: Date;
    status: 'DRAFT'|'OPEN'|'SCHEDULED'|'POSTING';
    toParentsOf: string[];
    readMetrics: { readCount: number; totalRecipients: number };
    scheduledSendFailureCode: string | null;
  }>
}
```

---

### 5.13 GET `/staff/announcements/shared` — List Shared with You

**Response**:
```typescript
{
  body: Array<{
    id: string; postId: number; title: string; date: Date;
    status: 'OPEN';
    createdByName: string;
    toParentsOf: string[];
    readMetrics: { readCount: number; totalRecipients: number };
  }>
}
```

---

### 5.14 GET `/staff/announcements/:id` — Get Posted Announcement Details

**Response**:
```typescript
{
  body: [{
    announcementId: number;
    title: string;
    content: string;
    richTextContent: Record<string, any> | null;
    enquiryEmailAddress: string;
    postedDate: Date;
    staffName: string;
    createdBy: number;
    createdAt: Date;
    webLinkList: Array<{ webLink: string; linkDescription: string | null }>;
    shortcutLinkList: Array<{ shortcutName: string }>;
    targets: Array<{ announcementId: number; targetSchool: number; targetType: string; targetAcadYear: string|null; targetId: number; targetName: string }>;
    staffOwners: Array<{ staffName: string; staffID: number }>;
    images: Array<{ imageId: number; size: number; name: string; url: string; thumbnailUrl: string; expiryDate?: string; isCover: boolean }>;
    announcementRecipients: Array<{
      announcementId: number;
      studentId: number;
      readDate: Date | null;
      parent: { parentId: number; parentName: string; phone: string; relationship: string|null } | null;
      student: { studentId: number; studentName: string; indexNumber: string; className: string };
      onBoardedCategory: 'Onboarded' | 'Not Onboarded';
    }>;
    attachments?: Array<{ name: string; size: number; sequence: number; downloadUrl: string }>;
  }]
}
```

---

### 5.15 DELETE `/staff/announcements/:id` — Delete Posted

**Response**: Standard success.

---

### 5.16 PUT `/staff/announcements/:id/enquiryEmailAddress` — Update Email

**Request**:
```typescript
{ enquiryEmailAddress: string; prevEnquiryEmailAddress: string }
```

**Response**: Standard success.

---

### 5.17 POST `/staff/announcements/:id/addStaffInCharge` — Add Staff

**Request**: `{ announcementId: number; staffIDs: number[] }`

**Response**: Standard success.

---

### 5.18 PUT `/staff/announcements/:id/removeAccess` — Remove Self

**Request**: None.

**Response**: Standard success.

---

### 5.19 GET `/staff/announcements/prefilled/:announcementPrefilledId` — Get Prefilled

**Response**: Prefilled announcement details (same shape as draft but from platform template).

---

### 5.20 GET `/schoolAdmins/announcements` — Admin List (Legacy)

**Response**: Array of summary data.

---

### 5.21 GET `/schoolAdmins/r12/announcements` — Admin List (Current)

**Response**:
```typescript
{
  body: Array<{
    id: string; postId: number; title: string; date: Date;
    status: 'OPEN';
    createdByName: string; toParentsOf: string[];
    readMetrics: { readCount: number; totalRecipients: number };
  }>
}
```

---

### 5.22 GET `/schoolAdmins/announcements/:id` — Admin Get Details

**Response**: Same shape as 5.14.

---

### 5.23 DELETE `/schoolAdmins/announcements/:id` — Admin Delete

**Response**: Standard success.

---

## 6. Error Handling

### 6.1 Server Error Messages

| Key | Message |
|-----|---------|
| exceedRichTextLimit | Content exceeds 2000 characters |
| invalidRichTextSchema | Rich text JSON format invalid |
| unauthorised | User not creator/staff-in-charge |
| notExist | Announcement/draft not found |
| invalidTargetAcadYear | Academic year mismatch |
| noTargetAccess | User cannot access target groups |
| invalidAnnouncementCode | Invalid code/type |

### 6.2 Scheduled Send Failure Codes

| Code | Meaning |
|------|---------|
| INVALID_CREATOR | Creator account became invalid |
| INVALID_FILE | File attachment error |
| INVALID_IMAGE | Image attachment error |
| INVALID_RECIPIENT | All recipients became invalid |
| UNEXPECTED_ERROR | System error |

### 6.3 HTTP Status Codes

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
