# Story 8.2: 终端快照与聊天一致性诊断

Status: done

<!-- Note: Created after Story 8.1 completion. This story owns consistency diagnostic checks and diagnostic issue records only; Story 8.3 owns viewing/export/redaction UI, Story 8.4 owns capability labels, and Story 8.5 owns release checklist/smoke evidence. -->

## Story

As a maintainer,
I want consistency checks for terminal snapshots and chat state,
so that recovery bugs can be found before release.

## Acceptance Criteria

1. Given terminal sessions have snapshots and stream sequences, when terminal consistency diagnostics run, then the report identifies missing sequences, stale snapshots or mismatched exit state.
2. Given chat conversations have messages, dispatches and read state, when chat consistency diagnostics run, then the report identifies orphaned records, invalid status transitions and unread inconsistencies.
3. Given diagnostics find issues, when the user views results, then each issue includes affected entity ids, severity and recommended next action where possible.

## Tasks / Subtasks

- [x] Task 1: Add typed consistency diagnostics contracts and API surface (AC: 1-3)
  - [x] Extend `src-tauri/src/contracts/diagnostics.rs` with DTOs for consistency checks, issue profiles, issue kinds/scopes/severity, terminal check input summaries and chat check results.
  - [x] Add IPC commands in `src-tauri/src/gateway/diagnostics_commands.rs` for terminal consistency and chat consistency diagnostics; register them in `src-tauri/src/lib.rs` without bypassing existing command naming conventions.
  - [x] Add app-level use cases in `src-tauri/src/app/diagnostics/mod.rs`; keep validation/domain logic under `src-tauri/src/domain/diagnostics/mod.rs` or a focused submodule.
  - [x] Export generated TypeScript bindings to both `src/contracts/generated/diagnostics.ts` and `src-tauri/bindings/diagnostics.ts`; do not hand-edit generated binding output.
  - [x] Extend `src/shared/api/diagnostics-api.ts` and its tests so frontend callers use typed APIs, not raw Tauri calls.
  - [x] Add contract fixtures and manifest entries for both new diagnostics commands, including success and error cases.

- [x] Task 2: Implement terminal snapshot/stream consistency checks (AC: 1, 3)
  - [x] Check structured terminal session diagnostics input using only IDs, status, sequence numbers, timestamps, snapshot metadata and exit metadata; do not store or require raw terminal output text.
  - [x] Detect missing or non-contiguous output sequences.
  - [x] Detect stale snapshots, including snapshots whose `lastSeq` trails the latest observed output sequence or whose `updatedAtMs` is older than the latest observed output timestamp.
  - [x] Detect mismatched exit state, including exited sessions without exit reason and running/starting sessions that incorrectly carry an exit reason.
  - [x] Return issue profiles with `workspaceId`, `terminalSessionId`, optional `terminalTabId`, severity and recommended next action.
  - [x] Record each issue as a diagnostics event when an active run exists or a valid run id is supplied; disabled diagnostics still returns the report without creating a run.

- [x] Task 3: Implement chat consistency checks over SQLite state (AC: 2, 3)
  - [x] Add repository-level read-only diagnostics queries for conversations, messages, message mentions, read positions and dispatch requests.
  - [x] Detect orphaned records, including messages without a conversation, message mentions without message/conversation/member, read positions without conversation/message and dispatches whose source message references are missing.
  - [x] Detect invalid status/state combinations, including unknown message statuses, unknown dispatch statuses, dispatched rows without terminal session id and failed rows without failure code/message.
  - [x] Detect unread inconsistencies, including stored `conversations.unread_count` that does not match messages after `conversation_read_positions.last_read_message_id`/`last_read_at_ms`, and read positions pointing outside the conversation.
  - [x] Return issue profiles with affected `conversationId`, `messageId`, `memberId`, `dispatchId` and severity/action fields where available.
  - [x] Record each issue as a diagnostics event when diagnostics are active, using structured metadata only.

- [x] Task 4: Preserve diagnostics privacy and current workflow behavior (AC: 1-3)
  - [x] Keep diagnostics local-first and disabled by default; consistency checks are explicit commands, not startup background scans.
  - [x] Do not persist raw terminal chunks, chat bodies, private paths, environment variables, tokens, source snippets or provider secrets in diagnostic records, fixtures or tests.
  - [x] Ensure consistency check failures return recoverable `AppError` values without changing normal chat send, dispatch, terminal open/attach/write/close or settings behavior.
  - [x] Keep terminal runtime state authoritative in `src-tauri/src/app/terminal/mod.rs`; no durable terminal session store was added.

- [x] Task 5: Update fixture/data-integrity honesty boundaries (AC: 1-3)
  - [x] Update `fixtures/contracts/contract-fixtures.manifest.json` and contract fixture type coverage for new DTOs.
  - [x] Update data-integrity/schema fixtures only if the implementation adds or validates new persisted fields/tables; no new persisted fields/tables were added.
  - [x] Ensure data-integrity validation can still validate diagnostics run/event tables from Story 8.1 and does not claim diagnostics viewer/export behavior from Story 8.3.
  - [x] Keep fixture payloads redacted and metadata-only.

- [x] Task 6: Add focused tests and completion evidence (AC: 1-3)
  - [x] Add Rust tests for terminal missing sequence, stale snapshot and mismatched exit-state issues.
  - [x] Add Rust tests for chat orphan records, invalid status/state rows and unread-count mismatch issues.
  - [x] Add tests proving disabled diagnostics returns issue reports without creating run/event rows, and active diagnostics records consistency issue events.
  - [x] Add frontend/API tests for the new typed diagnostics API methods.
  - [x] Run binding export tests for diagnostics DTO changes: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib` and `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib`.
  - [x] Run `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build` and the IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.

- [x] Review Follow-ups (AI)
  - [x] [AI-Review][Medium] Validate explicit diagnostics `runId` existence/active status even when a consistency check produces zero issues.

## Dev Notes

### Scope Boundary

Story 8.2 owns consistency diagnostics only. It does not implement a diagnostics viewer, export package, redaction review UI, settings surface, capability status labels, release checklist, platform smoke execution, telemetry upload, cloud logging, terminal replay, chat repair execution or any automatic background scan.

The report may be returned directly by the new commands and may also write issue events into the Story 8.1 diagnostics event store when diagnostics are active. "When the user views results" in AC3 means the issue profiles returned by these commands and later listable diagnostic events contain enough structured context for Story 8.3 to display/export safely.

### Product Policy

- Diagnostics remain local-first, explicit and disabled by default.
- Consistency checks inspect structured state, not user content. Terminal input/output text and chat message bodies must not appear in diagnostic issue metadata, fixtures, event labels or error details.
- Prefer stable IDs and enum/status fields: `workspaceId`, `conversationId`, `messageId`, `memberId`, `dispatchId`, `terminalSessionId`, `terminalTabId`, sequence numbers and timestamps.
- Issue records must include severity and a recommended next action when the code can offer one.
- If a run id is supplied it must remain a valid active Story 8.1 diagnostics run. If no run id is supplied, active-run lookup stays workspace-scoped; no active run means the command still returns issues but records no events.

### Current Implementation State

- Story 8.1 added `diagnostics_runs` and `diagnostic_events`, DTOs, commands, app use cases, domain validation, SQLite repository and frontend helper/API.
- `RecordDiagnosticsEventRequest` already supports terminal/chat/member/window correlations and allowlisted metadata. Reuse it instead of creating a second event store.
- Terminal snapshots are currently in memory in `src-tauri/src/app/terminal/mod.rs`; `TerminalSessionProfile` includes `snapshot` and `exitReason`.
- `TerminalOutputEventPayload` carries monotonic `seq`, `kind`, `emittedAtMs` and chunk text. The consistency check should accept structured output summaries rather than raw chunks.
- Chat persistence is in workspace SQLite through `conversation_repository.rs` and `dispatch_repository.rs`. Current tables include `conversations`, `conversation_members`, `messages`, `message_mentions`, `conversation_read_positions`, `terminal_tabs`, `dispatch_requests`, `diagnostics_runs` and `diagnostic_events`.
- Story 7.8 added chat repair/clear maintenance. 8.2 should diagnose issues but not repair or clear them.

### Required Consistency Semantics

Terminal issue examples:

- `terminal.sequence.missing`: expected contiguous output sequence is absent.
- `terminal.snapshot.stale`: snapshot `lastSeq` or `updatedAtMs` trails observed stream metadata.
- `terminal.exitState.mismatch`: session status and exit reason disagree.

Chat issue examples:

- `chat.orphan.message`: message references a missing conversation.
- `chat.orphan.mention`: mention references a missing message, conversation or member.
- `chat.orphan.readPosition`: read position references a missing conversation or message.
- `chat.orphan.dispatch`: dispatch or dispatch source references a missing message/conversation/member.
- `chat.status.invalid`: persisted message/dispatch status is outside known enums, or state-specific required fields are missing.
- `chat.unread.mismatch`: stored conversation unread count differs from recomputed unread count.

Severity guidance:

- `error`: issue can break recovery, attach, dispatch, unread correctness or diagnostic trust.
- `warning`: issue indicates stale/incomplete metadata but the workflow may still continue.
- `info`: no issue or a low-risk observation only if useful; avoid noisy per-row success events.

### Architecture Compliance

- Contracts stay in `src-tauri/src/contracts/diagnostics.rs` and generated TS output under `src/contracts/generated`.
- Gateway commands stay in `src-tauri/src/gateway/diagnostics_commands.rs`.
- App use cases stay in `src-tauri/src/app/diagnostics/mod.rs`.
- Domain validation/classification stays in `src-tauri/src/domain/diagnostics/mod.rs` or a child module.
- SQLite read queries may live in `src-tauri/src/infrastructure/persistence/sqlite/diagnostics_repository.rs` if tightly coupled to issue event recording, or in a focused chat diagnostics repository if that better matches existing boundaries.
- Frontend access goes through `src/shared/api/diagnostics-api.ts`.
- IPC fields use camelCase via serde/ts-rs.
- Do not add npm or crate dependencies.

### Previous Story Intelligence

- Story 8.1 review tightened ULID validation and diagnostics schema validation. Preserve those guarantees for any new `runId`-accepting commands.
- Story 8.1 made diagnostics hooks best-effort for normal workflows. 8.2 explicit commands can return recoverable errors, but no normal workflow should start failing because consistency diagnostics exist.
- Story 7.8 established chat maintenance report patterns and tests. Reuse the SQL knowledge, but keep 8.2 read-only diagnostics separate from repair/clear actions.
- Story 1.6/1.7 fixture rules still apply: only claim implemented behavior in manifests and generated reports.

### Relevant Files To Read Before Coding

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/8-1-diagnostics-run-core-event-recording.md`
- `_bmad-output/implementation-artifacts/7-8-chat-data-repair-clear-maintenance.md`
- `src-tauri/src/contracts/diagnostics.rs`
- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/contracts/orchestration.rs`
- `src-tauri/src/app/diagnostics/mod.rs`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/app/orchestration/mod.rs`
- `src-tauri/src/domain/diagnostics/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/diagnostics_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- `src-tauri/migrations/workspace/202605121430__messages_read_positions.sql`
- `src-tauri/migrations/workspace/202605121700__message_mentions.sql`
- `src-tauri/migrations/workspace/202605122000__dispatch_requests.sql`
- `src-tauri/migrations/workspace/202605122100__diagnostics_runs.sql`
- `src/shared/api/diagnostics-api.ts`
- `src/shared/api/diagnostics-api.test.ts`
- `fixtures/terminal-streams/ordered-output.json`
- `fixtures/terminal-streams/out-of-order-arrival.json`
- `fixtures/terminal-streams/snapshot-recovery.json`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

### Testing Requirements

- Terminal diagnostics tests should exercise pure/domain logic with structured summaries and at least one app/use-case path that records issue events when a run is active.
- Chat diagnostics tests should use real workspace SQLite state and targeted SQL mutations for invalid/orphan states, rather than only constructing DTOs in memory.
- Add a negative test proving no diagnostic events are written when no active run exists.
- Add a positive test proving issue events are written with safe labels/correlation ids and metadata-only issue summaries when an active run exists.
- Contract fixture tests must cover serialization of the new command request/result/error DTOs.
- Generated TypeScript bindings must be regenerated through cargo tests, not edited by hand.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 8.2 acceptance criteria and Epic 8 boundaries.
- `_bmad-output/planning-artifacts/prd.md` - FR77, NFR39, NFR40 and NFR41.
- `_bmad-output/planning-artifacts/architecture.md` - local-first diagnostics, typed IPC, SQLite queryability and privacy constraints.
- `_bmad-output/implementation-artifacts/8-1-diagnostics-run-core-event-recording.md` - diagnostics run/event semantics and review fixes.
- `_bmad-output/implementation-artifacts/7-8-chat-data-repair-clear-maintenance.md` - chat maintenance SQL/test patterns.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Created Story 8.2 and updated sprint status to `ready-for-dev`, then `in-progress`.
- 2026-05-13: `cargo test --manifest-path src-tauri/Cargo.toml app::diagnostics -- --nocapture` passed after initial implementation (11 diagnostics tests).
- 2026-05-13: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib` passed (27 diagnostics binding exports).
- 2026-05-13: `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib` passed (27 diagnostics binding exports).
- 2026-05-13: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::terminal::export_bindings --lib` and `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::terminal::export_bindings --lib` passed to restore full terminal dependency bindings after diagnostics export.
- 2026-05-13: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::workspace::export_bindings --lib` and `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::workspace::export_bindings --lib` passed to restore full workspace dependency bindings after terminal export.
- 2026-05-13: `pnpm vitest run src/shared/api/diagnostics-api.test.ts` passed.
- 2026-05-13: `pnpm test:contracts` passed (78 fixture groups; 12 Rust fixture tests).
- 2026-05-13: `pnpm test:data-integrity` passed (schema/data fixture validator; 21 Rust schema/data fixture tests).
- 2026-05-13: `cargo fmt --manifest-path src-tauri/Cargo.toml --check` passed.
- 2026-05-13: `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-13: `cargo test --manifest-path src-tauri/Cargo.toml` passed after review follow-up (426 lib tests, 12 contract fixture tests, 21 schema/data fixture tests, 1 smoke scaffold test).
- 2026-05-13: `pnpm test` passed (frontend 6 files/118 tests, contract, data-integrity and smoke suites).
- 2026-05-13: `pnpm build` passed; Vite reported only the existing large chunk warning.
- 2026-05-13: IPC boundary scan completed with raw Tauri usage confined to shared API modules/tests and existing Rust `Channel`/`ConversationKind::Channel` string matches.

### Completion Notes List

- Added explicit terminal and chat consistency diagnostics IPC/API methods with generated Rust/TypeScript contracts and contract fixtures.
- Terminal consistency checks now accept metadata-only terminal session summaries and detect missing sequences, stale snapshots and exit-state mismatches without raw terminal text.
- Chat consistency checks now read workspace SQLite state and report orphan messages/mentions/read positions/dispatches, invalid message/dispatch states and unread-count mismatches without raw chat bodies.
- Consistency issues include affected entity ids, severity, safe metadata and recommended next action; when diagnostics are active, each issue records a structured diagnostic event in the Story 8.1 event store.
- Diagnostics remain disabled by default: checks still return issue reports, but no run is created and no events are written without an active run or valid explicit active run id.
- No diagnostics viewer/export UI, capability labels, release checklist, terminal replay store, chat repair action or new persisted schema was added in this story.
- Review fixed explicit `runId` validation so completed/nonexistent run ids are rejected even when a check produces zero issues.

### File List

- `_bmad-output/implementation-artifacts/8-2-terminal-snapshot-chat-consistency-diagnostics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/diagnostics/diagnostics-chat-consistency-run.error.json`
- `fixtures/contracts/diagnostics/diagnostics-chat-consistency-run.request.json`
- `fixtures/contracts/diagnostics/diagnostics-chat-consistency-run.result.json`
- `fixtures/contracts/diagnostics/diagnostics-terminal-consistency-run.error.json`
- `fixtures/contracts/diagnostics/diagnostics-terminal-consistency-run.request.json`
- `fixtures/contracts/diagnostics/diagnostics-terminal-consistency-run.result.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/diagnostics.ts`
- `src-tauri/bindings/terminal.ts`
- `src-tauri/src/app/diagnostics/mod.rs`
- `src-tauri/src/contracts/diagnostics.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/domain/diagnostics/mod.rs`
- `src-tauri/src/gateway/diagnostics_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/diagnostics_repository.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/contracts/generated/diagnostics.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/terminal.ts`
- `src/shared/api/diagnostics-api.test.ts`
- `src/shared/api/diagnostics-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 8.2 context from Epic 8, PRD, architecture, Story 8.1 and current code patterns. Status set to ready-for-dev.
- 2026-05-13: Implemented terminal snapshot and chat consistency diagnostics with typed APIs, issue event recording, fixtures and focused coverage.
- 2026-05-13: Completed review follow-up for explicit run validation and marked story done.

## Senior Developer Review (AI)

Review Date: 2026-05-13

Outcome: Approve

Findings: 1 patch finding fixed.

Review Notes:

- Fixed explicit diagnostics `runId` validation so consistency commands reject a completed/nonexistent run even when the check produces no issues and therefore would not otherwise attempt an event write.
- Confirmed terminal diagnostics use structured sequence/snapshot/exit metadata only and do not persist terminal text.
- Confirmed chat diagnostics are read-only for chat state and do not perform repair/clear behavior from Story 7.8.
- Confirmed Story 8.3/8.4/8.5 scope was not implemented early.
- Validation after review passed: `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml app::diagnostics -- --nocapture`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build`, and the IPC boundary scan.
