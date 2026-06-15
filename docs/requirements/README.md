# PG ↔ TW Integration — Business Requirements

> **Source of truth: the GitHub epics.** These files mirror the issue bodies for in-repo reference, review and diffing. Edit the issue first, then re-sync the matching file here. Mirrors parent tracker [#1](https://github.com/String-sg/teacher-workspace-pg-frontend/issues/1).

> **Terminology note.** These reverse-engineered specs use **PG's real code terms** (Announcements, Consent Forms) so they stay accurate to the source. In the **TW product** these are rebranded: **Announcements → Posts**, **Forms / Consent Forms → Posts with responses**. The TW epics/issues use the new names; the underlying feature is the same.

> **Specs updated (Jun 2026):** the per-feature specs below are the engineering team's **Complete Redevelopment Specs** (authoritative - business logic, validation, API contracts). The platform-contract reference further down is retained for context.

## Epics

| #   | Epic                              | Requirements doc                                                                    | Issue                                                             |
| --- | --------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Posts: Create & Send      | [announcements-1](./announcements-1-pg-reverse-engineer-specs.md)           | [#20](https://github.com/String-sg/teacher-workspace-pg-frontend/issues/20) |
| 2   | Posts: Tracking & Chasing | [announcements-1](./announcements-1-pg-reverse-engineer-specs.md) | [#9](https://github.com/String-sg/teacher-workspace-pg-frontend/issues/9) |
| 3   | Posts with Responses        | [forms-1](./forms-1-pg-reverse-engineer-specs.md)                                   | [#5](https://github.com/String-sg/teacher-workspace-pg-frontend/issues/5) |
| 4   | Custom Student Groups             | [custom-groups-1](./custom-groups-1-pg-reverse-engineer-specs.md)                   | [#6](https://github.com/String-sg/teacher-workspace-pg-frontend/issues/6) |
| 5   | Parent-Teacher Meeting Scheduling | [ptm-1](./ptm-1-pg-reverse-engineer-specs.md)                                 | [#7](https://github.com/String-sg/teacher-workspace-pg-frontend/issues/7) |
| 6   | Reports                           | [reports-1](./reports-1-pg-reverse-engineer-specs.md)                                               | [#10](https://github.com/String-sg/teacher-workspace-pg-frontend/issues/10) |
| 7   | HeyTalia (AI Drafting Assistant)  | [heytalia-1](./heytalia-1-pg-reverse-engineer-specs.md)                                             | [#11](https://github.com/String-sg/teacher-workspace-pg-frontend/issues/11) |

## How these requirements were derived (read first)

The original TW ↔ PG parity work was built **directly against the PG (Parents Gateway) frontend** and was deliberately under-documented in Jira — the parity behaviour lived in the code. These epics have now been **reverse-engineered from two ground-truth sources in this repo**, so PG's team can break them down and re-implement in the new structure without re-reading the originals:

1. **The TW frontend** (`web/`) — working React/TS code for the features already built (Announcements, Forms/Consent, Custom Groups). These are _liftable_.
2. **The PG API contract** captured as Go-BFF fixtures (`server/internal/pg/fixtures/*.json`) and the mock router (`server/internal/pg/mock.go`). This is the closest thing to an executable parity spec and covers **every** domain — including the ones with no TW UI yet (PTM, HeyTalia, Reports).

Each feature in the child epics carries a **build-status flag**:

- ✅ **Built** — working FE code exists in this repo; can be lifted into the new structure.
- 🟡 **Contract-only** — PG API shape + BFF route exist, but no TW UI yet; start from the route contract.
- ⚪ **Not built / inferred** — epic or scraped-spec only; constraints are inferred and **must be confirmed with PG** before sizing.

Exact limits (char counts, file caps, enums) cite the source file/constant so they can be verified rather than trusted.

> **Phase-1 constraint:** the PGW backend is untouchable. All parity divergence is absorbed in the TW FE + Go BFF. No requirement below should be read as a request for a PGW backend change.

---

## Platform contract reference (shared by all epics)

### Two run modes

Toggled by `TW_PG_MOCK`. **Mock mode** (`server/internal/pg/mock.go`) serves fixtures and stubs writes — no DB/Redis/PGW creds needed. **Proxy mode** (`server/internal/pg/proxy.go`) reverse-proxies `GET|POST|PUT|DELETE /api/{path...}` verbatim to PGW. In proxy mode the BFF does **not** enumerate routes, so **`mock.go` is the de-facto route contract**. Note: the mock is _ahead_ of the FE on PTM/HeyTalia/Reports — those routes exist with no FE consumer yet.

### Endpoint inventory (base `/api/web/2/staff`, config/files at `/api/*`)

**Auth / session / config**

- `GET /session/current` — staff identity, school context, 2FA, `heyTaliaAccess`, session TTL
- `GET /users/me` — profile + recent logins
- `GET /api/configs` — feature flags + configs; `GET /api/feature/2/flags` — platform flags
- `PUT /{staffId}/updateDisplayName`, `PUT /{staffId}/updateDisplayEmail`

**Announcements** — `GET /announcements`, `/announcements/shared`, `/announcements/{id}`, `/announcements/drafts/{id}`, `/announcements/prefilled/{id}`; `POST /announcements` (send), `/announcements/drafts` (save), `/announcements/drafts/schedule` (schedule new), `/announcements/duplicate`, `/announcements/drafts/duplicate`, `/announcements/{id}/addStaffInCharge`, `/announcements/drafts/{id}/cancelSchedule`; `PUT /announcements/drafts/{id}`, `/announcements/{id}/enquiryEmailAddress`, `/announcements/{id}/removeAccess`, `/announcements/drafts/schedule/{id}` (schedule existing), `/announcements/drafts/{id}/rescheduleSchedule`; `DELETE /announcements/{id}`, `/announcements/drafts/{id}`.

**Consent forms** — mirror of announcements under `/consentForms*`, plus `PUT /consentForms/{id}/updateDueDate` and `PUT /consentForms/{id}/student/{studentId}/reply` (teacher-proxy YES/NO).

**Groups** — `GET /groups/assigned`, `/groups/custom`, `/groups/custom/{id}`, `/groups/classes/{classId}`, `/groups/cca/students/{ccaId}`; `POST /groups/custom` (create), `/groups/custom/validateStudents` + `/validateStudents/results` (Excel upload 2-step), `/groups/student/count`; `PUT /groups/custom/{id}`, `/groups/custom/{id}/share`, `/groups/custom/{id}/removeAccess`; `DELETE /groups/custom/{id}`.

**School data** — `GET /school/staff`, `/school/students`, `/school/groups` (classes), `/school/studentGroups`, `/school/staffGroups`, `/school/students/retrieveReport`; `POST /school/travelDeclaration`.

**PTM** — `GET /ptm`, `/ptm/serverdatetime`, `/ptm/{eventId}`, `/ptm/timeslots/{id}`, `/ptm/bookings/{id}`, `/ptm/schedule/{id}`, `/ptm/booking/{id}`, `/ptm/{eventId}/targetStudents`; `POST /ptm` (create), `/ptm/booking/{block|unblock|add|change|remove}`, `/ptm/booking/validate`, `/ptm/{eventId}/addStaffInCharge`; `PUT /ptm/{eventId}/removeAccess`, `/ptm/{eventId}/updateEnquiryEmail`; `DELETE /ptm/{eventId}`.

**HeyTalia** — `POST /heytalia/chat`, `/heytalia/feedback`, `/heytalia/email`, `/heytalia/upload-file`, `/heytalia/metrics`, `/heytalia/conversations/delete`, `/heytalia/conversations/system-message`; `GET /heytalia/email/recipients/history`, `/heytalia/conversations`, `/heytalia/conversations/{id}`.

**Notifications / misc** — `GET|PUT /notificationPreference`; `GET /api/web/2/webNotification`; `GET|POST|DELETE /messageGroups*`; `GET /hq-announcement-downloads/{code}`.

**Files (3-step upload, all domains)** — `POST /api/files/2/preUploadValidation` → presigned S3 POST → `GET /api/files/2/postUploadVerification?attachmentId=` (AV-scan poll); `GET /api/files/2/handleDownloadAttachment?attachmentId=`.

### Core data model

- **Session** (`session_current.json`): `staffId`, `staffName`, `isA` (admin), `staffSchoolId` (school context — one school per session, no switcher), `staffEmailAdd`, `schoolEmailAddress`, `is2FAAuthorized`, `sessionTimeLeft`, `displayName/displayEmail`, `isIhl`, `heyTaliaAccess`.
- **Post** (unified): the FE collapses announcements + consent forms into one `PGPost` discriminated on `kind: 'announcement' | 'form'`. Wire types stay separate; mappers converge them (`web/api/mappers.ts`). Enums: announcement status `POSTED|SCHEDULED|DRAFT|POSTING`; consent status `OPEN|CLOSED|DRAFT|POSTING|SCHEDULED`; response type `VIEW_ONLY|ACKNOWLEDGE|YES_NO` (**write-side asymmetry: acknowledge is sent as singular `ACKNOWLEDGEMENT`**); reminder type `NONE|ONE_TIME|DAILY`.
- **Targeting** — write payload sends `studentGroups[]`/`staffGroups[]` of `{type,label,value}`. PGW `ETargetType` = `school | level | class | group | cca | student`. FE→wire: `class→class, level→level, school→school, cca→cca, custom/teaching→group`. **Whole-school** = `type:'school'`; **custom group** = `type:'group'` with `customGroupId` as `value`.
- **Student** (`school_students.json`): `studentId, studentName, uinFinNo, classSerialNo, classCode, className, levelCode, levelDescription, cca[]`.
- **Staff** (`school_staff.json`): `staffId, name, email, className?`.
- **Custom group**: summary `{customGroupId, name, studentCount, createdByName, isShared, createdAt}` (mapped from raw `{id, groupName, owners[], studentsList[]}`); detail adds `sharedWith[]` + `students[]`.

### Auth / identity

Staff identity flows via `context.Context` (`identity.go`) and is re-stamped as `X-TW-Staff-ID` by the proxy director (which strips inbound spoofed values). Currently a **stub** pending TW auth middleware. PGW must whitelist TW's server IP and trust the header. OTPaaS/MIMS 2FA is validated only in proxy mode. CSRF: `-4013` triggers a one-shot token refresh + replay. Session expiry: `-401`/`-4012` → redirect `/session-expired`.

### Feature flags / config

`/api/configs` → `{flags, configs}`. Flags gating UI: `absence_submission`, `duplicate_announcement_form_post`, `heytalia_chat`, `schedule_announcement_form_post`. Configs block: `two_way_comms` (beta + school whitelist), `web_notification` (banner window), `absence_notification.blacklist`. Per-user HeyTalia entitlement is **not** a flag — it's `session.heyTaliaAccess`. Client memoises configs for 15 min; fetch failure falls back to all-off (no toast).

### Cross-cutting conventions

- **Timezone:** every teacher-entered date is anchored to **SGT (+08:00)**; bare dates (due date, reminder) become end-of-day `T23:59:59+08:00`. Load-bearing for Forms + Scheduling.
- **Error model:** PGW envelope `{resultCode, message, error:{errorReason, fieldPath, subCode}}`. Validation errors (`-400/-4001/-4003/-4004`) render **inline/silent** (no toast); `-429` toasts; `-404` not-found page.
- **Envelope:** real PGW wraps `{body, resultCode, message}`; detail endpoints return `body:[detail]` single-element arrays. Mock fixtures are raw.
- **No pagination** anywhere — lists return full arrays; own + shared lists are merged with own-wins dedup. At cohort scale this likely needs server pagination (flagged across epics).
- **Timeouts:** writes 30s, uploads 60s, AV-scan poll capped 30s/500ms.
- **Wire allowlist:** write mappers `satisfies PGWritePayload` — PGW rejects unknown keys (no `allowUnknown`), so every wire field must mirror PGW exactly.
