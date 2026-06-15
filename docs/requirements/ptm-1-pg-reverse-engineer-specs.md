# Meetings (PTM) - Complete Redevelopment Spec (Staff & Admin)

**Created**: 2026-06-09
**Purpose**: Comprehensive reference for frontend redevelopment — business logic, validation, functional behavior, and API contracts.

---

## 1. Constants & Constraints

### 1.1 Time & Duration

| Constraint | Value |
|-----------|-------|
| Min slot duration | 10 minutes |
| Max slot duration | 720 minutes (12 hours) |
| Duration multiplier | 5 (must be multiples of 5) |
| Start time interval | 15 minutes (picker options) |
| Default scroll start | 07:00 |

### 1.2 Booking Limits

| Constraint | Value |
|-----------|-------|
| Min bookings per slot | 1 |
| Max bookings per slot | 3 |
| Max booking windows per meeting | 1 |

### 1.3 Meeting Configuration

| Constraint | Value |
|-----------|-------|
| Max event dates | 15 |
| Title max length | 120 characters |
| Venue max length | 120 characters |
| Description max length | 2,000 characters |
| Max attachments | 3 files |
| Max file size | 5 MB |
| Web link description max | 40 characters |
| Attachment extensions | `.pdf, .csv, .docx, .xlsx, .xls, .pptx, .jpg, .jpeg, .gif, .png, .mp3, .mp4, .m4v` |

### 1.4 Date Constraints

| Constraint | Value |
|-----------|-------|
| Earliest booking window start | 1 day from today |
| Earliest meeting date | 2 days from today |
| Latest booking window end | 1 day before first meeting date |
| Reminder sent | 1 day before booking opens/closes |

---

## 2. Business Logic Rules

### 2.1 Enums

**EBookingWindowStatus**:
| Value | Meaning |
|-------|---------|
| `NOT_STARTED` | Booking hasn't opened yet |
| `OPEN` | Booking window is active |
| `CLOSED` | Booking window has closed |

**ESlotBookingStatus**:
| Value | Meaning |
|-------|---------|
| `available` | Slot has room for more bookings |
| `unavailable` | Slot is blocked by staff or full |

**ESchoolEventReply** (Parent responses):
| Value | Meaning |
|-------|---------|
| `YES` | Attending (requires slot selection) |
| `NO` | Not attending |

**EEventStudentResponderType**:
| Value | Meaning |
|-------|---------|
| `custodian` | Parent/guardian responded |
| `staff` | Staff responded on behalf |

**ECustodianRights** (Parent access level):
| Value | Meaning |
|-------|---------|
| `''` (empty) | No access to booking |
| `'r'` | Read only (can view, cannot book) |
| `'rw'` | Read/write (can view and book) |

### 2.2 Meeting Lifecycle

1. **Created** → Notifications sent to parents
2. **Booking NOT_STARTED** → Waiting for booking window to open
3. **Booking OPEN** → Parents can book slots
4. **Booking CLOSED** → No more bookings allowed
5. **Event Date** → Meeting occurs
6. **Deleted** → Soft delete (`isDeleted: true`)

### 2.3 Slot Calculation

```
Total Slots = (Total Minutes Across All Meeting Dates / Duration Per Slot)
Total Booking Slots = Total Slots × Bookings Per Slot

Example: 4 hours (240 min) with 15-min slots and 2 bookings/slot:
= (240 / 15) × 2 = 32 total booking slots
```

### 2.4 Slot Management

- Staff can **block** slots to prevent parent booking (marks as unavailable)
- Staff can **unblock** previously blocked slots
- Staff can **add booking** for a student into an available slot
- Staff can **change booking** to a different slot
- Staff can **remove booking** from a slot

### 2.5 Booking Period Reminders

- Reminder 1: Sent 1 day before booking opens
- Reminder 2: Sent 1 day before booking closes (only if open/close dates differ)
- If booking opens AND closes on same day, only 1 reminder sent

### 2.6 Access Control

| Action | Creator | Staff-in-Charge | School Admin |
|--------|---------|-----------------|--------------|
| View meeting details | Yes | Yes | Yes |
| View bookings/schedule | Yes | Yes | Yes |
| Block/unblock slots | Yes | Yes | No |
| Add/change/remove bookings | Yes | Yes | No |
| Add staff-in-charge | Yes | Yes | No |
| Remove self as staff | N/A | Yes | N/A |
| Edit enquiry email | Yes | Yes | No |
| Delete meeting | Yes | No | Yes |

### 2.7 Navigation / Draft Detection

Meeting is considered "drafted" if any form step has data:
- **Form 1**: staffInCharge, studentGroups, title, description, venue, enquiryEmailAddress
- **Form 2**: durationPerSlot, bookingsPerSlot, or any meetingDateTimes entry
- **Form 3**: any booking window date/time

Warning on leave: "Are you sure you want to leave this page? All the data on this page will be lost if you leave the page now."

### 2.8 Concurrent Edit Detection

When multiple staff edit same booking simultaneously:
- Error: "This meeting slot has just been edited"
- Based on `remarksMismatch` or `eventStudentMismatch`

---

## 3. Validation Rules

### 3.1 Form 1 — Basic Information

| Field | Rule |
|-------|------|
| Student Groups | Mandatory (at least one) |
| Title | Mandatory, max 120 chars |
| Description | Mandatory, max 2000 chars |
| Venue | Optional, max 120 chars |
| Enquiry email | Mandatory, valid email format |
| Web links | URL safety validated, description max 40 chars |
| Attachments | Max 3, each max 5MB, accepted extensions |

### 3.2 Form 2 — Meeting Details

| Field | Rule |
|-------|------|
| Duration per slot | Required, 10-720 min, multiple of 5 |
| Bookings per slot | Required, 1-3 |
| Meeting date/times | 1-15 entries |
| Each meeting date | >= 2 days from today |
| From time | Must be before to time |
| Time intervals | 15-minute intervals starting 07:00 |
| Cross-day | Supports end times past midnight |

### 3.3 Form 3 — Booking Window

| Field | Rule |
|-------|------|
| Booking start date | >= 1 day from today |
| Booking end date | >= start date, <= 1 day before first meeting date |
| Date order | Start date <= end date |

### 3.4 Web Link Validation

- `isSafeLink`: No malicious URLs
- `isMimeSafeLink`: Must be HTML or plain text MIME type
- Empty links filtered out before submission

---

## 4. Functional Behavior

### 4.1 Creation Flow — 4-Step Wizard

**Step 1: Basic Information**
- Student groups selection
- Staff-in-charge (optional, excludes creator)
- Enquiry email (auto-fills from staff display email if configured)
- Title, description, venue
- Web links (up to 3)
- File attachments (up to 3)

**Step 2: Meeting Details**
- Duration per slot (dropdown: 10-720 min in 5-min increments)
- Bookings per slot (1, 2, or 3)
- Meeting date/times (add up to 15 rows, each with date + from time + to time)
- Shows calculated total slots summary

**Step 3: Booking Window**
- Booking start date/time
- Booking end date/time
- Shows reminder info: when reminders will be sent

**Step 4: Preview & Confirm**
- Summary of all entered data
- Shows: Target groups, staff-in-charge, enquiry email, meeting dates, slot duration, bookings per slot, booking window, reminders
- "Create" button → triggers email to staff + push notification to parents

### 4.2 List Page

**Columns**: Title, Meeting Dates, Booking Period, Available Slots, Status

**Status indicators**: Based on booking window state (NOT_STARTED, OPEN, CLOSED)

**Actions**: View details, Delete

### 4.3 Details Page — Tabs

**Details Tab**:
1. Title, description, venue
2. Meeting dates and times
3. Slot duration and bookings per slot
4. Booking period (with status: NOT_STARTED/OPEN/CLOSED)
5. Staff-in-charge + "Add" button
6. Enquiry email + "Edit" button
7. Web links
8. Attachments with download links
9. Target groups
10. Delete button

**Schedule Tab**:
- Day-by-day view of all meeting dates
- Each day shows time slots with booking status
- Per slot: start time, student name (if booked), parent name, status (available/booked/blocked)
- Actions per slot: Block/Unblock, Add booking, Change booking, Remove booking
- Shows booking summary: Available / Booked / Blocked counts

**Read Status Tab**:
- Shows which parents have read the meeting invitation
- Export to Excel available

### 4.4 Staff Booking Management

**Block Slot**: Staff marks slot as unavailable (hidden from parents)

**Unblock Slot**: Staff makes blocked slot available again

**Add Booking** (staff books on behalf of parent):
1. Select available slot
2. Select target student from dropdown
3. Add optional remarks
4. Confirm → booking saved with `responderType: 'staff'`

**Change Booking**: Move student to different slot

**Remove Booking**: Remove student from slot (slot becomes available again)

### 4.5 Edit Enquiry Email

- Same pattern as announcements/consent forms
- Request: `{ enquiryEmailAddress: string }`

### 4.6 Add/Remove Staff-in-Charge

- Same pattern as other features
- Sends email to new staff member on add

### 4.7 Delete Meeting

- Confirmation modal
- Soft delete (`isDeleted: true`)
- Redirect to list

### 4.8 Date/Time Display Formats

| Format | Usage |
|--------|-------|
| `dddd D MMM YYYY` | Meeting day display (e.g. "Friday 15 Aug 2025") |
| `h:mm A` | Time display (e.g. "2:30 PM") |
| `ddd D MMM YYYY, h:mm A` | Meeting detail date/time |
| `12:00AM (Next day)` | Midnight alias |
| `DD/MM/YYYY` | Date input format |
| `HH:mm` | Time input format (24-hour) |

### 4.9 Analytics Events

| Event | Trigger |
|-------|---------|
| NewMeetingButtonPressed | Create button clicked |
| MeetingCreated | Meeting successfully created |
| MeetingNextButtonPressed | Next button (forms 1-3) |
| MeetingPreviewButtonPressed | Step 3 → Preview |
| MeetingBackButtonPressed | Back button |
| MeetingCreateButtonPressed | Final create button |
| MeetingViewed | Detail page loaded |
| MeetingDetailsTabPressed | Details tab |
| MeetingScheduleTabPressed | Schedule tab |
| MeetingReadStatusTabPressed | Read status tab |
| DeleteMeetingButtonPressed | Delete button |
| MeetingDeleted | Deletion completed |
| MeetingTitleTooltipPressed | Title tooltip |
| ReminderTooltipPressed | Reminder tooltip |
| WebsiteLinkTooltipPressed | Web link tooltip |
| WebsiteDescriptionTooltipPressed | Description tooltip |
| EditEnquiryEmailButtonPressed | Edit email button |
| StaffInChargeTooltipPressed | Staff tooltip |

---

## 5. API Contracts

### Base

- **Base URL**: `/api/v2`
- **Staff**: `/api/v2/staff/ptm`
- **Auth**: SchoolStaffSessionMiddleware
- **Rate Limit**: 250 requests per 60 minutes

### Response Wrapper (all endpoints)

```typescript
{ resultCode: number; message: string; body: T; metadata?: Record<string, any> }
```

---

### 5.1 POST `/staff/ptm` — Create Meeting

**Request** (`ICreatePTMEventRecordsRequest`):
```typescript
{
  staffsInCharge: number[];
  targets: Array<{ targetType: 'CLASS'|'LEVEL'|'SCHOOL'|'CCA'|'GROUP'; targetId: number; targetAcadYear?: string }>;
  title: string;                          // max 120 chars
  description: string;                    // max 2000 chars
  venue?: string;                         // max 120 chars
  enquiryEmailAddress: string;
  eventDates: Array<{ startDateTime: Date; endDateTime: Date }>;  // 1-15 dates, sorted
  durationPerSlot: number;                // 10-720, multiple of 5
  bookingsPerSlot: number;                // 1-3
  bookingWindows: Array<{ startDateTime: Date; endDateTime: Date }>;  // exactly 1
  webLinkList: Array<{ webLink: string; linkDescription: string | null }>;
  attachments?: Array<{ fileToken: string }>;  // max 3
}
```

**Response**: `{ body: { eventId: number } }`

---

### 5.2 GET `/staff/ptm` — List Meetings

**Response**:
```typescript
{
  body: {
    events: Array<{
      eventId: number;
      title: string;
      description: string;
      venue?: string;
      enquiryEmailAddress: string;
      eventDates: Array<{ startDateTime: Date; endDateTime: Date }>;
      bookingWindows: Array<{ startDateTime: Date; endDateTime: Date }>;
      webLinkList?: Array<{ webLink: string; linkDescription: string | null }>;
      attachments: Array<{ name: string; size: number; downloadUrl: string }>;
      staffsInCharge: Array<{ staffId: number; name: string }>;
      targets: string[];
      createdBy: { staffId: number; name: string };
      isCreatorValidEventStaff: boolean;
      createdAt: Date;
      updatedAt: Date;
      availableCount: number;
    }>;
    serverDateTime: Date;
  }
}
```

---

### 5.3 GET `/staff/ptm/:eventId` — Get Meeting Details

**Path Params**: `eventId: number`

**Response**:
```typescript
{
  body: {
    eventId: number;
    title: string;
    description: string;
    venue?: string;
    enquiryEmailAddress: string;
    eventDates: Array<{ startDateTime: Date; endDateTime: Date }>;
    bookingWindows: Array<{ startDateTime: Date; endDateTime: Date }>;
    webLinkList?: Array<{ webLink: string; linkDescription: string | null }>;
    attachments: Array<{ name: string; size: number; downloadUrl: string }>;
    staffsInCharge: Array<{ staffId: number; name: string }>;
    targets: string[];
    createdBy: { staffId: number; name: string };
    createdAt: Date;
    updatedAt: Date;
    bookingSummary: { available: number; booked: number; pending: number };
    durationPerSlot: number;
    bookingsPerSlot: number;
  }
}
```

---

### 5.4 GET `/staff/ptm/timeslots/:eventId` — Get Time Slots

**Path Params**: `eventId: number`

**Response**:
```typescript
{
  body: {
    eventDays: Array<{
      date: Date;
      slots: Array<{ slotId: number; startDateTime: Date }>;
    }>;
    durationPerSlot: number;
    bookingsPerSlot: number;
    totalCount: number;
  }
}
```

---

### 5.5 GET `/staff/ptm/bookings/:eventId` — Get Bookings

**Path Params**: `eventId: number`
**Query Params**: `scheduleDate?: string` (ISO date to filter by day)

**Response**:
```typescript
{
  body: {
    timeSlotBookings: Record<number, Array<{
      bookingId: number;
      slotId: number;
      studentId: number | null;
      studentName: string | null;
      className: string | null;
      parentName: string | null;
      remarks: string | null;
      status: 'available' | 'unavailable';
      responderType: 'custodian' | 'staff' | null;
    }>>;
    bookedCount: number;
    availableCount: number;
    blockedCount: number;
  }
}
```

---

### 5.6 GET `/staff/ptm/schedule/:eventId` — Get Full Schedule

**Path Params**: `eventId: number`
**Query Params**: `includeResponseData=true`

**Response**:
```typescript
{
  body: {
    title: string;
    targets: string[];
    dates: Array<{
      date: Date;
      slots: Array<{
        slotId: number;
        startDateTime: Date;
        bookings: Array<{
          bookingId: number;
          studentId: number | null;
          studentName: string | null;
          className: string | null;
          parentName: string | null;
          remarks: string | null;
          status: 'available' | 'unavailable';
          responderType: 'custodian' | 'staff' | null;
        }>;
      }>;
    }>;
  }
}
```

---

### 5.7 GET `/staff/ptm/booking/:bookingId` — Get Single Booking

**Path Params**: `bookingId: number`

**Response**: Single booking details with student/parent info.

---

### 5.8 DELETE `/staff/ptm/:eventId` — Delete Meeting

**Path Params**: `eventId: number`

**Response**: `{ body: boolean }`

---

### 5.9 POST `/staff/ptm/:eventId/addStaffInCharge` — Add Staff

**Path Params**: `eventId: number`

**Request**: `{ staffIDs: number[] }`

**Response**: Standard success.

---

### 5.10 GET `/staff/ptm/:eventId/targetStudents` — Get Target Students

**Path Params**: `eventId: number`

**Response**:
```typescript
{
  body: {
    eventStudents: Array<{
      eventStudentId: number;
      studentId: number;
      studentName: string;
      className: string;
      indexNumber: string;
      hasBooking: boolean;
    }>;
  }
}
```

---

### 5.11 PUT `/staff/ptm/:eventId/removeAccess` — Remove Self

**Path Params**: `eventId: number`

**Response**: Standard success.

---

### 5.12 PUT `/staff/ptm/:eventId/updateEnquiryEmail` — Update Email

**Path Params**: `eventId: number`

**Request**: `{ enquiryEmailAddress: string }`

**Response**: Standard success.

---

### 5.13 POST `/staff/ptm/booking/block` — Block Slot

**Request**:
```typescript
{ bookingId: number; currEventStudentId?: number }
```

**Response**: `{ body: { status: string } }`

---

### 5.14 POST `/staff/ptm/booking/unblock` — Unblock Slot

**Request**:
```typescript
{ bookingId: number }
```

**Response**: `{ body: { status: string } }`

---

### 5.15 POST `/staff/ptm/booking/add` — Add Booking (Staff)

**Request**:
```typescript
{
  bookingId: number;
  newStudentId: number;
  currRemarks?: string;
  newRemarks?: string;
}
```

**Response**: `{ body: { status: string } }`

---

### 5.16 POST `/staff/ptm/booking/change` — Change Booking

**Request**:
```typescript
{
  bookingId: number;
  currStudentId: number;
  newStudentId: number;
  currRemarks?: string;
  newRemarks?: string;
}
```

**Response**: `{ body: { status: string } }`

---

### 5.17 POST `/staff/ptm/booking/remove` — Remove Booking

**Request**:
```typescript
{ bookingId: number; currStudentId: number }
```

**Response**: `{ body: { status: string } }`

---

### 5.18 GET `/staff/ptm/serverdatetime` — Get Server Time

**Response**: `{ body: { serverDateTime: Date } }`

---

### 5.19 POST `/staff/ptm/booking/validate` — Validate Web Links

**Request**: `{ webLinkList: Array<{ webLink: string; linkDescription: string | null }> }`

**Response**: Validation result (boolean or error details).

---

## 6. Error Handling

### 6.1 Event Error Codes

| Code | Meaning |
|------|---------|
| BookingWindowClosed | Parent attempted to book outside window |
| EventStudentMismatch | Student validation failed |
| HasExistingResponse | Parent already has YES response |
| InvalidBookingWindow | Booking dates invalid |
| InvalidCustodian | Parent/guardian not valid |
| InvalidEvent | Event ID not found |
| InvalidEventDate | Date validation failed |
| InvalidEventStaff | Staff not valid |
| InvalidSchoolName | School mismatch |
| InvalidTimeslot | Slot ID not found |
| slotAlreadyBooked | Slot filled or blocked |
| eventNotFound | Meeting not found |
| remarksMismatch | Concurrent edit conflict |
| timeslotNotAvailable | Slot unavailable/blocked |
| unauthorisedAccess | No permission |
| duplicateStaffInCharge | Staff already in charge |
| invalidStaffInCharge | Staff cannot be added |
| invalidStudent | Student not targetable |

### 6.2 Web Link Validation Errors

| Code | Message |
|------|---------|
| INVALID_MIME_TYPES_LINK_ERROR | "Request contains a link that is not a html or a plain text" |
| MALICIOUS_AND_INVALID_MIME_TYPES_LINK_ERROR | "Request contains a link that is malicious and it is not a html or a plain text" |

### 6.3 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 500 | Internal error |
