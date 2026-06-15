# Custom Groups - Complete Redevelopment Spec (Staff)

**Created**: 2026-06-09
**Purpose**: Comprehensive reference for frontend redevelopment — business logic, validation, functional behavior, and API contracts.

---

## 1. Constants & Constraints

### 1.1 Group Limits

| Constraint | Value |
|-----------|-------|
| Group name min length | 1 character |
| Group name max length | 120 characters |
| Max students per group | 5,000 |
| File upload format | `.xlsx` only |
| File MIME type | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Validation result cache TTL | 10 minutes (Redis) |

---

## 2. Business Logic Rules

### 2.1 Group Types Enum

| Value | Label | Usage |
|-------|-------|-------|
| `school` | School | All students in school |
| `class` | Class | Students in a class |
| `level` | Level | Students in a level |
| `group` | Custom Group | Custom staff-created group |
| `cca` | CCA | Co-curricular activity |

### 2.2 Ownership Model

- Multiple staff can own a single group (shared ownership)
- Creator is automatically first owner
- Additional owners added via "Share" action
- Only owners can view/edit the group
- Groups are school-scoped (isolated by `customGroupSchoolCode`)

### 2.3 Access Control

| Action | Owner | Shared Staff | Non-Owner |
|--------|-------|-------------|-----------|
| View group | Yes | Yes | No |
| Edit group (name/students) | Yes | Yes | No |
| Share with others | Yes | Yes | No |
| Delete group | Only if LAST owner | No | No |
| Remove own access | Only if other owners exist | Only if other owners exist | N/A |

### 2.4 Delete vs Remove Access

| Condition | Action Available |
|-----------|----------------|
| Staff is LAST owner | Delete (permanently removes group) |
| Staff is one of multiple owners | Remove Access (removes self, group persists) |
| Staff is one of multiple owners | Cannot delete (must remove access instead) |

### 2.5 Message Group Impact

- If group is part of a message group, deletion/removal also removes it from message groups
- Warning shown: "This group is part of a message group. Deleting it will also remove it from your message groups."

### 2.6 Soft Delete

- Groups use `isDeleted` boolean flag
- Deleted groups remain in database for audit trail
- Queries filter out deleted groups

### 2.7 Usage as Target

Custom groups appear as target option (type = `'group'`) in:
- Announcements
- Consent Forms
- Meetings (PTM)

---

## 3. Validation Rules

### 3.1 Group Name

| Rule | Detail |
|------|--------|
| Length | 1-120 characters |
| Trimmed | Whitespace trimmed before save |
| Uniqueness | Must be unique within school (IHL schools enforce this) |

### 3.2 Student List

| Rule | Detail |
|------|--------|
| Non-empty | At least 1 student required |
| No duplicates | Duplicate student IDs rejected |
| Max count | Cannot exceed 5,000 |
| Validity | Each student must pass validity checks |

### 3.3 Student Validity Checks

Each student must:
1. Exist in database
2. Not be marked as deleted
3. Not have status code 'I' (inactive)
4. Belong to the same school
5. Have class allocation (not deleted)
6. Have assigned level code

### 3.4 File Upload Validation

**IHL Format** (single column):
| Rule | Detail |
|------|--------|
| Column header | Exactly "Student ID" (case-sensitive) |
| Data | UinFinNo values |
| No duplicate headers | Rejected |
| No duplicate IDs | Rejected |
| Max rows | 5,000 |
| Non-empty | File cannot be empty |

**MS (Mainstream Schools) Format** (two columns):
| Rule | Detail |
|------|--------|
| Column headers | "Name" AND "Class" (both required) |
| No duplicate headers | Rejected |
| No missing values | Both columns must have data in each row |
| No duplicate Name+Class combos | Rejected |
| Class must exist | In school for current academic year |
| Name matching | Case-insensitive |
| Max rows | 5,000 |
| Non-empty | File cannot be empty |

### 3.5 File Upload Error Messages

| Code | Message |
|------|---------|
| NOT_FOUND | Not found |
| CURRENTLY_INACTIVE | Currently inactive |
| NO_LEVEL | No level |
| MS_CURRENTLY_INACTIVE | Student is marked as inactive. Remove from uploaded file. |
| MS_NAME_NOT_FOUND | Name not found in school. Check that name matches the school system records. |
| MS_CLASS_NOT_FOUND | Class not found in school. Check that class matches the school system records. |
| MS_STUDENT_IN_CLASS_NOT_FOUND | Name and class do not match. Check that name/class are correct. |

---

## 4. Functional Behavior

### 4.1 Create Group Flow

1. Staff enters group name (1-120 chars)
2. Staff adds students via:
   - **Manual add**: Individual student selection via dropdown/combo box
   - **Excel upload**: Batch upload via .xlsx file
3. Student list validated (max 5000, no duplicates, all valid)
4. On success: redirect to group details page + success notification

### 4.2 Edit Group Flow

1. Staff navigates to group detail and clicks Edit
2. Can change group name and/or replace entire student list
3. Same validation as create
4. On success: success notification

### 4.3 Share Group Flow

1. Owner clicks "Share" button
2. Selects staff members (must be in same school, not already owners)
3. On success:
   - Staff added as co-owners
   - Email notification sent to shared staff (SES template: `CustomGroupShare`)
   - Success notification shown

### 4.4 Delete Group Flow

1. Only available if staff is LAST remaining owner
2. Confirmation modal with warning
3. If part of message group: additional warning shown
4. On confirm: soft delete + redirect to list + success notification

### 4.5 Remove Access Flow

1. Available if other owners exist
2. Confirmation modal
3. If part of message group: additional warning shown
4. On confirm: removes own ownership + redirect to list

### 4.6 Excel Upload Flow (Async)

1. Staff selects .xlsx file
2. Frontend calls `POST /validateStudents` with parsed data
3. Server returns token immediately (UUID)
4. Server processes validation in background (Redis-cached results)
5. Frontend polls `POST /validateStudents/results` with token
6. Results show valid/invalid students with error reasons
7. Invalid students limited to 5 displayed entries + "+X more" indicator
8. Staff can proceed with valid students or fix and re-upload

### 4.7 List Page

**Displayed per group**:
- Group name
- Number of staff (owners)
- Number of students
- Actions: View, Edit, Share, Delete/Remove Access

### 4.8 Detail Page — Tabs

**Students Tab**:
- Student list table with: Name, Class, Level, Index Number
- IHL variant: Student ID (UIN/FIN) instead of Index Number
- Parent onboarding status indicator
- Legal guardian/caregiver indicator

**Details Tab**:
- Group name
- Created by (staff name)
- Created date
- Owners list (staff names)
- Is part of message group (boolean)

### 4.9 IHL vs MS Behavior

**IHL Schools**:
- File upload uses single "Student ID" column
- Group name uniqueness enforced
- Student lookup by UinFinNo
- Detail view shows Student ID instead of Index Number

**MS Schools**:
- File upload uses "Name" + "Class" columns
- Case-insensitive name matching
- Student lookup by name/class combination

### 4.10 Analytics Events

| Event | Trigger |
|-------|---------|
| NewCustomGroupButtonPressed | Create button clicked |
| CustomGroupCreated | Group successfully created |
| CustomGroupCreateButtonPressed | Create confirm clicked |
| CustomGroupSaveButtonPressed | Save (edit) clicked |
| CustomGroupEditButtonPressed | Edit button clicked |
| CustomGroupShareButtonPressed | Share button clicked |
| CustomGroupDeleteButtonPressed | Delete button clicked |
| CustomGroupRemoveAccessButtonPressed | Remove access clicked |
| CustomGroupUpdated | Edit completed |
| CustomGroupDeleted | Delete completed |
| CustomGroupViewed | Detail page loaded |
| CustomGroupShared | Share completed |
| CustomGroupStudentTabPressed | Students tab clicked |
| CustomGroupDetailsTabPressed | Details tab clicked |
| CustomGroupUploadViaExcelPressed | Upload button clicked |
| CustomGroupDropzoneDropFile | File dropped |
| CustomGroupExcelUploadSuccess | Upload validation passed |
| CustomGroupExcelUploadFailure | Upload validation failed |
| CustomGroupExcelUploadModalClose | Upload modal closed |
| CustomGroupCancelPressed | Cancel action |

---

## 5. API Contracts

### Base

- **Base URL**: `/api/v2`
- **Staff**: `/api/v2/staff/groups`
- **Auth**: SchoolStaffSessionMiddleware

### Response Wrapper (all endpoints)

```typescript
{ resultCode: number; message: string; body: T; metadata?: Record<string, any> }
```

---

### 5.1 POST `/staff/groups/custom` — Create Group

**Request**:
```typescript
{
  groupName: string;                    // 1-120 chars, trimmed
  selectedSchoolStudents: number[];     // Student IDs, no duplicates, max 5000
}
```

**Response**: `{ body: { id: number } }`

---

### 5.2 GET `/staff/groups/custom` — List Groups

**Query Params**: `type?: 'summary'`

**Response (summary)**:
```typescript
{
  body: Array<{
    id: number;
    groupName: string;
    numberOfStaff: number;
    numberOfStudents: number;
  }>
}
```

**Response (full)**:
```typescript
{
  body: Array<{
    id: number;
    groupName: string;
    createdBy: string;
    createdAt: Date;
    owners: Array<{ staffName: string; staffId: number }>;
    studentsList: Array<{
      studentId: number;
      studentName: string;
      gender: string;
      classSerialNo: string;
      className: string;
      levelCode: string;
      levelDescription: string;
      hasParentsOnboardedAndCanConsent?: boolean;
      hasLegalGuardianOrCaregiver?: boolean;
      uinFinNo?: string;
      displayName?: string;
    }>;
    isPartOfMessageGroup: boolean;
  }>
}
```

---

### 5.3 GET `/staff/groups/custom/:customGroupId` — Get Single Group

**Path Params**: `customGroupId: number`

**Response**: Same shape as full list (single object in array).

---

### 5.4 PUT `/staff/groups/custom/:customGroupId` — Edit Group

**Path Params**: `customGroupId: number`

**Request**:
```typescript
{
  groupName: string;                    // Max 120 chars
  selectedSchoolStudents: number[];     // Must be unique, max 5000
}
```

**Response**: `{ body: true }`

---

### 5.5 PUT `/staff/groups/custom/:customGroupId/share` — Share Group

**Path Params**: `customGroupId: number`

**Request**:
```typescript
{
  selectedStaff: number[];   // Staff IDs, must be unique, same school, not already owners
}
```

**Response**: `{ body: true }`

Triggers email notification to shared staff.

---

### 5.6 DELETE `/staff/groups/custom/:customGroupId` — Delete Group

**Path Params**: `customGroupId: number`

**Response**: `{ body: { success: boolean; reason?: string } }`

Fails with reason if staff is not the last owner.

---

### 5.7 PUT `/staff/groups/custom/:customGroupId/removeAccess` — Remove Own Access

**Path Params**: `customGroupId: number`

**Request**: None.

**Response**: `{ body: { success: boolean } }`

If staff is last owner, attempts delete instead.

---

### 5.8 POST `/staff/groups/custom/validateStudents` — Start File Validation

**Request (IHL)**:
```typescript
Array<{ studentId: string }>   // UinFinNo values
```

**Request (MS)**:
```typescript
Array<{ name: string; className: string }>
```

**Response**: `{ body: { token: string } }` (JWT token, 10-minute expiry)

---

### 5.9 POST `/staff/groups/custom/validateStudents/results` — Poll Validation Results

**Request**:
```typescript
{ token: string }
```

**Response**:
```typescript
{
  body: {
    status: 'pending' | 'success' | 'error';
    data: {
      validStudents: Array<{
        pgStudentId: number;
        studentId: string;
        studentName: string;
        className: string;
        classCode: string;
        levelCode: string;
        levelCodeDescription: string;
        uinFinNo?: string;
        indexNumber?: string;
        cca?: Array<{ ccaId: number; ccaDescription: string }>;
      }>;
      invalidStudents: Array<{
        message: string;        // Error reason
        row: number;            // Excel row number (starts at 2)
        studentId?: string;     // IHL
        name?: string;          // MS
        className?: string;     // MS
      }>;
    } | null;
    error: string | null;
  }
}
```

---

### 5.10 GET `/staff/groups/assigned` — Get Assigned Groups (Classes + CCAs)

**Query Params**: `type?: 'summary'`

**Response**:
```typescript
{
  body: {
    classes: Array<{
      className: string;
      classId: number;
      classCode: string;
      schoolId: number;
      academicYear: string;
      studentList?: Array<{
        classCode: string;
        className: string;
        displayName: string;
        classSerialNo: string;
        studentId: number;
        studentName: string;
        gender: string;
        hasParentsOnboardedAndCanConsent: boolean;
        hasLegalGuardianOrCaregiver: boolean;
      }>;
    }>;
    ccaGroups: Array<{ ccaId: number; ccaDescription: string }>;
  }
}
```

---

### 5.11 POST `/staff/groups/student/count` — Count Students in Groups

**Request**:
```typescript
{
  acadYear: string;
  studentGroups: Array<{ type: 'school'|'class'|'level'|'group'|'cca'; id: string }>;
}
```

**Response**: `{ body: { numberOfStudents: number } }`

---

### 5.12 GET `/staff/groups/cca/students/:ccaId` — Get CCA Students

**Path Params**: `ccaId: number`

**Response**:
```typescript
{
  body: {
    numOfStudents: number;
    cca: string;
    classes: Record<string, Array<{ classSerialNo: number; displayName: string; studentId: number; studentName: string }>>;
  }
}
```

---

## 6. Error Handling

### 6.1 Business Logic Errors

| Error | Message |
|-------|---------|
| Duplicate group name | "customGroup name duplicated" |
| Max students exceeded | "customGroup has reached the maximum student limit" |
| Duplicate students | "customGroups has duplicate elements" |
| Invalid student | "custom group has invalid student" |
| Group not found | "customGroups is not found" |
| Not last owner (delete) | "Invalid custom group or Staff not last owner" |

### 6.2 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Group not found |
| 500 | Internal error |
