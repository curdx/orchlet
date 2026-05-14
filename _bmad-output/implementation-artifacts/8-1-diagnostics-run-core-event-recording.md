# Story 8.1: 诊断 run 与核心事件记录

Status: done

<!-- Note: Created after Epic 7 completion. This story starts the diagnostics foundation only; later Epic 8 stories own consistency checks, diagnostics viewing/export, capability labeling and release gates. -->

## Story

As a maintainer,
I want diagnostic runs to correlate frontend, backend, terminal, chat, member and window events,
so that issues can be investigated from a single timeline.

## Acceptance Criteria

1. Given diagnostics are enabled for a run, when frontend events, backend events, terminal sessions, conversations, members or window events occur, then records include a diagnostic run id and enough correlation ids to trace the workflow.
2. Given diagnostic logging is disabled by default, when normal usage occurs, then the app avoids high-noise or high-sensitive diagnostic output.
3. Given a diagnostic record is written, when persistence fails, then the app reports or degrades without breaking the user workflow.

## Tasks / Subtasks

- [x] Task 1: Add typed diagnostics contracts and IPC commands (AC: 1-3)
  - [x] Add `src-tauri/src/contracts/diagnostics.rs` DTOs for diagnostic run start/complete, event record and event timeline list.
  - [x] Include enums for run status/outcome, event scope (`frontend`, `backend`, `terminal`, `chat`, `member`, `window`) and event severity.
  - [x] Include a correlation object with optional `workspaceId`, `conversationId`, `messageId`, `memberId`, `terminalSessionId`, `terminalTabId`, `windowLabel` and `dispatchId`.
  - [x] Expose Tauri commands in `src-tauri/src/gateway/diagnostics_commands.rs`, app use cases in `src-tauri/src/app/diagnostics/mod.rs`, and register them in `src-tauri/src/lib.rs` and `src-tauri/src/gateway/mod.rs`.
  - [x] Export TypeScript bindings through `ts-rs` into `src/contracts/generated/diagnostics.ts`, `src/contracts/generated/index.ts` and `src-tauri/bindings/diagnostics.ts`; do not hand-edit generated bindings.
  - [x] Add `src/shared/api/diagnostics-api.ts` with typed methods; frontend/page code must not call raw Tauri APIs.
  - [x] Add contract fixtures and manifest entries for start, complete, record and timeline list success/error cases.

- [x] Task 2: Persist workspace-scoped diagnostic runs/events with low-noise defaults (AC: 1-3)
  - [x] Add a workspace SQLite migration for `diagnostics_runs` and `diagnostic_events` under `src-tauri/migrations/workspace`.
  - [x] Add `src-tauri/src/infrastructure/persistence/sqlite/diagnostics_repository.rs`; reuse `open_workspace_database`, schema migration conventions and `rusqlite`.
  - [x] `diagnostics_run_start` creates an active run for the requested workspace and records a backend lifecycle event with the run id.
  - [x] `diagnostics_run_complete` marks the run completed, records outcome/summary, and prevents later event writes to that run.
  - [x] `diagnostics_event_record` records only when an active run exists for the workspace or a valid active `runId` is supplied; otherwise return `recorded = false` with a skipped reason and do not persist anything.
  - [x] Store only structured IDs, event labels, timestamps, severity and small allowlisted metadata; do not store raw terminal output, chat bodies, source snippets, environment variables, tokens or full filesystem paths.
  - [x] Bound metadata key/value length and event label length; reject or truncate unsafe input predictably in the domain layer.
  - [x] On write failures, return recoverable `AppError` for explicit diagnostics commands, but ensure diagnostics helper calls used by normal workflows never fail the user action they are observing.

- [x] Task 3: Add minimal frontend diagnostics recording helper (AC: 1-3)
  - [x] Add a small helper under `src/shared/monitoring` or `src/shared/api` that can record frontend/window events through `diagnosticsApi` when an active run id is known.
  - [x] Ensure no automatic high-volume logging runs on app startup or normal usage by default.
  - [x] Add a safe way for feature code/tests to pass correlation ids without raw user text.
  - [x] Do not build a diagnostics dashboard, export flow, settings page or redaction UI in this story; Story 8.3 owns viewing/export.

- [x] Task 4: Add core event hooks without broad workflow regression (AC: 1-3)
  - [x] Record backend lifecycle events for diagnostics run start/complete.
  - [x] Add targeted event recording for at least one representative chat workflow, one terminal workflow, one member workflow and one window/workspace workflow, using existing typed IDs only.
  - [x] Helper-based event recording must be best-effort; failures must be visible to diagnostics command callers but must not break chat send, terminal open, member invite or window context flows.
  - [x] Preserve existing command behavior, query/cache behavior and user-facing error semantics for the observed workflows.

- [x] Task 5: Update storage manifest, schema/data fixtures and validation (AC: 1-3)
  - [x] Add manifest entries for diagnostics run/event storage in `src-tauri/src/infrastructure/persistence/storage_manifest.rs`.
  - [x] Update `fixtures/schema/sqlite-workspace-v1/schema-manifest.json` to include diagnostics tables and migration file(s); remove `diagnostics` from `ownedByFutureStories`.
  - [x] Extend data-integrity validation only for the implemented diagnostics tables/fixtures; do not claim terminal snapshot consistency, chat consistency or export packages yet.
  - [x] Add fixture type coverage in `tests/contract/contract-fixture-types.ts` and `tests/data-integrity/data-integrity-fixture-types.ts` only where the new DTOs/fixtures require it.

- [x] Task 6: Add focused coverage and completion evidence (AC: 1-3)
  - [x] Add Rust tests for active run creation, disabled-by-default skipped recording, correlated event insertion, completed-run rejection and persistence failure/degrade behavior.
  - [x] Add frontend/API tests for typed diagnostics API calls and the frontend recording helper's disabled/failure paths.
  - [x] Add contract fixture tests for new diagnostics DTOs and commands.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib` and `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib` if diagnostics DTOs change.
  - [x] Run `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build` and the IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.

## Dev Notes

### Scope Boundary

Story 8.1 owns the diagnostics run/event recording foundation only. It does not implement terminal snapshot consistency checks, chat consistency checks, diagnostics viewer UI, diagnostics export packages, redaction review UI, capability status labels, release checklist, release notes, telemetry upload, cloud logging, old `golutra` import, or platform-specific packaged smoke execution.

### Product Policy

- Diagnostics are local-first and disabled by default. Normal app usage must not start a run or persist high-noise traces unless a run is explicitly enabled through the diagnostics API/test harness.
- Diagnostic records must be useful for correlation, not content replay. Prefer stable IDs and event names over raw text.
- Privacy defaults from PRD/architecture apply: do not upload or persist source, raw terminal output, chat text, environment variables, tokens, private path fragments or provider secrets.
- If diagnostics persistence fails while explicitly using diagnostics commands, report a recoverable error with affected workspace/run scope and a next action.
- If best-effort diagnostics hooks fail while observing a normal workflow, swallow the diagnostics failure after debug-safe reporting so the observed workflow continues.

### Current Implementation State

- There is no diagnostics domain/module yet. Create new modules rather than folding diagnostics into data-integrity, terminal, chat or settings.
- Existing `AppError` already has optional `correlationId`, but current fixtures set it to `null`; this story should not rewrite every existing error to attach diagnostics ids.
- Workspace SQLite already exists at `workspaces/<workspaceId>/orchlet.sqlite`; current tables include members, conversations, messages, mentions, read positions, terminal tabs and dispatch requests.
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json` currently lists `diagnostics` under `ownedByFutureStories`; Story 8.1 must update that honesty boundary when diagnostics tables are implemented.
- Raw Tauri calls are currently isolated in `src/shared/api/*` and tests; maintain that boundary.
- Settings/Profile UI contains data maintenance controls from Story 7.8; do not add diagnostics UI there for this story.

### Required Diagnostics Semantics

- A run has `runId`, `workspaceId`, status, reason/label, `startedAtMs`, optional `completedAtMs`, optional outcome and optional summary.
- An event has `eventId`, `runId`, `workspaceId`, `scope`, `eventName`, `severity`, correlation ids, allowlisted metadata entries and `recordedAtMs`.
- Active-run lookup must be workspace-scoped. If no active run exists, event recording returns a skipped success rather than creating a run silently.
- `diagnostics_run_complete` must be idempotent for already completed runs only if it returns the existing completed run without adding duplicate completion events; otherwise report a recoverable error with clear action.
- Timeline list should return events ordered by `recordedAtMs`, then `eventId`; no export, compression or redaction packaging is required yet.
- Use ULID ids and `now_ms()` timestamp patterns already used by chat/member/workspace stores.

### Architecture Compliance

- Contracts: `src-tauri/src/contracts/diagnostics.rs`, re-exported from `src-tauri/src/contracts/mod.rs` and generated to `src/contracts/generated`.
- Gateway: `src-tauri/src/gateway/diagnostics_commands.rs`; register commands in `src-tauri/src/lib.rs`.
- Use cases: `src-tauri/src/app/diagnostics/mod.rs`.
- Domain validation: `src-tauri/src/domain/diagnostics/mod.rs`.
- Persistence: `src-tauri/src/infrastructure/persistence/sqlite/diagnostics_repository.rs` plus workspace migration SQL.
- Frontend API: `src/shared/api/diagnostics-api.ts`; helper under `src/shared/monitoring` if needed.
- IPC fields use camelCase through serde/ts-rs and generated TypeScript bindings.
- Do not add npm or crate dependencies. Use existing React 19, TanStack Query 5, Tauri 2, rusqlite 0.39, Vitest and ts-rs patterns.

### Project Structure Notes

- `features/diagnostics-export` is an architectural placeholder for later viewing/export; do not create a large feature route for 8.1 unless tests need a tiny helper.
- Keep diagnostics repository independent from data-integrity validation. Data-integrity may validate diagnostics schema after the tables exist, but it must not become the writer of diagnostics runs/events.
- Avoid a global in-memory singleton as the source of truth. Active run state must be persisted or derived from workspace SQLite so tests and later windows can correlate consistently.
- If adding helper calls to existing chat/terminal/member/window workflows, keep them narrowly scoped and best-effort.

### Previous Story Intelligence

- Story 7.8 reinforced fixture honesty: only add manifest/schema/data fixtures for implemented storage and avoid claiming future diagnostics export or repair-history capabilities.
- Story 7.8 also preserved raw Tauri API boundaries through `src/shared/api/chat-api.ts`; diagnostics UI/helper code must follow the same pattern.
- Story 7.6/7.7 are still part of the current dirty worktree. Preserve their settings and terminal-output changes; do not revert or reshape settings architecture.
- Story 3.6 already uses the term "terminal environment diagnostics" for CLI/path visibility. Do not confuse that UI with the new Epic 8 diagnostics run/event store.
- Story 1.6/1.7 established storage manifest, schema/data fixture and smoke scaffold honesty rules. New diagnostics tables require migration, manifest and fixture updates in the same story.

### Relevant Files To Read Before Coding

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/1-6-storage-manifest-schema-validation-report.md`
- `_bmad-output/implementation-artifacts/1-7-test-contract-fixture-desktop-smoke-scaffolding.md`
- `_bmad-output/implementation-artifacts/3-6-cli-environment-resolution-error-recovery-session-snapshot.md`
- `_bmad-output/implementation-artifacts/7-8-chat-data-repair-clear-maintenance.md`
- `src-tauri/src/contracts/common.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/workspace_database.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src/shared/api/client.ts`
- `src/shared/api/errors.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/pages/terminal/TerminalPage.tsx`
- `src/App.test.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

### Testing Requirements

- Rust repository/use-case tests must verify actual SQLite rows and active/completed run behavior, not only DTO shapes.
- Disabled-by-default coverage must prove normal record attempts do not create a run or event.
- Persistence failure coverage can use invalid workspace id, read-only/unopenable DB setup, or repository error injection consistent with existing test patterns.
- Frontend tests should mock `diagnosticsApi` through typed helpers, not raw Tauri APIs.
- Contract and data-integrity fixture tests must remain honest: no terminal snapshot/chat consistency/export fixtures until Stories 8.2/8.3 implement them.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 8 and Story 8.1 acceptance criteria.
- `_bmad-output/planning-artifacts/prd.md` - FR76, NFR39, NFR40, NFR41 and diagnostics privacy requirements.
- `_bmad-output/planning-artifacts/architecture.md` - diagnostics correlation, local SQLite persistence, typed IPC, storage manifest and privacy constraints.
- `_bmad-output/implementation-artifacts/1-6-storage-manifest-schema-validation-report.md` - storage manifest/schema fixture honesty rules.
- `_bmad-output/implementation-artifacts/1-7-test-contract-fixture-desktop-smoke-scaffolding.md` - contract/data/smoke test scaffolding rules.
- `_bmad-output/implementation-artifacts/7-8-chat-data-repair-clear-maintenance.md` - latest story patterns for contracts, SQLite maintenance, fixtures and review evidence.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib` passed (16 diagnostics binding exports).
- 2026-05-13: `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib` passed (16 diagnostics binding exports).
- 2026-05-13: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::data_integrity::export_bindings --lib` passed after adding diagnostics storage categories.
- 2026-05-13: `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::data_integrity::export_bindings --lib` passed after adding diagnostics storage categories.
- 2026-05-13: `cargo test --manifest-path src-tauri/Cargo.toml app::diagnostics -- --nocapture` passed (5 diagnostics tests).
- 2026-05-13: `pnpm vitest run src/shared/api/diagnostics-api.test.ts src/shared/monitoring/diagnostics.test.ts` passed (2 files, 5 tests).
- 2026-05-13: `pnpm test:contracts` passed (76 fixture groups; 12 Rust fixture tests).
- 2026-05-13: `pnpm test:data-integrity` passed (schema/data fixture validator; 21 Rust schema/data fixture tests).
- 2026-05-13: `cargo fmt --manifest-path src-tauri/Cargo.toml --check` passed.
- 2026-05-13: `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-13: `cargo test --manifest-path src-tauri/Cargo.toml` passed (408 lib tests, 12 contract fixture tests, 21 schema/data fixture tests, 1 smoke scaffold test).
- 2026-05-13: `pnpm test` passed (frontend 6 files/118 tests, contract, data-integrity and smoke suites).
- 2026-05-13: `pnpm build` passed; Vite reported only the existing large chunk warning.
- 2026-05-13: IPC boundary scan completed with raw Tauri usage confined to shared API modules/tests and the existing Rust `Channel` contract.
- 2026-05-13: Review follow-up `cargo test --manifest-path src-tauri/Cargo.toml app::diagnostics -- --nocapture` passed (7 diagnostics tests).
- 2026-05-13: Review follow-up full validation passed: `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build`, and IPC boundary scan.

### Completion Notes List

- Added the diagnostics run/event foundation with typed Rust DTOs, TS bindings, Tauri IPC commands, app use cases, domain normalization and workspace SQLite persistence.
- Diagnostics remain disabled by default: event recording without an active run returns `recorded=false` and does not create a run or event.
- Added lifecycle timeline behavior: start writes `diagnostics.run.started`, complete writes `diagnostics.run.completed`, completed runs reject further explicit event writes, and list returns timeline ordering by timestamp then event id.
- Added privacy-preserving metadata validation and correlation handling; event metadata rejects sensitive keys and truncates bounded labels/values, and returned event correlations always include the run workspace id.
- Added best-effort diagnostics hooks for representative chat send, terminal open, member invite and workspace/window flows without changing observed workflow errors.
- Added frontend diagnostics API and helper tests for typed IPC calls, disabled recording and API failure degradation.
- Updated storage manifest, SQLite schema fixture, data-integrity checks/reports and contract fixtures for diagnostics run/event storage without claiming later export, snapshot or consistency features.
- Review fixed stricter diagnostics run id validation and partial diagnostics schema detection in data-integrity validation.

### File List

- `_bmad-output/implementation-artifacts/8-1-diagnostics-run-core-event-recording.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/diagnostics/diagnostics-event-record.error.json`
- `fixtures/contracts/diagnostics/diagnostics-event-record.request.json`
- `fixtures/contracts/diagnostics/diagnostics-event-record.result.json`
- `fixtures/contracts/diagnostics/diagnostics-events-list.error.json`
- `fixtures/contracts/diagnostics/diagnostics-events-list.request.json`
- `fixtures/contracts/diagnostics/diagnostics-events-list.result.json`
- `fixtures/contracts/diagnostics/diagnostics-run-complete.error.json`
- `fixtures/contracts/diagnostics/diagnostics-run-complete.request.json`
- `fixtures/contracts/diagnostics/diagnostics-run-complete.result.json`
- `fixtures/contracts/diagnostics/diagnostics-run-start.error.json`
- `fixtures/contracts/diagnostics/diagnostics-run-start.request.json`
- `fixtures/contracts/diagnostics/diagnostics-run-start.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/diagnostics.ts`
- `src-tauri/migrations/workspace/202605122100__diagnostics_runs.sql`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/diagnostics/mod.rs`
- `src-tauri/src/app/members/mod.rs`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/diagnostics.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/domain/diagnostics/mod.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/gateway/diagnostics_commands.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/diagnostics_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/mod.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/diagnostics.ts`
- `src/contracts/generated/index.ts`
- `src/shared/api/diagnostics-api.test.ts`
- `src/shared/api/diagnostics-api.ts`
- `src/shared/api/index.ts`
- `src/shared/monitoring/diagnostics.test.ts`
- `src/shared/monitoring/diagnostics.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 8.1 context for diagnostics run and core event recording.
- 2026-05-13: Implemented diagnostics run/event contracts, persistence, IPC, frontend helper, core best-effort hooks, storage/data-integrity fixtures and focused coverage.
- 2026-05-13: Completed code review follow-ups for run id validation and diagnostics schema validation; marked story done.

## Senior Developer Review (AI)

Review Date: 2026-05-13

Outcome: Approve

Findings: 2 patch findings fixed.

Review Notes:

- Fixed diagnostics `runId` validation so explicit run operations reject non-ULID identifiers before querying storage.
- Fixed diagnostics data-integrity validation so a partially migrated diagnostics schema no longer passes when only one diagnostics table exists; validation now checks run and event table shapes when initialized.
- Added Rust coverage for invalid explicit run ids and partial diagnostics schema rejection.
- Confirmed no diagnostics dashboard/export/redaction UI, terminal snapshot consistency, chat consistency, capability label or release checklist scope was added in Story 8.1.
- Validation after review passed: `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml app::diagnostics -- --nocapture`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build`, and the IPC boundary scan.
