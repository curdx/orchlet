# Story 3.3: Terminal tabs 的创建、恢复、搜索和排序

Status: done

<!-- Note: Created after Story 3.2 completion to continue Epic 3 in sprint order. -->

## Story

As a terminal-heavy user,
I want to manage terminal tabs,
so that multiple command contexts remain findable and organized.

## Acceptance Criteria

1. Given the terminal window is open, when the user creates, closes or restores a terminal tab, then tab state and attached session state update consistently.
2. Given multiple tabs exist, when the user pins, sorts or moves a tab, then the tab order and pin state persist for the workspace.
3. Given many tabs exist, when the user searches tabs, then matching tabs are findable by label, shell or relevant session metadata.

## Tasks / Subtasks

- [x] Task 1: Add typed terminal tab contracts, fixtures and generated bindings (AC: 1-3)
  - [x] Add Rust DTOs for terminal tab profile/list/create/close/restore/update operations using camelCase `serde` and `ts-rs` exports.
  - [x] Include `TerminalTabProfile` fields sufficient for UI and persistence: `schemaVersion`, `tabId`, `workspaceId`, `terminalSessionId`, optional `memberId`, `label`, `shell`, `status`, `isPinned`, `sortIndex`, `createdAtMs`, `updatedAtMs`, and optional `closedAtMs`.
  - [x] Add stable recoverable errors for invalid tab id, tab not found, restore failure, duplicate/invalid ordering, persistence failure and session creation/close failures.
  - [x] Add contract fixtures and TypeScript fixture validators for tab list/create/close/restore/update result shapes.
  - [x] Regenerate `src/contracts/generated/terminal.ts`, `src/contracts/generated/index.ts` if needed, and `src-tauri/bindings/terminal.ts`.

- [x] Task 2: Persist workspace terminal tab state (AC: 1-2)
  - [x] Add a workspace SQLite migration for a `terminal_tabs` table; do not persist terminal output, scrollback or snapshots in this story.
  - [x] Add a terminal tab repository under `src-tauri/src/infrastructure/persistence/sqlite/` with create/list/update/close/restore helpers and deterministic ordering: pinned first, then `sortIndex`, then stable created/id tie-breakers.
  - [x] Update storage manifest, storage/data integrity contracts, schema fixtures and data integrity validation to include the new terminal tab store.
  - [x] Preserve existing workspace database migrations and current chat/member/contact validation behavior.

- [x] Task 3: Add Rust-owned tab/session orchestration (AC: 1-2)
  - [x] Extend terminal app logic so creating a tab can start a new PTY session even when another workspace/member session already exists; preserve Story 3.1 `terminal_open` reuse semantics.
  - [x] Implement list/create/close/restore/update use cases that keep tab records and `TerminalRuntimeState` session status in sync.
  - [x] Closing a tab must close the attached PTY through the existing lifecycle path and mark the tab closed without deleting durable tab metadata.
  - [x] Restoring a closed tab must create a replacement session from persisted tab metadata and update `terminalSessionId`; do not implement scrollback/snapshot recovery here.
  - [x] Pin/sort/move updates must persist across terminal window remounts and app restarts via workspace SQLite.

- [x] Task 4: Wire terminal tab IPC through gateway and shared frontend API (AC: 1-3)
  - [x] Register terminal tab commands in `src-tauri/src/gateway/terminal_commands.rs` and `src-tauri/src/lib.rs`.
  - [x] Extend `src/shared/api/terminal-api.ts` with typed tab list/create/close/restore/update methods and browser fallback state for multiple tabs.
  - [x] Keep raw Tauri `invoke`/`listen` usage confined to shared API modules/tests.
  - [x] Do not add unrelated Tauri permissions, dialog/opener access, shell plugins or broad terminal window capabilities.

- [x] Task 5: Build tab UI behavior on the terminal page without React-owned terminal output (AC: 1-3)
  - [x] Replace the single-session header control model with a compact terminal tab bar, new-tab action, recent-closed/restore affordance and search input/popover matching the UX spec.
  - [x] Selecting a tab attaches/subscribes to its `terminalSessionId`; output for inactive tabs must not be stored in React state.
  - [x] Closing the active tab calls the tab close API and updates visible status; restoring a tab calls restore and focuses the restored tab.
  - [x] Pinning and moving/sorting tabs update persisted order and render pinned tabs first.
  - [x] Search matches by label, shell and relevant session metadata such as member label/session id; selecting a result focuses that tab.
  - [x] Keep pane layout, tab drag-to-pane, terminal text find, snapshot recovery, CLI path diagnostics, chat dispatch, notifications and terminal-output-to-chat out of this story.

- [x] Task 6: Add focused tests for tabs, persistence and regressions (AC: 1-3)
  - [x] Add Rust tests for tab repository ordering/persistence, create/list/close/restore/update use cases, invalid ids, missing tabs and session orchestration.
  - [x] Add contract fixture tests for terminal tab DTOs and new storage/data integrity categories.
  - [x] Add frontend tests for list-on-load, create tab, close/restore, active tab switching, pin/sort persistence calls and search filtering/selection.
  - [x] Keep Story 3.1/3.2 terminal open/reuse, lifecycle, renderer batching/input/resize and contract tests green.

- [x] Task 7: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test:frontend`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=bindings cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 3.3 owns terminal tab creation, close, restore, active selection, pinning, sorting/moving and tab search. Do not implement pane layouts, drag-to-pane assignment, terminal text find/highlight, persisted scrollback/snapshots, CLI environment resolution, launch diagnostics beyond existing lifecycle errors, chat-to-terminal dispatch, notifications, DND/busy queues, terminal output-to-chat, settings UI or roadmap/task behavior.

### Current Implementation State

- Story 3.2 is complete at commit `856702f Complete story 3.2 terminal lifecycle IPC`.
- Terminal lifecycle commands currently include `terminal_open`, `terminal_attach`, `terminal_input`, `terminal_resize` and `terminal_close`.
- `TerminalRuntimeState` stores PTY sessions in memory by `terminalSessionId`, plus a workspace/member key map used for `terminal_open` reuse.
- `terminal_open` currently reuses the running session for a workspace/member key; 3.3 must add a create-new-session path for new tabs without breaking this reuse behavior.
- `TerminalSessionProfile` includes `cols` and `rows`; status updates are emitted through `terminal-status-change`.
- `TerminalPage` currently attaches one active session, writes output through `XtermRendererAdapter`, forwards `onData` input, sends resize events and closes the current session. It does not have tab state yet.
- There is no `terminal_tabs` table, terminal tab repository, tab DTOs, tab fixtures, tab API facade or tab UI.

### Technical Requirements

- Use ULID strings for `tabId` and `terminalSessionId`; use millisecond timestamps.
- Store terminal tab metadata in workspace app-data SQLite (`workspaces/<workspaceId>/orchlet.sqlite`) because tab order/pin state must persist for the workspace.
- Persist only tab metadata and its current/last attached session id. Do not persist terminal output chunks, xterm buffer, scrollback, snapshots, command history or PTY handles in this story.
- Recommended tab statuses: `open` and `closed`. If additional status is needed, keep it distinct from `TerminalSessionStatus` and document the mapping.
- Closing a tab should call the existing Rust lifecycle close path for its attached session, then mark the tab closed with `closedAtMs`.
- Restoring a closed tab should create a new PTY session from the tab metadata and update the tab to `open` with the new `terminalSessionId`. Snapshot/scrollback recovery belongs to Story 3.6.
- Creating multiple workspace shell tabs must not collapse to one reused workspace session. Add an explicit force-create/new-tab path in Rust rather than weakening `terminal_open` reuse semantics.
- Pin/sort persistence should be deterministic and stable after refetch/restart. Pinned tabs render before unpinned tabs; user-controlled order is represented by integer `sortIndex`.
- Search can be implemented in the frontend over the typed tab list for this story; backend search IPC is optional only if it simplifies tests. Matching must cover label, shell/runtime label and relevant session metadata available in `TerminalTabProfile`.
- Browser fallback in `src/shared/api/terminal-api.ts` must support multiple tabs so Vitest/browser preview remains usable.

### Architecture Compliance

- IPC JSON fields must be camelCase through serde/`ts-rs`; event topics remain kebab-case with domain prefix.
- Frontend feature/page code must call `src/shared/api/terminal-api.ts`; raw Tauri `invoke`, `listen`, `Channel`, `getCurrentWebviewWindow` remain limited to shared API modules/tests.
- New persisted data requires storage manifest entry, schema fixture updates and data-integrity validation. Story 1.6 explicitly requires future persisted domains to add their own manifest/schema coverage.
- Rust command handlers stay in `src-tauri/src/gateway`; use cases stay in `src-tauri/src/app/terminal`; persistence adapters stay under `src-tauri/src/infrastructure/persistence/sqlite`.
- Terminal output must continue to bypass React state. React may store tab metadata, active tab id, search query and status metadata only.
- Tauri capabilities stay split by window mode. The terminal window should not gain dialog/opener permissions or shell plugin permissions in this story.

### UX Requirements

- Follow the Terminal Window UX spec: header with tab search and new-tab action; second row with recently closed affordance and tab bar; terminal body remains large and stable.
- Use lucide icons for tab actions where available (`Plus`, `Search`, `X`, `Pin`, directional/move icons as appropriate) and accessible labels for icon-only controls.
- Loading, empty and closed states must not resize the terminal surface unexpectedly.
- Text must not overlap at desktop or narrow widths; tab labels should truncate with title/tooltips rather than stretching the header.
- Cards should not be nested; the terminal surface should remain an operational tool area, not a marketing/card layout.

### Previous Story Intelligence

- Story 3.1 established terminal window open/focus and xterm output batching. Keep renderer batching tests green.
- Story 3.2 established session-id lifecycle operations, status events, input forwarding, resize, close and browser fallback session behavior. Reuse those APIs rather than adding parallel lifecycle logic.
- Story 3.2 showed a stale resize result could overwrite exited status; guard async tab/session updates so stale results cannot revive closed tabs.
- Story 3.2 regenerated terminal bindings with `TS_RS_EXPORT_DIR=../src/contracts/generated` and `TS_RS_EXPORT_DIR=bindings`; run full `contracts` exports, not terminal-only exports, to avoid truncating generated dependency files.
- Storage stories established that every new SQLite domain must update `storage_manifest_entries`, `StorageOwner`/`StorageCategory` if needed, schema/data fixtures and data integrity checks.

### Relevant UPDATE Files To Read Before Coding

- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/domain/terminal/mod.rs`
- `src-tauri/src/infrastructure/terminal/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/workspace_database.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src/shared/api/terminal-api.ts`
- `src/shared/api/index.ts`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/terminal-renderer.ts`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/terminal-renderer.test.ts`
- `src/App.test.tsx`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/terminal/*`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-fixture-types.ts`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 3 and Story 3.3 acceptance criteria.
- `_bmad-output/planning-artifacts/architecture.md` - terminal architecture, typed IPC, persistence, naming, event, state and testing standards.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Terminal Window layout, header controls, tab bar and responsive/accessibility constraints.
- `_bmad-output/implementation-artifacts/3-1-open-or-reuse-workspace-terminal-window.md` - terminal window/xterm baseline.
- `_bmad-output/implementation-artifacts/3-2-terminal-session-lifecycle-ipc.md` - lifecycle IPC baseline and verification evidence.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm test:frontend` - passed 4 files / 37 tests.
- `pnpm test:contracts` - passed TypeScript fixture types, manifest validator and Rust contract fixture tests.
- `pnpm test:data-integrity` - passed TypeScript fixture types, data fixture validator and Rust schema/data fixture tests.
- `cargo fmt --manifest-path src-tauri/Cargo.toml` and `cargo fmt --manifest-path src-tauri/Cargo.toml --check` - passed.
- `cargo check --manifest-path src-tauri/Cargo.toml` - passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` - passed 175 unit tests, 6 contract fixture tests, 11 schema/data fixture tests and smoke scaffold.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts -- --nocapture` - passed 118 binding export tests.
- `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts -- --nocapture` - passed 118 binding export tests.
- `pnpm build` - passed Vite production build; only chunk-size warning.
- `pnpm test` - passed frontend, contracts, data-integrity and smoke suites.
- IPC boundary scan showed raw Tauri imports/listeners only in shared API modules/tests; `Channel` occurrence is in Rust `ts-rs` contract code.
- `pnpm tauri build` - passed; produced macOS app and DMG bundles; existing bundle identifier warning remains.

### Completion Notes List

- Added terminal tab DTOs, generated bindings and contract fixtures for list/create/close/restore/update.
- Added workspace SQLite `terminal_tabs` migration, repository, storage manifest entry and data-integrity/schema fixture coverage without persisting terminal output, scrollback, snapshots or PTY handles.
- Added Rust tab orchestration that creates independent sessions for new tabs, closes PTYs through lifecycle close, restores closed tabs with replacement sessions and preserves `terminal_open` reuse behavior.
- Replaced the terminal page single-session header with tab list, new-tab, close/restore, pin/move and search behavior while keeping output out of React state.
- Added focused Rust and frontend tests for tab persistence/order, session orchestration, close/restore, active switching, pin/sort and search.

### File List

- `_bmad-output/implementation-artifacts/3-3-terminal-tabs-create-restore-search-sort.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/terminal/terminal-tabs-list.request.json`
- `fixtures/contracts/terminal/terminal-tabs-list.result.json`
- `fixtures/contracts/terminal/terminal-tabs-list.error.json`
- `fixtures/contracts/terminal/terminal-tab-create.request.json`
- `fixtures/contracts/terminal/terminal-tab-create.result.json`
- `fixtures/contracts/terminal/terminal-tab-create.error.json`
- `fixtures/contracts/terminal/terminal-tab-close.request.json`
- `fixtures/contracts/terminal/terminal-tab-close.result.json`
- `fixtures/contracts/terminal/terminal-tab-close.error.json`
- `fixtures/contracts/terminal/terminal-tab-restore.request.json`
- `fixtures/contracts/terminal/terminal-tab-restore.result.json`
- `fixtures/contracts/terminal/terminal-tab-restore.error.json`
- `fixtures/contracts/terminal/terminal-tab-update.request.json`
- `fixtures/contracts/terminal/terminal-tab-update.result.json`
- `fixtures/contracts/terminal/terminal-tab-update.error.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `fixtures/schema/terminal-tabs-v1/terminal-tabs.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/terminal.ts`
- `src-tauri/migrations/workspace/202605121900__terminal_tabs.sql`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/domain/terminal/mod.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/terminal_tab_repository.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/terminal.ts`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/TerminalPage.tsx`
- `src/shared/api/terminal-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 3.3 context for terminal tab creation, restore, search, sorting and persistence.
- 2026-05-12: Completed terminal tab contracts, persistence, IPC, UI, fixtures and verification for Story 3.3.
