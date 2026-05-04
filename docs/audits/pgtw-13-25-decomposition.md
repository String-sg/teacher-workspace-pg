# PGTW-13..25 Decomposition & Ordering

## Context

PGTW-1..12 ([scoped here](pgtw-1-12-parity-scope.md)) were one cohesive subsystem — announcements + forms. PGTW-13..25 spans **six independent subsystems** that share little code or data with each other or with posts. This doc decomposes them, names dependencies, and recommends an order so that each subsystem can be brainstormed → spec'd → planned → built independently, the same way PGTW-1..12 was.

Each subsystem gets its **own** parity-scope audit (mirroring [pgtw-1-12-parity-scope.md](pgtw-1-12-parity-scope.md)) when it's pulled into a sprint. This file is the index, not the audit.

---

## Subsystems

| Tickets        | Subsystem                                                     | Audit doc                                                                            | Status             |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------ |
| 13, 14, 15, 20 | **Custom groups** (create, share, SC, delete)                 | [pgtw-13-20-custom-groups-parity-scope.md](pgtw-13-20-custom-groups-parity-scope.md) | Drafted 2026-04-30 |
| 16, 17         | **Reports** (Travel Declaration, PG Onboarding)               | _to write_                                                                           | Pending            |
| 18, 19         | **Access control** (90-day inactive logout, admin activation) | _to write_                                                                           | Pending            |
| 21, 22, 23     | **Meetings** (create, dashboard, management)                  | _to write_                                                                           | Pending            |
| 24             | **Login sync** (MIMS/Edupass between TW and PG)               | _to write_                                                                           | Pending            |
| 25             | **Calendar** (Google Calendar create)                         | _to write_                                                                           | Pending            |

---

## Subsystem blurbs

### Custom groups (PGTW-13/14/15/20)

PGW already has a complete `/groups` module ([pg-specs.md §7](../references/pg-specs.md), [pg-api-contract.md §8-9](../references/pg-api-contract.md)). On our side, custom groups are **consumed read-only** as a recipient scope in the posts flow ([student-recipient-selector.tsx](../../web/components/comms/student-recipient-selector.tsx)). What's missing is the management UI (create, edit, share, delete) and the Excel-upload pipeline. **IA decision:** custom groups live at the **platform level** as a peer of `/posts`, mirroring PGW's IA — they're a shared primitive consumed by Posts (today) and likely Meetings/Reports (later). PGTW-15 (SC = School Cockpit) is flagged as an open question pending PG-team clarification.

### Reports (PGTW-16/17)

Two read-only report tables — Travel Declaration and PG Onboarding — both gated to FT/co-FT and Admin roles. PGW spec at [pg-specs.md §8](../references/pg-specs.md). Each has filters (level / class), an `.xlsx` export, and a drill-down. No write path. Likely the smallest subsystem; can be done in one sprint.

### Access control (PGTW-18/19)

Cross-cutting infra: 90-day inactive logout (18) and PG-admin activation of staff (19). Touches session lifecycle and role provisioning. Likely impacts every other subsystem — if PGW enforces 90-day server-side, our BFF must coordinate; if PGW exposes admin activation only via School Cockpit, we may not implement (19) at all and just document it. Worth scoping early to know what dependencies the others inherit.

### Meetings (PGTW-21/22/23)

PGW has a Parent-Teacher Meeting (PTM) module ([pg-specs.md §6](../references/pg-specs.md)) with create-meeting, timeslot grid, dashboard, and parent-side booking. **No FE parallel in tw-pg-experiment today.** Largest unknown; needs the deepest discovery. Recommend front-loading the audit even if implementation comes later, so we know the scope before quoting.

### Login sync (PGTW-24)

MIMS/Edupass session sync between TW and PG. Pure infra. Likely a BFF concern — possibly out of FE scope entirely. Audit needs to clarify what "in-sync" means: shared session cookie, token exchange, or just a redirect dance.

### Calendar (PGTW-25)

Google Calendar integration. Needs OAuth scope, calendar API client, and a write path. PGW reference unclear from current docs. Treat as greenfield until proven otherwise. Likely depends on Meetings (PGTW-21..23) — calendar events are probably created from meetings.

---

## Dependencies

```
Access control (18/19) ──► gates session behavior for all others
Custom groups (13/14/15/20) ──► already a recipient scope in Posts; will likely feed Meetings recipient picker too
Meetings (21/22/23) ──► likely creates Calendar events (25) → soft dep
Login sync (24) ──► standalone, but blocks real-PGW e2e until resolved
Reports (16/17) ──► standalone
Calendar (25) ──► follows Meetings
```

Custom groups is the only subsystem with **upstream consumers already shipped** (the recipient selector relies on `customGroups`). Every day that custom groups is read-only, teachers can't create new audiences for posts. That's the highest-leverage parity gap on the board.

---

## Recommended order

Biggest visible gap per unit of work, factoring in dependencies and PG-team cycle time on open questions:

1. **Custom groups (13/14/15/20)** — highest leverage; unblocks recipient-selection flow on the existing posts feature; PGW spec is fully documented.
2. **Access control (18/19)** — small, infra-y, but answers shape downstream subsystems. Audit it early even if implementation lands later.
3. **Reports (16/17)** — small, self-contained, no FE prereq. Easy sprint filler.
4. **Meetings (21/22/23)** — biggest unknown; audit early so estimates are honest, even if build slides.
5. **Login sync (24)** — likely BFF-only; audit alongside meetings if timing allows.
6. **Calendar (25)** — depends on meetings; defer.

---

## How to use this doc

When starting a subsystem, copy the structure from [pgtw-1-12-parity-scope.md](pgtw-1-12-parity-scope.md):

1. Per-ticket: **PGW behavior → Current state → Gap → Files**
2. Cross-cutting gaps section
3. Suggested ordering
4. Open questions (frame under "PGW untouchable")
5. Error / edge-case sweep
6. Verification criteria

Drop the audit at `docs/audits/pgtw-<range>-<subsystem>-parity-scope.md`, then update the **Status** column above.
