# Feature Specification: HeyTalia (AI Assistant)

**Feature Branch**: `007-heytalia`
**Created**: 2026-06-09
**Status**: Reverse-Engineered (brief)
**Input**: Reverse-engineered from existing codebase (`src/shared/components/HeyTalia/`, `src/app/actions/heyTalia*.ts`)

---

> ⚠️ **Out of Phase-1 scope.** **HeyTalia is NOT in the PGTW Phase-1 backlog — there is no PGTW story for it.** In `pgw-web` it is beta-gated behind a feature flag plus an explicit `heyTaliaAccess` allowlist, with `TODO: Remove … when HeyTalia is generally available` comments — i.e. a not-yet-GA pilot, not a parity baseline. Treat this spec as reference for later, not current parity work.

---

## Overview

HeyTalia ("Talia") is an in-app AI assistant for school staff, mounted as a header widget (`HeyTaliaHeaderWidget` in `NavBar`) that opens a resizable right-hand chat sidebar (`ChatSidebar`). It helps staff **draft announcements and consent forms** through chat, then either **insert the AI draft into the real creation flow** (creating a draft and navigating to it) or **send the draft by email for human vetting**. It supports file upload (PDF/DOCX) for summarisation, RAG-style knowledge answers with sources, persistent conversation history, and per-message + general feedback. Access is **beta-gated**: rendered only when `flags.heytalia_chat.enabled` AND the user has `heyTaliaAccess`. All endpoints sit under `POST/GET /api/web/2/staff/heytalia/*`.

---

## User Scenarios & Testing

### US-1: Open Talia and start a drafting session

**As a** school staff member with beta access,
**I want to** open the Talia sidebar and pick a quick action,
**So that** I can begin drafting with AI help.

**Acceptance Criteria:**

- A "HeyTalia" button appears in the nav header (gated by `heytalia_chat` flag + `heyTaliaAccess`); a preview bubble shows on load for ~5s.
- Opening the sidebar restores prior state from `localStorage` and fetches history (`GET /api/web/2/staff/heytalia/conversations?limit=100`).
- **Quick actions**: "Create announcement" and "Create form" (`ActionType = 'announcement' | 'form'`) seed the conversation intent.

### US-2: Generate an AI draft via chat

**As a** staff member,
**I want to** describe what I need and have Talia produce a structured draft,
**So that** I can review it before using it.

**Acceptance Criteria:**

- Sending a message → `POST /api/web/2/staff/heytalia/chat` (handles conversation append + metrics).
- Responses carry `structuredData.type` of `announcement_draft`, `form_draft`, `knowledge_response`, `chat_response`, or `clarification_request`.
- Drafts can include `placeholderFields` (`[For input]` blanks), a detected `dateFormat`, and `validation_status` / `validation_error`.
- Knowledge responses render `sources` (filename + S3 URI) via a Reference modal.
- Optional **file upload** (PDF/DOCX, with char-count metadata) via `POST /api/web/2/staff/heytalia/upload-file`.

### US-3: Use the AI draft in the real creation flow (integration seam)

**As a** staff member,
**I want to** turn a generated draft into a real PG draft,
**So that** I can finish and post it in the normal editor.

**Acceptance Criteria:**

- "Use draft" (`handleUseDraft`) parses the message JSON and:
  - `announcement_draft` → `transformAnnouncementDraft` → `AnnouncementDraftService.post` → navigates to `/announcements/drafts/{id}`.
  - `form_draft` → `transformConsentFormDraft` → `ConsentFormDraftService.post` → navigates to `/consentForms/drafts/{id}`.
- A `prefill` metric is logged on success/failure.
- If required `[For input]` placeholders are unfilled, draft creation fails with a prompt to fill them.

### US-4: Send a draft by email for vetting

**As a** staff member,
**I want to** email a draft to a colleague for approval,
**So that** it can be vetted before going out to parents.

**Acceptance Criteria:**

- "Send email" opens `AddRecipientsModal` (recipient history pre-fetched: `GET /api/web/2/staff/heytalia/email/recipients/history?limit=5`), then an `EmailPreviewModal` with editable rich-text (TipTap) subject/body.
- Sending → `POST /api/web/2/staff/heytalia/email` with recipients, `draftContentJson`, attribution, subject, `ccEmail` (sender), `senderName`.
- On success an in-chat **email receipt** message records per-recipient `success`/`failed` status.

### US-5: Conversation history and feedback

**As a** staff member,
**I want** my chats saved and a way to rate responses,
**So that** I can resume work and help improve Talia.

**Acceptance Criteria:**

- History list + load + delete: `GET .../conversations`, `GET .../conversations/{id}`, `POST .../conversations/delete`.
- Per-message thumbs feedback (`responseGood`, optional `feedbackTag`, `feedbackText`) and general feedback (`feedbackText`, `rating`) → `POST /api/web/2/staff/heytalia/feedback`.
- Engagement metrics → `POST /api/web/2/staff/heytalia/metrics`; session tracked client-side via `sessionManager`.

---

## Requirements

### Functional Requirements

- **FR-1**: Beta-gate rendering behind `flags.heytalia_chat.enabled` + `heyTaliaAccess`.
- **FR-2**: Chat through `POST .../heytalia/chat`; classify responses by `structuredData.type`.
- **FR-3**: Two entry intents — announcement and form (`QuickActions`).
- **FR-4**: "Use draft" creates a real Announcement/Consent-Form draft and navigates to its editor URL (the integration seam).
- **FR-5**: "Send email" routes a draft for human vetting with editable preview and per-recipient receipt.
- **FR-6**: Persist + restore session/messages in `localStorage`; persist conversations server-side (list/load/delete).
- **FR-7**: Support PDF/DOCX upload for summarisation with char-count metadata.
- **FR-8**: Capture per-message and general feedback; log engagement metrics.
- **FR-9**: Surface RAG sources, draft validation errors, and `[For input]` placeholder fields.

### Key Entities

| Entity            | Description                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ChatMessage`     | A message (`user`/`assistant`/`system`) with optional `structuredData`, `fileAttachment`, `emailReceipt`              |
| `structuredData`  | Typed payload: `announcement_draft` / `form_draft` / `knowledge_response` / `chat_response` / `clarification_request` |
| `FileAttachment`  | Uploaded PDF/DOCX metadata (name, size, charCount, type)                                                              |
| Conversation      | Server-persisted chat thread (list/load/delete)                                                                       |
| `emailReceipt`    | Per-recipient send result for the vetting email                                                                       |
| Session / metrics | Client `sessionManager` tracking active/idle time                                                                     |

---

## Success Criteria

1. Beta-eligible staff can open Talia, draft an announcement or form via chat, and review structured output.
2. "Use draft" reliably creates the corresponding PG draft and lands the user in the real editor.
3. "Send email" delivers the draft for vetting and reports per-recipient status.
4. Conversations persist and reload; feedback and metrics are recorded.

---

## Assumptions

1. The chat/email/metrics endpoints are BFF proxies fronting an LLM service (chat handles conversation persistence + metrics server-side; email generates final HTML Lambda-side).
2. `senderName`/`staffEmailAdd` come from Redux `indexPage`; `ccEmail` is the sender's own email.
3. Draft transforms (`transformAnnouncementDraft`, `transformConsentFormDraft`) map AI JSON onto the existing Announcement/Consent-Form draft schemas.
4. The S3 source URIs in knowledge responses point at an internal document store for RAG.

---

## Integration Seam (if PG ever pulls it into scope)

The load-bearing coupling is `handleUseDraft` in `ChatSidebar.tsx` — it POSTs an AI-generated payload to `AnnouncementDraftService` / `ConsentFormDraftService` and then navigates to `/announcements/drafts/{id}` or `/consentForms/drafts/{id}`. This is a **prefilled-draft handoff** into the existing creation flows (it creates a real server-side draft, then deep-links to that draft's editor — no magic-link token). The parallel email path (`POST .../heytalia/email`) is the vetting handoff. Any future TW adoption needs those draft-service transforms and the draft editor routes to exist on the TW side.

---

## Jira Mapping

**No PGTW story exists for HeyTalia** — out of Phase-1 scope. This spec is forward-looking reference only.
