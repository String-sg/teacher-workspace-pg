# Admin Reports - Complete Redevelopment Spec (Staff & Admin)

**Created**: 2026-06-09
**Purpose**: Comprehensive reference for frontend redevelopment — business logic, validation, functional behavior, and API contracts.

---

## 1. Report Types

The system supports **2 report types**:

| Report | Description | Admin | Form Teacher | IHL Compatible |
|--------|-------------|-------|--------------|----------------|
| Onboarding Report | Custodian onboarding status per student | Yes (whole school) | Yes (their classes) | Yes |
| Travel Declaration Report | Travel declarations by custodians | Yes (whole school) | Yes (their classes) | **No** (disabled) |

---

## 2. Constants & Constraints

### 2.1 Date Range Limits (Travel Declaration)

| Constraint | Value |
|-----------|-------|
| Max past | 3 months from today (start of month) |
| Max future | 12 months from today (end of month) |
| Max range (frontend) | 3 months |
| Max range (backend) | 4 months |

### 2.2 Other

| Constraint | Value |
|-----------|-------|
| Export format | Excel (.xlsx) |
| Mobile support | **No** — reports disabled on mobile |

---

## 3. Business Logic Rules

### 3.1 Access Control

| Role | Onboarding Report | Travel Declaration |
|------|-------------------|-------------------|
| School Admin | Whole school | Whole school (non-IHL only) |
| Form/Co-Form Teacher | Their assigned classes only | Their assigned classes only (non-IHL) |
| IHL Admin | Whole school (IHL variant) | **Disabled** |
| Other Staff | No access | No access |

**Admin** requires 2FA authorization (AdminMultiFactorAuthorizationMiddleware).

**Form Teacher** scope determined by `GroupsService.getAssignedGroups()` — if no class assigned, shows error: "No Form Class assigned".

### 3.2 Onboarding Status Logic

For each custodian (Father, Mother, Caregiver, Legal Guardian):

```
if (!uinFinNo || !parentPermission):
    onboardedStatus = 'No Access'
    canRespondStatus = 'No Access'
else if (isOnboarded):
    onboardedStatus = 'Yes'
else:
    onboardedStatus = 'No'

if (parentPermission === 'rw'):
    canRespondStatus = 'Yes'
else if (parentPermission === 'r'):
    canRespondStatus = 'No'
```

### 3.3 Status Values

| Status | Meaning |
|--------|---------|
| `Yes` (Onboarded) | Previously logged into PG with Singpass |
| `No` (Onboarded) | Has not logged into PG yet |
| `No Access` | No NRIC/FIN in system or custody issue |
| `Nil` | No such custodian assigned to student |
| `Yes` (Can Respond) | Has read-write permission (`rw`) |
| `No` (Can Respond) | Has read-only permission (`r`) |

### 3.4 Relationship Codes

| Code | Display |
|------|---------|
| F | Father |
| M | Mother |
| G | Caregiver |
| G4 | Legal Guardian |
| G2, G3 | Not supported (ignored) |

### 3.5 Parent Permission Codes

| Code | Meaning |
|------|---------|
| `rw` | Read-write (can respond to forms) |
| `r` | Read-only (cannot respond) |
| null/undefined | No access |

### 3.6 Special Cases

- **Multiple guardians/caregivers**: Creates multiple rows per student (one per guardian)
- **Deceased parents**: Skipped (not shown)
- **Deleted parents**: Skipped (not shown)
- **PreP1 students**: Level/class/serialNo replaced with "PRE-PRIMARY 1"
- **IHL schools**: "Index No" column replaced with "StudentID" (NRIC/FIN)

### 3.7 Travel Declaration Report Types

| Type | Display Label | Shows |
|------|--------------|-------|
| Declared | "Declared (Include travelling and not travelling)" | Students WITH declarations in date range |
| Did Not Declare | "Did Not Declare (No declarations made)" | Students WITHOUT any declarations in date range |

---

## 4. Functional Behavior

### 4.1 Admin Reports Page (`/admin/reports`)

**Tabs**: Onboarding, Travel Declaration

**Tab switching resets state** to initial values.

### 4.2 Staff Reports Page (`/staff/reports`)

**Tabs**: Onboarding, Travel Declaration

**Additional info**: Shows assigned class name(s) (comma-separated if multiple).

**Error state**: If no form class assigned, shows message directing staff to School Cockpit.

### 4.3 Onboarding Report Tab

**No filters** — downloads all data immediately.

**Export button**: "Export to Excel" — always enabled.

**Mobile**: Shows message "This report can only be exported on desktop".

### 4.4 Travel Declaration Report Tab

**Filters**:
1. **Report Type** (radio buttons): "Declared" or "Did Not Declare"
2. **Date Range** (date pickers): Start Date and End Date

**Validation**:
- Both dates required
- Start date >= today - 3 months (start of month)
- End date <= today + 12 months (end of month)
- Date range <= 3 months
- Start date must be before end date

**Export button**: Disabled until date range is valid.

**Note displayed**: "Eg. If you are interested in the June 2020 School Holidays, you may enter the Start Date (30 May) and End Date (28 June) of the holidays."

### 4.5 Export — Onboarding Report

**File name**:
- Admin: `{schoolCode}-onboarding-report-{datetime}.xlsx`
- Staff: `{schoolCode}-{className}-onboarding-report-{datetime}.xlsx`

**Excel structure**:
- **Sheet 1: "Students"** — main report data
- **Sheet 2: "Onboarding Status Breakdown"** — explainer table

**Columns (Standard Schools)**:
| Column | Description |
|--------|-------------|
| Level | Student level |
| Class | Class name |
| Index No | Class serial number |
| Student | Student name |
| Father | Father name |
| Father Onboarded? | "Logged into PG before" |
| Father Can Respond? | "If have Singpass to Login" |
| Mother | Mother name |
| Mother Onboarded? | Same |
| Mother Can Respond? | Same |
| Caregiver | Caregiver name |
| Caregiver Onboarded? | Same |
| Caregiver Can Respond? | Same |
| Legal Guardian | Legal guardian name |
| Legal Guardian Onboarded? | Same |
| Legal Guardian Can Respond? | Same |

**Columns (IHL Schools)**:
- Replaces "Index No" with "StudentID" (NRIC/FIN)
- Otherwise same structure

**Breakdown Sheet** (Sheet 2):
| Custodian | Onboarded? | Can Respond? | Meaning |
|-----------|-----------|-------------|---------|
| [Name] | No | No | No Singpass or custody issue |
| [Name] | No | Yes | Eligible for Singpass |
| [Name] | Yes | No | Onboarded but custody issue |
| [Name] | Yes | Yes | Fully onboarded and responsive |
| [Name] | No Access | No Access | NRIC/FIN missing or custody issue |
| Nil | Nil | Nil | No such custodian |

### 4.6 Export — Travel Declaration Report (Declared)

**File name**: `{schoolCode}-{formClass}-Travel_Declared-{startDate}-{endDate}-on_{currentDateTime}.xlsx`

**Columns**:
| Column | Description |
|--------|-------------|
| Level | Student level |
| Class | Class name |
| Index No | Class serial number |
| Student | Student name |
| Custodian | Trip declared by (name) |
| Relationship | Father/Mother/Caregiver/Legal Guardian |
| Not Travelling During | Yes/No |
| Country (-City) | Destination |
| From | Trip start date |
| To | Trip end date |
| Date Declared | Declaration date |
| Time Declared | Declaration time |

### 4.7 Export — Travel Declaration Report (Did Not Declare)

**File name**: `{schoolCode}-{formClass}-Travel_Did_Not_Declare-{startDate}-{endDate}-on_{currentDateTime}.xlsx`

**Columns**: Same as Onboarding Report (shows custodian status for students who haven't declared).

### 4.8 Empty Report Handling

If no records found: placeholder row with text "No records found for {startDate} to {endDate}".

### 4.9 File Name Sanitization

Non-alphanumeric characters replaced with underscore (`_`). Spaces replaced with underscores.

### 4.10 Excel Formatting

- Column wrapping enabled
- Header row with borders
- Standard column widths: 13 chars
- Breakdown sheet widths: 17/14/14/95 chars
- Row height: 50 points for breakdown header

### 4.11 Analytics Events

| Event | Trigger |
|-------|---------|
| ReportsOnboardingTabPressed | Onboarding tab clicked |
| ReportsTravelDeclarationTabPressed | Travel declaration tab clicked |
| ExportToExcelButtonPressed | Export button clicked |

---

## 5. API Contracts

### Base

- **Admin**: `/api/v2/schoolAdmins/...` (requires Admin access scope + 2FA)
- **Staff**: `/api/v2/staff/school/...` (requires SchoolStaffSessionMiddleware)

### Response Wrapper

```typescript
{ resultCode: number; message: string; body: T; metadata?: Record<string, any> }
```

---

### 5.1 GET `/schoolAdmins/students?action=onboardReport` — Admin Onboarding Report

**Query Params**: `action=onboardReport` (required)

**Auth**: SchoolStaffSessionMiddleware with `accessControlScope: 'Admin'`

**Response**:
```typescript
{
  body: Array<{
    'Level': string;
    'Class': string;
    'Index No': string;                                    // or 'StudentID' for IHL
    'Student': string;
    'Father': string;
    'Father Onboarded?\n(Logged into PG before)': string;  // 'Yes'|'No'|'No Access'|'Nil'
    'Father Can Respond?\n(If have Singpass to Login)': string;
    'Mother': string;
    'Mother Onboarded?\n(Logged into PG before)': string;
    'Mother Can Respond?\n(If have Singpass to Login)': string;
    'Caregiver': string;
    'Caregiver Onboarded?\n(Logged into PG before)': string;
    'Caregiver Can Respond?\n(If have Singpass to Login)': string;
    'Legal Guardian': string;
    'Legal Guardian Onboarded?\n(Logged into PG before)': string;
    'Legal Guardian Can Respond?\n(If have Singpass to Login)': string;
  }>;
  metadata: { schoolCode: string };
}
```

---

### 5.2 GET `/staff/school/students/retrieveReport?action=onboardReport` — Staff Onboarding Report

**Query Params**: `action=onboardReport` (required)

**Auth**: SchoolStaffSessionMiddleware

**Response**: Same shape as 5.1 but filtered by teacher's assigned form classes.

**Error**: If no form class assigned, returns error.

---

### 5.3 POST `/schoolAdmins/travelDeclaration` — Admin Travel Declaration Report

**Auth**: SchoolStaffSessionMiddleware with `accessControlScope: 'Admin'`, `IhlEnabled: false`

**Request**:
```typescript
{
  reportType: 'Declared (Include travelling and not travelling)' | 'Did Not Declare (No declarations made)';
  startDate: string;    // ISO date
  endDate: string;      // ISO date
}
```

**Response (Declared)**:
```typescript
{
  body: Array<{
    'Level': string;
    'Class': string;
    'Index No': string;
    'Student': string;
    'Custodian': string;
    'Relationship': string;
    'Not Travelling During': string;   // 'Yes'|'No'
    'Country (-City)': string;
    'From': string;                    // Date
    'To': string;                      // Date
    'Date Declared': string;
    'Time Declared': string;
  }>
}
```

**Response (Did Not Declare)**:
```typescript
{
  body: Array<{
    // Same shape as Onboarding Report (custodian status for non-declarers)
    'Level': string;
    'Class': string;
    'Index No': string;
    'Student': string;
    'Father': string;
    'Father Onboarded?\n(Logged into PG before)': string;
    'Father Can Respond?\n(If have Singpass to Login)': string;
    // ... (Mother, Caregiver, Legal Guardian same pattern)
  }>
}
```

---

### 5.4 POST `/staff/school/travelDeclaration` — Staff Travel Declaration Report

**Auth**: SchoolStaffSessionMiddleware with `IhlEnabled: false`

**Request**: Same as 5.3.

**Response**: Same as 5.3 but filtered by teacher's assigned form classes.

---

## 6. Error Handling

### 6.1 Validation Errors

| Error | Message |
|-------|---------|
| Start after end | "end date must be after start date" |
| Range too large | "Invalid start date and end date must be within {n} months" |
| Start too far back | Date range start validation error |
| End too far forward | Date range end validation error |
| Invalid report type | "Invalid report type" |
| No form class | "No Form Class assigned" |

### 6.2 Frontend Error Handling

- API errors: Redirect to error page with resultCode (-500)
- Excel generation errors: Alert modal "Sorry, something went wrong when saving the {report type} report"

### 6.3 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Validation error (dates, report type) |
| 401 | Unauthorized |
| 403 | Forbidden (non-admin, IHL for travel) |
| 500 | Internal error |
