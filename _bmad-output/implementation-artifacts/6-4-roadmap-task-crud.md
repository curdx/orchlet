# Story 6.4: 路线图任务 CRUD

Status: done

## Story

As a workspace user,
I want to create and manage roadmap tasks,
So that project direction can be tracked near chat and terminal work.

## Acceptance Criteria

1. Given the user opens roadmap, when they create a task, then the task is persisted with title, description or equivalent detail, status and ordering metadata.
2. Given a roadmap task exists, when the user edits, deletes or views it, then the UI and persisted data reflect the change.
3. Given a roadmap task is referenced from chat attachment entry, when the user opens the reference, then the app navigates to or previews the relevant roadmap task.

## Tasks / Subtasks

- [x] Task 1: Add typed roadmap task contracts and persistence (AC: 1-2)
  - [x] Add DTOs for roadmap list/create/update/delete task commands and roadmap task records.
  - [x] Add workspace-local schema-versioned roadmap JSON persistence under `.orchlet/roadmap`.
  - [x] Persist task title, detail, status and ordering metadata.
  - [x] Validate workspace roots, task IDs, blank titles and unsupported status values.

- [x] Task 2: Add roadmap app logic and gateway commands (AC: 1-2)
  - [x] Implement list/create/update/delete task behavior in the Rust app layer.
  - [x] Preserve ordering metadata when tasks are edited and compact ordering after deletion.
  - [x] Register typed Tauri gateway commands.
  - [x] Return recoverable `AppError`s for validation and persistence failures.

- [x] Task 3: Add shared API and Roadmap UI (AC: 1-2)
  - [x] Add `roadmapApi` under `src/shared/api`.
  - [x] Add a Roadmap modal entry from the workspace shell.
  - [x] Let users create, view, edit status/detail/title and delete roadmap tasks.
  - [x] Keep UI state synchronized from command results, with recoverable toast feedback on failures.

- [x] Task 4: Connect chat roadmap attachment references (AC: 3)
  - [x] Change roadmap attachment entry from composition-only placeholder to a task reference picker.
  - [x] Insert a visible roadmap task reference chip once a task is selected.
  - [x] Open the referenced task from the chip by showing the Roadmap modal focused on that task.
  - [x] Preserve Story 2.7 boundaries for image upload and message attachment persistence.

- [x] Task 5: Add contract, data-integrity and focused behavior tests (AC: 1-3)
  - [x] Add contract fixtures and generated TS bindings for roadmap commands.
  - [x] Add schema/data-integrity fixture coverage for workspace roadmap task JSON.
  - [x] Test UI task create/edit/delete/view behavior.
  - [x] Test roadmap attachment references open the related roadmap task.
  - [x] Test Rust persistence/app behavior for validation, ordering and deletion.

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

Story 6.4 owns workspace roadmap task CRUD and opening roadmap task references from the existing chat attachment entry. It does not implement roadmap goals, completion percentage dashboards, goal-task rollups, file upload, message attachment persistence, remote sync, dispatch routing, notification behavior or legacy `.golutra` compatibility.

### Product Policy

- Roadmap task data is workspace-local state under `.orchlet/roadmap`.
- Task creation persists title, detail, status and ordering metadata in one command result.
- Blank titles are saved as `新任务` according to the UX spec.
- Task status is limited to pending, in progress and done for this story.
- Sorting/reorder controls may stay out of scope, but every persisted task must include stable ordering metadata.
- Chat roadmap attachments reference an existing task and open or preview that task; they do not persist as message attachments in this story.

### Current Implementation State

- Story 2.7 added image and roadmap composition attachment chips without roadmap CRUD or attachment persistence.
- Story 6.1 through 6.3 added typed skill contracts, workspace-local JSON patterns, data-integrity fixture updates and compact modal UI inside `WorkspaceSelectionPage`.
- Raw Tauri APIs remain isolated to `src/shared/api/*` and Rust gateway modules.
- Dedicated `features/manage-roadmap` and `entities/roadmap` folders are architectural targets, but the current UI still centralizes workspace shell behavior in `WorkspaceSelectionPage`.

### Technical Requirements

- Add `src-tauri/src/contracts/roadmap.rs` and generated `src/contracts/generated/roadmap.ts`.
- Add `src-tauri/src/domain/roadmap/mod.rs`, `src-tauri/src/app/roadmap/mod.rs`, `src-tauri/src/gateway/roadmap_commands.rs` and register modules/commands.
- Add workspace-local JSON persistence under `src-tauri/src/infrastructure/persistence/json_store`.
- Add shared frontend methods in `src/shared/api/roadmap-api.ts`.
- Add contract fixtures under `fixtures/contracts/roadmap` and update the fixture manifest.
- Add schema/data fixtures and data-integrity validation for roadmap storage.

### Architecture Compliance

- IPC payload fields must be camelCase via serde/ts-rs.
- App data and workspace data remain authoritative; frontend state updates only from command results.
- Workspace-local writes must use schema-versioned JSON and recoverable `AppError` failures.
- Browser fallback is only for local web preview/tests and must not claim desktop-only behavior.
- Pages/components must not import raw Tauri APIs.

### UX Requirements

- A `Roadmap` button opens a modal from the workspace shell.
- Modal supports close, add task, title/detail edit, status pill/menu and delete.
- Empty state should clearly invite creating the first roadmap task.
- Roadmap attachment entry uses a map/checklist affordance, displays a task title and opens the Roadmap modal focused on that task.
- Validation or persistence failures show recoverable toast feedback and preserve visible state from the last successful data.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/2-7-mentions-emoji-attachments-quick-prompts.md`
- `_bmad-output/implementation-artifacts/6-2-manage-skill-library-workspace-links.md`
- `_bmad-output/implementation-artifacts/6-3-delete-open-capability-classification.md`
- `src-tauri/src/app/skills/mod.rs`
- `src-tauri/src/contracts/skill.rs`
- `src-tauri/src/gateway/skills_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_skill_link_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/skills-api.ts`
- `src/App.test.tsx`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 6.4 acceptance criteria and Epic 6 context.
- `_bmad-output/planning-artifacts/prd.md` - FR61, FR72, FR73, NFR8, NFR14, NFR17.
- `_bmad-output/planning-artifacts/architecture.md` - roadmap module ownership, typed IPC and workspace-local persistence.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Roadmap modal and roadmap attachment behavior.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Story 6.4 created from sprint backlog, Epic 6 spec, Story 2.7 attachment state, Story 6.2/6.3 implementation patterns and roadmap UX requirements.
- 2026-05-13: Implemented workspace roadmap task contracts, JSON persistence, app CRUD logic, gateway commands and data-integrity coverage.
- 2026-05-13: Added Roadmap modal UI with create/edit/status/delete behavior and task reference selection from the chat composer.
- 2026-05-13: Added contract fixtures, generated bindings, schema/data fixtures, Rust tests and focused frontend tests for roadmap task CRUD and chat reference opening.
- 2026-05-13: Verification passed: `pnpm test:frontend -- src/App.test.tsx`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt`, `cargo fmt --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Added workspace-local `.orchlet/roadmap/tasks.json` persistence for roadmap task title, detail, status, sort order and timestamps.
- Added typed roadmap IPC commands for list/create/update/delete with recoverable validation and persistence errors.
- Added a Roadmap modal from the workspace shell and task reference picker/chips from the chat composer.
- Added manifest, contract fixture, data-integrity fixture, Rust and frontend coverage for roadmap task CRUD and reference opening.

### File List

- `_bmad-output/implementation-artifacts/6-4-roadmap-task-crud.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/roadmap/roadmap-task-create.error.json`
- `fixtures/contracts/roadmap/roadmap-task-create.request.json`
- `fixtures/contracts/roadmap/roadmap-task-create.result.json`
- `fixtures/contracts/roadmap/roadmap-task-delete.error.json`
- `fixtures/contracts/roadmap/roadmap-task-delete.request.json`
- `fixtures/contracts/roadmap/roadmap-task-delete.result.json`
- `fixtures/contracts/roadmap/roadmap-task-update.error.json`
- `fixtures/contracts/roadmap/roadmap-task-update.request.json`
- `fixtures/contracts/roadmap/roadmap-task-update.result.json`
- `fixtures/contracts/roadmap/roadmap-tasks-list.error.json`
- `fixtures/contracts/roadmap/roadmap-tasks-list.request.json`
- `fixtures/contracts/roadmap/roadmap-tasks-list.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/workspace/.orchlet/roadmap/tasks.json`
- `fixtures/schema/roadmap-v1/roadmap-tasks.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/roadmap.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/app/roadmap/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/roadmap.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/domain/roadmap/mod.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/gateway/roadmap_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
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
- `src/shared/api/index.ts`
- `src/shared/api/roadmap-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 6.4 context for roadmap task CRUD and chat roadmap task references.
- 2026-05-13: Completed roadmap task CRUD, chat roadmap task references, contract/data-integrity fixtures, tests and release build verification.
