# TW-PG Integration — Technical Briefing

**Date:** 2026-05-14
**Audience:** PG Engineering Team
**Repo:** `tw-pg-experiment` (fork of `String-sg/teacher-workspace`)

---

## 1. What We Built

Teacher Workspace (TW) integrates Parents Gateway (PG) as an embedded app — teachers get PG features (posts, forms, groups) inside the TW shell without leaving the platform. We built a **feature-complete frontend** for two PG modules plus a **Go BFF proxy layer** that talks to pgw-web, all without modifying the PG backend.

### Scope delivered

| Module                                    | Tickets                | Status                                                                                                     |
| ----------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Posts** (Announcements + Consent Forms) | PGTW-1 through PGTW-12 | Complete — full CRUD, drafts, scheduling, duplicating, file attachments, rich text, validation, CSV export |
| **Custom Groups**                         | PGTW-13, 14, 15, 20    | Complete — create, edit, delete, share with staff, Excel upload, student selection                         |

### By the numbers

- **373 commits** on `feat/posts-frontend` (Jan 5 – May 6, 2026)
- **~19,500 lines** of new frontend code (132 TS/TSX files)
- **~500 lines** of new Go code (4 files — proxy + mock handlers)
- **17 merged PRs** across the branch
- **3 contributors** (Reza, Shin, Yi Ming) + design input from Grace

---

## 2. Architecture — How It Works

### BFF Reverse Proxy

The Go BFF acts as a transparent reverse proxy to pgw-web. The browser never talks to PG directly.

```
Browser (TW SPA)
  ↓  TW session cookie
TW BFF (Go, :3000)
  ↓  X-TW-Staff-ID header + PG session cookie
pgw-web (Node/Express) — unchanged
  ↓
MySQL / Redis
```

**Key design decisions:**

1. **PG backend is untouchable** — every divergence is absorbed in our FE + BFF. We never propose pgw-web changes as a prerequisite for shipping.
2. **Auth translation** — TW authenticates via MIMS SSO, then establishes a PG session on behalf of the user. The BFF forwards requests with the real PG session cookie.
3. **Mock mode** — `TW_PG_MOCK=true` serves fixture JSON from disk. No DB, Redis, or pgw-web needed. This is how designers and FE devs work day-to-day.
4. **Proxy mode** — `TW_PG_MOCK=false` reverse-proxies to a real pgw-web instance. Used for integration testing.

### Frontend API Layer

```
React Route Loader
  → web/api/client.ts (typed fetch wrapper)
    → web/api/mappers.ts (PG response → internal types)
      → web/api/types.ts (branded IDs, discriminated unions)
```

- Every PG endpoint has a typed client function (`fetchPosts`, `createDraft`, `duplicateAnnouncement`, etc.)
- Response mappers normalize PG's shapes into our internal types — all PG quirks (wrapped arrays, inconsistent field names, nullable vs missing) are absorbed here
- Branded `PostId` types prevent mixing announcement IDs with consent form IDs at compile time
- `PGError` hierarchy maps PG's `resultCode` values into typed error classes (`PGValidationError`, `PGNotFoundError`, `PGRedirectError`, etc.)

---

## 3. What Was Built — Feature Breakdown

### Posts (PGTW-1 through PGTW-12)

| Ticket  | Feature                  | What we did                                                                                                                                                                                                                          |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PGTW-1  | Post type selection      | Modal picker: "Post" vs "Post with Response". Sets `kind` in reducer, conditionally renders form sections. Single `/posts/new` route dispatches to `/announcements/*` or `/consentForms/*` endpoints based on kind.                  |
| PGTW-3  | Schedule post            | `SchedulePickerDialog` with calendar + 15-min time slots (7:00 AM – 9:45 PM). Schedule, reschedule, and cancel-schedule actions. Dispatches to PG's 4 separate schedule endpoints. Failure surfacing via `scheduledSendFailureCode`. |
| PGTW-4  | Duplicate post           | Kebab menu action → `POST /announcements/duplicate` or `/consentForms/duplicate`. Deep-link toast to new draft. Feature-flag gated.                                                                                                  |
| PGTW-5  | Save as draft + autosave | Manual save button + 30-second autosave interval. `useAutoSave` hook with AbortController. `useUnsavedChangesGuard` for beforeunload. Dirty-state machine prevents phantom saves.                                                    |
| PGTW-7  | Staff-in-charge          | Helper text per post kind. Unknown-staff chip fallback when staff ID doesn't resolve.                                                                                                                                                |
| PGTW-8  | Rich text editor         | Tiptap editor restricted to PGW's ProseMirror allowlist (bold, italic, underline, link, ordered/unordered list). Toolbar uses shadcn Button primitives.                                                                              |
| PGTW-9  | Read status & CSV export | Read-status stat cards, click-through detail. CSV export with injection protection (prefix `=`, `+`, `-`, `@` cells with `'`). Column toggle.                                                                                        |
| PGTW-10 | Shared creator name      | Mine / Shared tab axis. Shared posts show original creator name.                                                                                                                                                                     |
| PGTW-11 | Form validation          | Required-field enforcement on submit. PG `resultCode` errors mapped to specific form fields via `mapValidationErrors`.                                                                                                               |
| PGTW-12 | Reminders                | Default-reminder info display. Custom reminder with date clamped to [tomorrow, dueDate−1]. Inline validation error on out-of-range.                                                                                                  |

**Additional post features built (not individual tickets):**

- Consent form parity — event dates, venue, due date, custom questions, website links, shortcuts
- File/photo attachments — upload, preview, round-trip on edit, consent-form detail
- Filter popover — Status, Response type, Date range, Mine/Shared axes
- Posted-edit mode — locked fields with opacity, neutral banner showing editable fields
- Recipient table — search, chips, unified columns, status badges
- CSRF retry — automatic one-shot retry on `-4013` error code
- Abort timeout — 30-second AbortController timeout on all write/upload calls
- PG redirect handling — `-4031` codes routed to `/session-expired`

### Custom Groups (PGTW-13, 14, 15, 20)

| Ticket   | Feature                | What we did                                                                                                                                                                                             |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PGTW-13a | Groups module shell    | `/groups` route, sidebar nav, `CustomGroupsTable` (empty + populated), `AssignedGroupsSection` card grid, `+ Create custom group` CTA                                                                   |
| PGTW-13b | Add students           | `/groups/customGroups/new/addStudents` subpage. `StudentResultsTable` with selection. `StudentFilterBar` with search + Level + Form Class filters. Round-trip back to create page.                      |
| PGTW-13c | Detail + edit + save   | Detail page with Students + Details tabs. `StudentsByClassList` table (Index, CCA columns). Edit page reuses `AddStudentsView`. `createCustomGroup` / `updateCustomGroup` API. UIN/FIN masking for PII. |
| PGTW-13d | Excel upload           | `.xlsx` file upload for bulk student addition to custom groups                                                                                                                                          |
| PGTW-14  | Share with staff       | `ShareGroupModal` with staff picker + permissions list. Pre-selects already-shared staff. `shareCustomGroup` API call.                                                                                  |
| PGTW-20  | Delete / remove access | Delete with confirmation checkbox modal. Conditional Delete vs Remove Access based on shared state (matching PGW behavior).                                                                             |

---

## 4. How We Developed — Approach & Process

### Development workflow

1. **Spec from PGW** — We reverse-engineered PG's UI and API by inspecting the live pgw-web app. API contract documented in `docs/references/pg-api-contract.md` (~1300 lines). Full FE spec in `docs/references/pg-specs.md`.

2. **Mock-first development** — BFF serves fixture JSON matching real PG response shapes. FE developers work against fixtures without needing a running pgw-web. Fixtures are validated against the real API contract.

3. **Parity audits** — Before building each subsystem, we wrote a gap-analysis doc comparing PGW behavior to our current state, ticket by ticket. See:
   - `docs/audits/pgtw-1-12-parity-scope.md` (Posts)
   - `docs/audits/pgtw-13-20-custom-groups-parity-scope.md` (Groups)

4. **Spec → brainstorm → plan → build** — Each ticket went through: design spec, implementation plan (in `docs/plans/`), then code. Plans live in the repo as dated markdown files.

5. **Branch-per-ticket** — Each PGTW ticket gets a feature branch off `feat/posts-frontend`. PRs merge back to `feat/posts-frontend`, not `main`.

6. **Integration testing against real PGW** — Proxy mode (`TW_PG_MOCK=false`) points at a local pgw-web running in Docker (`docker-compose.yml` with MySQL master/replica + Redis). Setup documented in `docs/setup/local-pgw-web.md`.

### Design system

- Started with `@flow/core` (MOE design system)
- Migrated to **shadcn/ui + Base UI** primitives with Radix Colors for broader component coverage
- Custom semantic token layer (`--primary`, `--destructive`, `--success`, `--warning`, etc.) bridging shadcn conventions with MOE visual identity
- Tailwind CSS 4 for all styling

### Testing

- **Go:** Standard `go test` with `want/got` assertion style
- **Frontend:** Vitest + React Testing Library + jsdom
- Test files ported from pgw-web where they existed (draft manager, validation, rich-text schema)
- Manual verification via curl and browser for every endpoint

---

## 5. What We Need from PG Team

These are documented in detail in `docs/references/pg-team-asks.md`. Summary:

### Three pgw-web changes (to remove BFF fallback complexity)

1. **IP allowlist** — Allowlist TW's server IP so we can proxy requests
2. **Trust `X-TW-Staff-ID` header** — For requests from allowlisted IP, accept this header as authenticated identity (skip session cookie validation)
3. **Skip CSRF for allowlisted requests** — Server-to-server calls don't need CSRF

Without these three changes, TW carries a fallback layer (PG session cookie storage + CSRF capture-and-replay + silent MIMS re-auth) that adds complexity and fragility.

### Open questions

- Staging pgw-web base URL for integration testing
- IP allowlist timeline (staging → production)
- Whether PGTW-15 (School Cockpit groups) is in scope
- Feature flag source-of-truth (PG's `/api/configs` vs TW-side flags)
- Session expiry coordination (90-day inactive logout — PGTW-18)

---

## 6. What's Next — Remaining Subsystems

From `docs/audits/pgtw-13-25-decomposition.md`:

| Tickets          | Subsystem                                        | Status                              |
| ---------------- | ------------------------------------------------ | ----------------------------------- |
| PGTW-13/14/15/20 | Custom Groups                                    | **Done**                            |
| PGTW-16/17       | Reports (Travel Declaration, PG Onboarding)      | Not started — small, self-contained |
| PGTW-18/19       | Access Control (90-day logout, admin activation) | Not started — cross-cutting infra   |
| PGTW-21/22/23    | Meetings (PTM)                                   | Not started — largest unknown       |
| PGTW-24          | Login Sync (MIMS/Edupass)                        | Not started — likely BFF-only       |
| PGTW-25          | Calendar (Google Calendar)                       | Not started — depends on Meetings   |

**Recommended order:** Reports (smallest) → Access Control (unblocks infra questions) → Meetings (biggest, needs early audit) → Login Sync → Calendar.

---

## 7. Repo Structure

```
tw-pg-experiment/
├── server/
│   ├── cmd/tw/             # Go entrypoint
│   └── internal/pg/        # PG proxy + mock handlers + fixtures
│       ├── proxy.go        # Reverse proxy to pgw-web
│       ├── mock.go         # Mock handler serving fixture JSON
│       └── fixtures/       # JSON fixtures matching PG API shapes
├── web/
│   ├── api/                # PG API client, types, mappers
│   ├── components/
│   │   ├── posts/          # Post-specific components
│   │   ├── groups/         # Group-specific components
│   │   └── ui/             # shadcn primitives (Button, Dialog, etc.)
│   ├── containers/         # Page-level views (PostsView, CreatePostView, GroupsView, etc.)
│   └── lib/                # Shared utilities
├── docs/
│   ├── references/         # PG API contract, specs, team asks
│   ├── audits/             # Parity gap analyses
│   ├── plans/              # Implementation plans (dated)
│   ├── architecture/       # RFCs and design decisions
│   └── setup/              # Local dev setup guides
└── docker-compose.yml      # MySQL + Redis for local pgw-web
```

---

## 8. Key Documentation

| Document                                  | Purpose                                    |
| ----------------------------------------- | ------------------------------------------ |
| `docs/references/pg-api-contract.md`      | Full PG endpoint reference (~1300 lines)   |
| `docs/references/pg-specs.md`             | Module-by-module FE spec                   |
| `docs/references/pg-bff-design.md`        | BFF proxy architecture (ideal vs fallback) |
| `docs/references/pg-team-asks.md`         | What we need from PG team                  |
| `docs/audits/pgtw-1-12-parity-scope.md`   | Posts parity gap analysis                  |
| `docs/audits/pgtw-13-25-decomposition.md` | Remaining subsystems breakdown             |
| `docs/setup/local-pgw-web.md`             | How to run pgw-web locally                 |
| `docs/architecture/backend-rfc-028.md`    | BFF architecture rationale                 |
