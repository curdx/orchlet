# Story 6.5: 路线图目标、状态与进度

Status: done

## Story

As a workspace owner,
I want roadmap goals and progress to be visible,
So that collaborators can understand execution state.

## Acceptance Criteria

1. Given roadmap goals are configured, when the user views roadmap, then goals are shown with related tasks and progress.
2. Given a task status changes, when progress is recalculated, then completion progress updates consistently.
3. Given roadmap data write fails, when the user saves a change, then the app reports the failure and preserves unsaved input where possible.

## Tasks / Subtasks

- [x] Task 1: Add typed roadmap goal contracts and persistence (AC: 1, 3)
  - [x] Add DTOs for roadmap goal list/create/update/delete commands and goal records.
  - [x] Add workspace-local schema-versioned roadmap goals JSON under `.orchlet/roadmap`.
  - [x] Persist goal title, related task IDs and ordering metadata.
  - [x] Validate workspace roots, goal IDs, blank titles, duplicate related task IDs and ordering metadata.

- [x] Task 2: Add roadmap goal app logic and gateway commands (AC: 1, 3)
  - [x] Implement goal list/create/update/delete behavior in the Rust app layer.
  - [x] Validate related task IDs against persisted roadmap tasks when supplied.
  - [x] Register typed Tauri gateway commands.
  - [x] Return recoverable `AppError`s for validation and persistence failures.

- [x] Task 3: Add data-integrity and contract coverage for goals (AC: 1, 3)
  - [x] Add contract fixtures and generated TS bindings for roadmap goal commands.
  - [x] Add storage manifest category and validation check for roadmap goals.
  - [x] Add schema/data-integrity fixtures for workspace roadmap goals.
  - [x] Update fixture validators and Rust fixture tests.

- [x] Task 4: Add goal/progress UI in the Roadmap modal (AC: 1-3)
  - [x] Load and display roadmap goals alongside tasks.
  - [x] Let users add/edit/delete goals and choose related tasks.
  - [x] Show per-goal progress and overall task completion from current task statuses.
  - [x] Preserve unsaved goal input when save fails and show recoverable toast feedback.

- [x] Task 5: Add focused behavior tests (AC: 1-3)
  - [x] Test configured goals show related tasks and progress.
  - [x] Test task status changes recalculate progress consistently.
  - [x] Test goal save failure reports an error while preserving unsaved input.
  - [x] Test Rust goal validation, related task checks and persistence behavior.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test:frontend -- src/App.test.tsx`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 6.5 owns roadmap goals, task status-driven progress display and save-failure preservation for roadmap goal edits. It does not implement remote sync, notifications, task dependencies, priority/reorder drag-and-drop, message attachment persistence, dispatch routing or legacy `.golutra` compatibility.

### Product Policy

- Roadmap goals are workspace-local state under `.orchlet/roadmap`.
- Goals relate to existing roadmap task IDs; invalid related IDs are recoverable validation errors.
- Overall completion is derived from task statuses; it is not separately persisted.
- Goal progress is derived from related tasks; a goal with no related tasks shows 0% complete.
- Failed goal saves must leave the user's draft visible so they can retry.

### Current Implementation State

- Story 6.4 added `.orchlet/roadmap/tasks.json`, typed task CRUD IPC, Roadmap modal, chat task references and data-integrity coverage.
- Roadmap task status already supports `pending`, `inProgress` and `done`.
- Raw Tauri APIs remain isolated to `src/shared/api/*` and Rust gateway modules.

### Technical Requirements

- Extend `src-tauri/src/contracts/roadmap.rs` and generated `src/contracts/generated/roadmap.ts`.
- Extend `src-tauri/src/domain/roadmap/mod.rs`, `src-tauri/src/app/roadmap/mod.rs` and `src-tauri/src/gateway/roadmap_commands.rs`.
- Add workspace-local goal JSON persistence under `src-tauri/src/infrastructure/persistence/json_store`.
- Extend `src/shared/api/roadmap-api.ts`.
- Extend Roadmap modal state in `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`.
- Add contract fixtures, schema/data fixtures and validators for roadmap goals.

### Architecture Compliance

- IPC payload fields must be camelCase via serde/ts-rs.
- Workspace-local writes must use schema-versioned JSON and recoverable `AppError` failures.
- Frontend state updates only from command results; unsaved drafts may remain local after failed saves.
- Pages/components must not import raw Tauri APIs.

### UX Requirements

- Roadmap modal shows a goal area above tasks.
- Goal title saves on blur/Enter; blank goal title falls back to the previous title or a default `新目标`.
- Related tasks can be toggled for a goal.
- Progress is visible as task count and percent, including after task status changes.
- Save failures show recoverable toast feedback and keep the edited input visible.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/6-4-roadmap-task-crud.md`
- `src-tauri/src/app/roadmap/mod.rs`
- `src-tauri/src/contracts/roadmap.rs`
- `src-tauri/src/domain/roadmap/mod.rs`
- `src-tauri/src/gateway/roadmap_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_roadmap_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src/shared/api/roadmap-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 6.5 acceptance criteria and Epic 6 context.
- `_bmad-output/planning-artifacts/prd.md` - FR62, FR72, FR73, NFR8, NFR14, NFR17.
- `_bmad-output/planning-artifacts/architecture.md` - roadmap module ownership, typed IPC and workspace-local persistence.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Roadmap modal goal input, task status and footer progress behavior.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Story 6.5 created from sprint backlog, Epic 6 spec, Story 6.4 implementation state and Roadmap modal UX requirements.
- 2026-05-13: Implemented workspace roadmap goal contracts, JSON persistence, app CRUD logic, gateway commands and data-integrity coverage.
- 2026-05-13: Added Roadmap modal goals area with related task toggles, per-goal progress, overall completion and failed-save draft preservation.
- 2026-05-13: Added contract fixtures, schema/data fixtures, Rust tests and frontend behavior tests for roadmap goals and progress.
- 2026-05-13: Verification passed: `pnpm test:frontend -- src/App.test.tsx`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt`, `cargo fmt --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Added workspace-local `.orchlet/roadmap/goals.json` persistence for goal title, related task IDs, ordering metadata and timestamps.
- Added typed roadmap goal IPC commands for list/create/update/delete with recoverable validation, persistence errors and related task ID checks.
- Roadmap task deletion now removes deleted task references from persisted goals to avoid dangling task IDs.
- Added a Roadmap modal goal area with create/edit/delete controls, related task toggles and progress derived from current task statuses.
- Goal save failures show recoverable toast feedback while preserving the user's unsaved title/task selection draft.
- Added manifest, contract fixture, data-integrity fixture, Rust and frontend coverage for roadmap goals, progress recalculation and failed-save preservation.

### File List

- `_bmad-output/implementation-artifacts/6-5-roadmap-goals-status-progress.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/roadmap/roadmap-goal-create.error.json`
- `fixtures/contracts/roadmap/roadmap-goal-create.request.json`
- `fixtures/contracts/roadmap/roadmap-goal-create.result.json`
- `fixtures/contracts/roadmap/roadmap-goal-delete.error.json`
- `fixtures/contracts/roadmap/roadmap-goal-delete.request.json`
- `fixtures/contracts/roadmap/roadmap-goal-delete.result.json`
- `fixtures/contracts/roadmap/roadmap-goal-update.error.json`
- `fixtures/contracts/roadmap/roadmap-goal-update.request.json`
- `fixtures/contracts/roadmap/roadmap-goal-update.result.json`
- `fixtures/contracts/roadmap/roadmap-goals-list.error.json`
- `fixtures/contracts/roadmap/roadmap-goals-list.request.json`
- `fixtures/contracts/roadmap/roadmap-goals-list.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/workspace/.orchlet/roadmap/goals.json`
- `fixtures/data-integrity/valid-json-stores/workspace/.orchlet/roadmap/tasks.json`
- `fixtures/schema/roadmap-v1/roadmap-goals.json`
- `fixtures/schema/roadmap-v1/roadmap-tasks.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/roadmap.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/roadmap/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/roadmap.rs`
- `src-tauri/src/domain/roadmap/mod.rs`
- `src-tauri/src/gateway/roadmap_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_roadmap_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/roadmap.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/roadmap-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 6.5 context for roadmap goals, status-driven progress and failed-save preservation.
- 2026-05-13: Completed roadmap goals, status-driven progress, failed-save preservation, contract/data-integrity fixtures, tests and release build verification.
