# Feature Specification: Parent-Teacher Meetings (PTM)

**Feature Branch**: `005-ptm`
**Created**: 2026-06-09
**Status**: Reverse-Engineered (brief)
**Input**: Reverse-engineered from existing codebase (pgw-web)

---

## Overview

Parent-Teacher Meetings (PTM) lets school staff create a slot-based meeting event for parents of selected students. A staff member configures basic info (targets, staff-in-charge, enquiry email, web links, attachments), meeting day/time ranges with a per-slot duration and slots-per-timing capacity, and a single booking window during which parents self-book a slot via the PG mobile app. Staff track booking progress on a Meetings dashboard (Ongoing / Upcoming / Past, each meeting showing Available / Booked / Pending counts) and drill into a per-meeting details page with a Schedule view, where they can block slots, add/change/remove a student in a slot on a parent's behalf, manage staff-in-charge, edit the enquiry email, export the schedule, and delete the event. All PTM endpoints are served under the staff v2 base (`{STAFF_BASE_URL_V2}/ptm`).

---

## User Scenarios & Testing

### US-1: Create a Meeting Event (Staff)

**As a** school staff member,
**I want to** create a meeting event with target students, meeting days/times, slot duration/capacity, and a booking window,
**So that** parents can book a meeting slot with me.

**Acceptance Criteria:**

- Staff navigates to `/meetings/new`; a 4-step `Stepper` (Basic Info → Meeting Details → Booking Window → Booking Preview).
- **Step 1**: target student groups, staff-in-charge (co-owners), title, description, venue, enquiry email, web links, file attachments (token-based via `fileToken`).
- **Step 2**: `durationPerSlot` (minutes), `bookingsPerSlot` (slots per timing), one or more meeting day/time ranges (`meetingDateTimes`).
- **Step 3**: one booking window (start/end date-time) — "5.0 initial will support one booking window".
- **Step 4**: preview, then submit.
- On submit, `PtmService.createPtmEvent` → `POST {STAFF_BASE_URL_V2}/ptm` with `staffsInCharge`, `targets`, `title`, `description`, `venue`, `enquiryEmailAddress`, `eventDates`, `durationPerSlot`, `bookingsPerSlot`, `bookingWindows`, `webLinkList`, `attachments`.
- Server validates date ranges against duration (`validateDateRange`); meetings created today must be ≥ `DEFAULT_EARLIEST_MEETING_DATE_DAYS_AFTER_TODAY` days out.
- Success returns `{ eventId }`, fires `MeetingCreated`, redirects to `/meetings`.

### US-2: Meetings Dashboard (Staff)

**As a** school staff member,
**I want to** see all my meeting events grouped by status with booking progress,
**So that** I can monitor responses at a glance.

**Acceptance Criteria:**

- `/meetings`; `usePtmList` → `GET {STAFF_BASE_URL_V2}/ptm` returns `{ events, serverDateTime }`.
- Events categorised by server time into **Ongoing**, **Upcoming**, **Past**.
- Each row shows meeting-day count, `{durationPerSlot} min per slot`, `{bookingsPerSlot} slot(s) per timing`, booking-window status, and stats **Available / Booked / Pending** + target count.
- Rows sortable (`EarliestStart / LatestEnd / LatestCreated`); each links to `/meetings/details/{eventId}`. "Create New" → `/meetings/new`.

### US-3: View Meeting Details & Per-Slot Booking Status (Staff)

**As a** school staff member,
**I want to** open a meeting and see each day's slots and who has booked,
**So that** I can review and manage the schedule.

**Acceptance Criteria:**

- `/meetings/details/:id`; two tabs: **Schedule** and **Details**.
- Loads details (`GET .../ptm/:id`), time slots (`GET .../ptm/timeslots/:id`), and bookings for the selected day (`GET .../ptm/bookings/:id?scheduleDate=...` with `bookedCount`/`availableCount`/`blockedCount`).
- Schedule grouped by day; each slot shows status `available` / `booked` / `blocked` and, when booked, the student/comment. Per-booking detail via `GET .../ptm/booking/:timeslotBookingId`.
- Schedule exportable (`ScheduleExportManager`, desktop).

### US-4: Manage Slots — Block / Unblock and Help a Parent Book (Staff)

**As a** school staff member,
**I want to** block slots and add/change/remove a student in a slot on a parent's behalf,
**So that** I can manage availability and assist parents who cannot self-book.

**Acceptance Criteria:**

- **Block (booked slot)**: "Block and remove student?" → `POST .../ptm/booking/block` (`{ bookingId, currEventStudentId? }`).
- **Unblock**: `POST .../ptm/booking/unblock` (`{ bookingId }`).
- **Help-book / Add student**: Add/Edit overlay with eligible students from `GET .../ptm/:eventId/targetStudents`. Add → `POST .../ptm/booking/add`; change → `POST .../ptm/booking/change`; remove → `POST .../ptm/booking/remove`.
- Server guardrails surfaced as error reasons: `hasExistingResponse`, `slotAlreadyBooked`, `remarksMismatch`, `eventStudentMismatch`.

### US-5: Manage Staff-in-Charge & Enquiry Email (Staff)

**As a** school staff member,
**I want to** add co-owners and update the enquiry email,
**So that** the right staff can manage the meeting and parents have correct contact info.

**Acceptance Criteria:**

- Add staff-in-charge → `POST .../ptm/:eventId/addStaffInCharge`; new staff emailed.
- Remove self → `PUT .../ptm/:eventId/removeAccess`; redirects to `/meetings`.
- Edit enquiry email → `PUT .../ptm/:eventId/updateEnquiryEmail`.

### US-6: Delete a Meeting Event (Staff)

**As a** school staff member,
**I want to** delete a meeting event,
**So that** obsolete events are removed.

**Acceptance Criteria:**

- "Delete meeting event now?" confirmation → `DELETE .../ptm/:id`; redirects to `/meetings`.

> **Not found / flagged:** No edit-event flow exists — routes are only `/meetings`, `/meetings/new`, `/meetings/details/:id`. Post-creation changes are limited to staff-in-charge, enquiry email, and per-slot booking management; core event fields (dates, duration, capacity, booking window) are not editable. Whole-slot block (`blockPtmTimeSlot`) is stubbed (`TODO`, not API-ready).

---

## Requirements

### Functional Requirements

- **FR-1 (Event creation):** Create a PTM event with targets, staff-in-charge, title, description, venue, enquiry email, web links, attachments. `POST {STAFF_BASE_URL_V2}/ptm` → `{ eventId }`.
- **FR-2 (Slot model):** An event has one or more `eventDates` (day + start/end range); slots are generated from each range using `durationPerSlot`. Each timing supports `bookingsPerSlot` parallel bookings (capacity).
- **FR-3 (Booking window):** Exactly one booking window governs parent self-booking; status `NOT_STARTED` / `OPEN` / `CLOSED` (`EBookingWindowStatus`).
- **FR-4 (Date guardrail):** Dates validate against duration and respect a minimum lead time (`DEFAULT_EARLIEST_MEETING_DATE_DAYS_AFTER_TODAY`).
- **FR-5 (Dashboard):** List events with server-time Ongoing/Upcoming/Past categorisation and per-event booking summary + target count; sortable.
- **FR-6 (Schedule view):** Per-day slot grid with booking detail and `booked/available/blocked` counts; per-booking lookup by `timeslotBookingId`.
- **FR-7 (Block/unblock):** `/ptm/booking/block`, `/ptm/booking/unblock`; blocked slots aren't bookable by parents.
- **FR-8 (Help-book management):** Add/change/remove a student in a slot (`/ptm/booking/add|change|remove`) from eligible `targetStudents`, with conflict guards.
- **FR-9 (Staff-in-charge):** Add staff-in-charge and remove self; notify added staff by email.
- **FR-10 (Enquiry email):** Update enquiry email post-creation.
- **FR-11 (Delete):** `DELETE /ptm/:id`.
- **FR-12 (Export & server time):** Export schedule to Excel; expose server date-time (`/ptm/serverdatetime`) for categorisation/booking-window math.
- **FR-13 (Parent side, out of web scope):** Parents view/book/change via mobile; reply enum `ESchoolEventReply` = YES/NO.

### Roles

- **Owner / staff-in-charge:** full management (block, help-book, staff-in-charge, enquiry email, delete) on events they own/co-own.
- **Parent (custodian):** self-books within the booking window via mobile; permission via `EParentPermission` (`''` / `r` / `rw`).

---

## Key Entities

| Entity                                           | Description                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `IPTMEventSummary` / `IPTMEventDetails`          | A meeting event (targets, dates, `durationPerSlot`, `bookingsPerSlot`, booking summary). |
| `ISchoolEventDate`                               | A start/end date-time range; used for both `eventDates` and `bookingWindows`.            |
| `IPTMEventSlot` / `…WithBookings`                | A generated time slot with start/end and availability/bookings.                          |
| `ISchoolEventTimeSlotBooking`                    | A booking of a slot (status `available`/`unavailable`; UI also surfaces `blocked`).      |
| `ISchoolEventBookingSummary`                     | `{ available, booked, pending }` rollup per event.                                       |
| `IEventStudentDetails` / `ITargetStudentDetails` | A targeted/eligible student for a booking.                                               |
| `ICustodianDetails`                              | Parent linked to a student, with `EParentPermission`.                                    |
| `IEventReply`                                    | A parent's reply (`ESchoolEventReply` YES/NO) + booked slot + remarks.                   |

---

## Success Criteria

1. **Creation:** Staff complete the 4-step flow; slots generate from day/time ranges using duration + capacity; the event appears in the correct dashboard section.
2. **Tracking:** Dashboard and details counts (Available / Booked / Pending / Blocked) accurately reflect bookings against server time.
3. **Management:** Block/unblock and add/change/remove-student actions persist and enforce conflict guardrails.
4. **Lifecycle:** Staff-in-charge, enquiry email, and delete actions succeed with correct redirects/notifications.

---

## Assumptions

1. PTM is built on the shared school-event/booking model; it's the only school-event type wired to this slot/booking-window flow here.
2. Backend is the Node BFF (Sequelize via `@pgw/db-migration`); all routes under `{STAFF_BASE_URL_V2}/ptm`.
3. Parent-side booking happens on the PG mobile app; this spec covers the staff web portal only.
4. Exactly one booking window per event in this version; multi-window is a future extension.
5. Attachments use the token-based (`fileToken`) flow shared with Consent Forms.
6. No event-edit or scheduled-post flow exists for PTM; whole-time-slot block is stubbed and not yet API-backed.

---

## Jira Mapping

| Ticket      | Scope                                | Spec coverage                 |
| ----------- | ------------------------------------ | ----------------------------- |
| **PGTW-21** | Create meeting event                 | US-1, FR-1..FR-4              |
| **PGTW-22** | Dashboard + responses/booking status | US-2, US-3, FR-5, FR-6, FR-12 |
| **PGTW-23** | Management: block slots / help book  | US-4, US-5, US-6, FR-7..FR-11 |

**Notes:** Edit-event and scheduled-posting (present in Consent Forms) are absent in PTM. `removeSelfFromStaffInCharge` / `updateEnquiryEmail` could split into a separate lifecycle ticket if PGTW-23 is scoped purely to slot management.
