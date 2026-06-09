# Feature Specification: Reports

**Feature Branch**: `006-reports`
**Created**: 2026-06-09
**Status**: Reverse-Engineered (brief)
**Input**: Reverse-engineered from existing codebase (`src/app/pages/StaffReports/`, `src/app/pages/AdminReports/`)

---

## Overview

Reports is a self-service export feature in Parents Gateway Web that lets school staff generate Excel (`.xlsx`) reports about their students. The real codebase exposes exactly **two report types**, surfaced as sub-nav tabs on a single Reports page:

1. **Onboarding** — custodian (parent) PG onboarding status.
2. **Travel Declaration** — declaration status over a chosen date range.

There are two parallel pages with near-identical UX, differing only in scope and API path:

- **Staff Reports** (`/staff/reports`) — Form Teacher (FT) / Co-Form Teacher: scoped to the staff member's assigned **form class**.
- **Admin Reports** (`/admin/reports`, gated by `AdminRoute`) — Staff with Admin rights: scoped to the **whole school**.

For **IHL** schools the Travel Declaration tab is hidden (`!isIhl` gates the `SubNav`), so IHL sees only the Onboarding report with IHL-specific copy. Both reports are **desktop-only** — on mobile a "This report can only be exported on desktop" notice replaces the export controls.

> **Important:** there is **no in-app drill-down or paginated data table** — the "view" of a report _is_ the downloaded Excel file. Exports are generated **client-side** from JSON rows the API returns.

---

## User Scenarios & Testing

### US-1: Generate Onboarding report for my form class (Staff)

**As a** Form / Co-Form Teacher,
**I want to** export my form class's custodian onboarding status,
**So that** I can see which parents have/haven't onboarded onto PG.

**Acceptance Criteria:**

- Staff navigates to `/staff/reports`; the **Onboarding** tab is selected by default.
- On mount, the page calls `GroupsService.getAssignedGroups()` and renders the staff member's `formClass`.
- If no form class is assigned, the page shows guidance ("you need a form class… approach Staff with Admin rights") instead of an export button (IHL gets school-info-system worded copy).
- "Export to Excel" → `downloadStudentOnboardingReport(formClass)` → `GET /api/web/2/staff/school/students/retrieveReport?action=onboardReport`.
- The workbook has two sheets: **Students** and **Onboarding Status Breakdown**; filename `{schoolCode}-{formClass}-onboarding-report-{timestamp}.xlsx`.

### US-2: Generate Travel Declaration report for my form class (Staff)

**As a** Form / Co-Form Teacher,
**I want to** export who did/did not declare travel over a date range,
**So that** I can follow up with non-declaring families.

**Acceptance Criteria:**

- Staff selects the **Travel Declaration** tab (hidden for IHL).
- Filters: a **declaration status** radio (`Declared (Include travelling and not travelling)` / `Did Not Declare (No declarations made)`) and a **date range** picker.
- Export is disabled until the date range passes validation (`dateTimeValidationHasError`).
- "Export to Excel" → `downloadFormClassTravelDeclarationReport(...)` → `POST /api/web/2/staff/school/travelDeclaration` with `{ reportType, startDate, endDate }`; fires `ExportToExcelButtonPressed`.
- For the "Did Not Declare" case a second **Onboarding Status Breakdown** sheet is appended; otherwise a single **Students** sheet. Empty results yield a placeholder row.

### US-3: Generate school-wide reports (Admin)

**As a** Staff member with Admin rights,
**I want to** generate Onboarding and Travel Declaration reports for the whole school,
**So that** I can oversee onboarding and travel compliance across all classes.

**Acceptance Criteria:**

- Admin navigates to `/admin/reports` (route protected by `AdminRoute`).
- Same two tabs and filters as staff, but scoped to `schoolName` (no form-class lookup; no "without form class" guidance).
- Onboarding export → `downloadStudentOnboardingReport()` → `GET /api/web/2/schoolAdmins/students?action=onboardReport`; filename `{schoolCode}-onboarding-report-{timestamp}.xlsx`.
- Travel Declaration export → `POST /api/web/2/schoolAdmins/travelDeclaration`.

### US-4: Switching tabs resets filters

**As a** staff/admin user,
**I want** filters to reset when I change report tabs,
**So that** stale date/status selections aren't carried over.

**Acceptance Criteria:**

- Changing tab via `SubNav` resets state to `INITIAL_STATES` (clears status, dates, re-flags `dateTimeValidationHasError`).

---

## Requirements

### Functional Requirements

- **FR-1**: Provide exactly two report types — **Onboarding** and **Travel Declaration** — as sub-nav tabs on a single Reports page.
- **FR-2**: Staff reports scoped to the user's assigned form class (`getAssignedGroups()`); Admin reports scoped to the whole school.
- **FR-3**: For staff with no assigned form class, suppress export and show guidance copy (IHL variant differs).
- **FR-4**: Hide the Travel Declaration tab for IHL schools; render IHL-specific descriptions for Onboarding.
- **FR-5**: Travel Declaration requires two filters: declaration-status radio (Declared / Did Not Declare) and a validated date range; disable export until valid.
- **FR-6**: All exports produce client-side `.xlsx` (`xlsx` / `xlsx-style` + `file-saver`); the API returns JSON rows that the FE serializes (no server-side file download).
- **FR-7**: Onboarding exports always include a second **Onboarding Status Breakdown** sheet; Travel Declaration includes it only for "Did Not Declare".
- **FR-8**: Block all exports on mobile user agents; show a desktop-only notice.
- **FR-9**: Filenames embed `schoolCode`, scope (form class for staff), report identity, and a timestamp.
- **FR-10**: Route protection — `/admin/reports` requires admin (`AdminRoute`); `/staff/reports` is a standard staff route.

### Key Entities

| Entity                         | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| Onboarding report row          | Per-student custodian onboarding status (Students sheet) |
| Travel Declaration report row  | Per-student declaration status over date range           |
| `ETravelDeclarationReportType` | Enum: `Declared` / `DidNotDeclare` (drives radio + API)  |
| Onboarding Status Breakdown    | Static explainer sheet appended to certain exports       |
| `formClass`                    | Staff's assigned form class string (report scope)        |

---

## Success Criteria

1. FT/Co-FT can export both reports scoped to their form class; admins can export both school-wide.
2. Onboarding and Travel Declaration `.xlsx` files open with the correct sheets and naming.
3. Travel Declaration export is gated on a valid date range and a selected status.
4. IHL schools see only the Onboarding tab with IHL copy.
5. Mobile users are blocked with a clear desktop-only message.
6. Staff without a form class see guidance instead of broken exports.

---

## Assumptions

1. The BFF report endpoints (`.../retrieveReport?action=onboardReport`, `.../travelDeclaration`) return JSON row arrays plus `metadata.schoolCode`; the FE assembles the workbook.
2. `isIhl`, `staffSchoolId`, `schoolName` come from Redux `indexPage`.
3. "Admin" here means a staff member with admin rights (the `AdminRoute` guard), not a separate persona.
4. The Onboarding Status Breakdown sheet content is static reference data.
5. Date-range validation limits (3-month window) are enforced by the shared `DateRangePicker`.

---

## Jira Mapping

| Story                                   | Coverage                                                                                                                                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PGTW-16 — Travel Declaration report** | US-2 (staff/form-class), US-3 (admin/school-wide), FR-5, FR-7. Endpoints: `POST /api/web/2/staff/school/travelDeclaration` (staff), `POST /api/web/2/schoolAdmins/travelDeclaration` (admin).                                      |
| **PGTW-17 — PG onboarding report**      | US-1 (staff/form-class), US-3 (admin/school-wide), FR-2, FR-7. Endpoints: `GET /api/web/2/staff/school/students/retrieveReport?action=onboardReport` (staff), `GET /api/web/2/schoolAdmins/students?action=onboardReport` (admin). |

**Notes:** access = FT / Co-FT (form-class scope) and Staff-with-Admin (school scope); IHL hides Travel Declaration; both reports are desktop-only; there is **no in-app drill-down table** — the report is the exported Excel file.
