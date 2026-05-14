# Story 7.7: 聊天终端输出展示偏好

Status: done

<!-- Note: Created after Story 7.6 completion so the developer can reuse the established settings storage/API/UI patterns and the Story 4.5 terminal-output chat stream path. -->

## Story

As a workspace owner,
I want to control how terminal output appears in chat,
so that terminal streams are readable without forcing one display style on every workspace.

## Acceptance Criteria

1. Given chat terminal output settings are open, when the user selects display preference, then terminal output is shown according to that preference in future chat streams.
2. Given terminal output display preference changes, when an existing conversation is reopened, then newly received terminal output follows the updated preference without rewriting historical messages.
3. Given the preference fails to save, when the user changes the setting, then the app reports the failure and preserves the previous active preference.

## Tasks / Subtasks

- [x] Task 1: Add persisted chat terminal output preference contracts and storage (AC: 1, 3)
  - [x] Add a settings contract for `ChatTerminalOutputDisplayMode` with explicit values `stream` and `finalOnly`; default must be `stream` to preserve Story 4.5 behavior.
  - [x] Add `ChatTerminalOutputPreferencesSnapshot` with `schemaVersion`, `displayMode`, `createdAtMs` and `updatedAtMs`.
  - [x] Add typed get/update/reset settings commands, for example `chat_terminal_output_preferences_get`, `chat_terminal_output_preferences_update` and `chat_terminal_output_preferences_reset`.
  - [x] Persist the preference under app-data settings, for example `settings/chat-terminal-output.json`, using the existing JSON store atomic-write pattern.
  - [x] Validate unsupported modes, unsupported schema versions, invalid fields and invalid JSON as recoverable `AppError`s; update failures must not overwrite the previously saved preference.
  - [x] Add storage manifest and data-integrity coverage for the new settings file.

- [x] Task 2: Add generated bindings, typed frontend API and browser fallback (AC: 1, 3)
  - [x] Export the new Rust DTOs through `ts-rs` into `src/contracts/generated/settings.ts`.
  - [x] Extend `src/shared/api/settings-api.ts` with get/update/reset methods and an in-memory browser fallback for Vitest/non-Tauri contexts.
  - [x] Keep raw Tauri command access inside `src/shared/api` and `src-tauri/src/gateway`; feature/page code must call the typed settings API only.
  - [x] Add contract fixtures for get/update/reset success and error cases and update the contract manifest/types.

- [x] Task 3: Add settings UI for the display preference (AC: 1, 3)
  - [x] Add the UX-specified `聊天流式输出` toggle to the existing profile/settings modal surface in `WorkspaceSelectionPage`; checked means `stream`, unchecked means `finalOnly`.
  - [x] Place the control in a data/chat-output section that can later host Story 7.8 repair/clear actions; do not create a separate route or duplicate settings architecture.
  - [x] Load saved preference with TanStack Query, keep a separate draft value, and apply the preference to runtime output only after a successful save.
  - [x] On save failure, show an actionable error/toast through `normalizeAppError`, leave the saved active preference unchanged, and keep or restore the draft without changing runtime behavior.
  - [x] Make the control and save action keyboard-operable, with visible loading/disabled/error states and text labels that do not rely on color only.

- [x] Task 4: Apply the active preference to chat terminal stream rendering (AC: 1, 2)
  - [x] Extend the existing Story 4.5 stream pipeline in `WorkspaceSelectionPage`; do not reimplement terminal subscriptions, add raw event listeners or route terminal chunks through chat message persistence.
  - [x] For `stream`, preserve current behavior: buffer output events outside React state, sort by `seq`, append in batches, cap rendered text at `TERMINAL_STREAM_MAX_CHARS`, and keep chat input/window interactions responsive.
  - [x] For `finalOnly`, collect output outside React state and avoid appending each chunk to the visible chat stream while the session is running; render the final bounded output when an `exited` terminal status/snapshot arrives, using ordered buffered chunks only as a fallback.
  - [x] Continue to update terminal status/member activity in both modes without overwriting manual member status.
  - [x] Apply preference changes only to newly received terminal output after the preference is successfully saved; do not rewrite `messages`, stored chat history or previously rendered historical message content.
  - [x] Preserve active workspace filtering, unsubscribe cleanup, duplicate/out-of-order `seq` handling and workspace-change cleanup.

- [x] Task 5: Add focused validation coverage (AC: 1-3)
  - [x] Add Rust tests for default preference load, update persistence, reset, invalid JSON/fields and save failure preserving the previously saved preference.
  - [x] Add frontend tests for loading the toggle, saving from the keyboard, success toast/state refresh and save-failure behavior preserving active mode.
  - [x] Add frontend tests proving `stream` renders chunks as they arrive and `finalOnly` hides live chunks until terminal exit/final snapshot.
  - [x] Add a reopened/existing conversation regression test: existing chat messages stay unchanged while newly received terminal output follows the updated saved preference.
  - [x] Add contract fixtures and data-integrity/schema fixtures for the new settings file.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run focused frontend tests for settings and terminal chat stream display behavior.
  - [x] Run focused Rust settings/data-integrity tests for the new store.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml` and `cargo test --manifest-path src-tauri/Cargo.toml`.
  - [x] Run `pnpm build` and the relevant frontend test suite.
  - [x] Run the IPC boundary scan before review: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.

### Review Findings

- [x] [Review][Patch] Guard final-only exit snapshots with `lastSeq` so stale status events cannot replace newer terminal output [src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx:1388]
- [x] [Review][Patch] Bound the final-only fallback buffer while sessions are running instead of retaining every output event until exit [src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx:1347]
- [x] [Review][Patch] Reject zero chat terminal output preference timestamps to keep invalid persisted records recoverable [src-tauri/src/domain/settings/mod.rs:278]

## Dev Notes

### Scope Boundary

Story 7.7 owns the local preference that decides whether terminal output appears in chat as a live stream or only as final output. It does not implement durable terminal-output-to-message persistence, terminal cancellation, semantic output parsing, notification routing, diagnostics export, chat data repair/clear operations, or a new standalone Settings page.

### Product Policy

- The preference is a local app-data setting in the existing Settings domain. It must not be stored in workspace `.orchlet` metadata or uploaded anywhere.
- Default behavior must remain live streaming so current terminal-output visibility, smoke paths and Story 4.5 tests do not regress.
- Save failure must be explicit: explain what happened, what remains active, and what the user can do next.
- Changing the preference is not a migration. Do not mutate existing chat messages or rewrite historical content.

### Current Implementation State

- Story 4.5 already renders terminal output in chat from `terminalApi.subscribeOutput` and `terminalApi.subscribeStatus` inside `WorkspaceSelectionPage`.
- Current stream rendering uses `terminalOutputBufferRef`, a flush timer, `terminalChatStreams`, `memberTerminalActivity`, `TERMINAL_STREAM_FLUSH_MS` and `TERMINAL_STREAM_MAX_CHARS = 4000`.
- Output events are filtered by active workspace, sorted by `terminalSessionId` and `seq`, deduplicated against `lastSeq`, and appended in batches.
- Terminal status events already provide `TerminalStatusEventPayload.snapshot.text` and `snapshot.lastSeq`, which should be used for final-only rendering when the session exits.
- Settings currently live in `ProfileSettingsModal` inside `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`.
- Stories 7.4, 7.5 and 7.6 established separate app-data settings JSON stores, generated TypeScript bindings, typed API methods, browser fallbacks, contract fixtures, data-integrity fixtures and settings modal sections.

### Required Display Semantics

- `stream`: current Story 4.5 behavior. Terminal output chunks become visible in chat while the terminal is running.
- `finalOnly`: terminal status may remain visible, but output chunks are buffered outside React state and not appended to the visible chat stream while running. When a terminal session reaches `exited`, render the final bounded output from the status snapshot; if the snapshot is empty/unavailable, use the ordered buffered tail.
- Preference changes become active only after the update command succeeds. The UI may change a draft toggle before save, but terminal output rendering must continue using the previously saved active preference until success.
- Newly received terminal output follows the saved active preference. Previously persisted chat messages and already loaded historical messages are not rewritten.

### Architecture Compliance

- All Tauri calls remain behind `src/shared/api/*`; pages/components must not import raw `invoke`/`listen`.
- Rust gateway commands live in `src-tauri/src/gateway/settings_commands.rs`; settings domain validation belongs in `src-tauri/src/domain/settings/mod.rs`; app-data persistence belongs in `src-tauri/src/infrastructure/persistence/json_store`.
- IPC fields use camelCase through serde/ts-rs and generated TypeScript bindings.
- Terminal hot-path output must stay outside React state. React state can receive batched/derived display entries only.
- Storage manifest, schema fixtures and data-integrity reports must include the new settings file.
- Do not introduce new npm/crate dependencies for this story; use existing React 19, TanStack Query, Tauri 2, Vitest and Rust patterns already in the repo.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/4-5-terminal-output-chat-stream-status-sync.md`
- `_bmad-output/implementation-artifacts/7-5-shortcut-configuration.md`
- `_bmad-output/implementation-artifacts/7-6-cli-custom-member-default-terminal-configuration.md`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/settings-api.ts`
- `src/shared/api/terminal-api.ts`
- `src-tauri/src/contracts/settings.rs`
- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/domain/settings/mod.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/gateway/settings_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/shortcut_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/terminal_configuration_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src/App.test.tsx`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

### Project Structure Notes

- The UX specification describes a Settings Data row, but the current implementation uses one profile/settings modal rather than a full Settings page with left navigation. Follow the existing Epic 7 implementation pattern and add a compact data/chat-output section in that modal.
- Keep generated files and fixtures in the same locations as prior settings stories. Do not create a parallel settings API, duplicate localStorage source of truth, or place feature-specific persistence under `src/pages`.
- If adding a storage category for the new file, keep `src-tauri/src/contracts/data_integrity.rs`, generated TypeScript, fixture validators and reports in sync.

### Previous Story Intelligence

- Story 7.6 completed the newest settings-store pattern for `settings/terminal-config.json`, terminal configuration commands, generated bindings, storage manifest/data-integrity coverage and settings modal controls. Reuse that shape for the new preference.
- Story 7.6 review found that settings-originated behavior must point users back to Settings and that input normalization matters before validation. For this story, save/read errors should name the chat output preference file and tell the user the previous preference remains active.
- Story 7.5 showed how to keep a saved settings snapshot, a draft, browser fallback behavior and keyboard-operable save/reset controls in the existing modal.
- Story 4.5 established the performance-sensitive terminal chat stream path. Extend it; do not replace it with per-chunk React state or persistent chat message writes.

### Git Intelligence Summary

- Recent completed commits are Epic 7 settings stories: profile/status, avatar, theme/language, notification preferences and shortcut configuration. The implementation pattern is incremental settings-store additions, not a broad settings rewrite.
- Story 7.6 is currently uncommitted in the working tree and already adds terminal configuration settings files. Preserve those changes and build on them instead of reverting or reshaping the settings architecture.

### Testing Requirements

- Rust settings tests should cover default load, valid update, reset, invalid JSON, invalid schema/mode and save failure behavior where feasible.
- Frontend tests should mock `settingsApi` and `terminalApi` rather than raw Tauri APIs.
- At least one frontend test must prove a failed preference save leaves active runtime rendering on the previous saved mode.
- At least one frontend test must prove final-only mode does not render live chunk text before an `exited` status snapshot.
- Existing Story 4.5 tests for ordered stream output, bounded output and chat input usability must continue passing under the default `stream` mode.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 7.7 acceptance criteria and FR69.
- `_bmad-output/planning-artifacts/epics.md` - Story 4.5 terminal output chat stream prerequisites.
- `_bmad-output/planning-artifacts/prd.md` - FR32, FR51, FR69, NFR4, NFR5, NFR6, NFR8, NFR14, NFR31, NFR35, NFR36 and NFR37.
- `_bmad-output/planning-artifacts/architecture.md` - typed IPC boundary, settings ownership, storage manifest requirements and terminal hot-path performance constraints.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Settings Data `聊天流式输出` toggle and accessibility rules.
- `package.json` - current frontend/Tauri/test dependency versions; no new dependency is required.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm exec vitest run src/App.test.tsx --testNamePattern "final-only|chat terminal output preference|existing conversation messages"` - passed 6 tests.
- `pnpm exec vitest run src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` - passed 100 tests.
- `cargo test --manifest-path src-tauri/Cargo.toml chat_terminal_output_preferences --lib` - passed 6 focused Rust tests.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::settings::export_bindings --lib` - passed 44 settings binding export tests.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::workspace::export_bindings --lib` - passed 25 workspace binding export tests after regenerating dependent workspace types.
- `pnpm test:contracts` - validated 70 contract fixture groups and passed 11 Rust contract fixture tests.
- `pnpm test:data-integrity` - validated schema/data-integrity fixtures and passed 21 Rust schema fixture tests.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` - passed.
- `cargo check --manifest-path src-tauri/Cargo.toml` - passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` - passed 375 lib tests, 11 contract fixture tests, 21 schema data fixture tests and 1 smoke scaffold test.
- `pnpm test` - passed 108 frontend tests, contract fixtures, data-integrity fixtures and smoke scaffold.
- `pnpm build` - passed; Vite reported the existing >500 kB chunk-size warning.
- IPC boundary scan found raw Tauri access only in `src/shared/api/*`, test mocks and Rust enum/test false positives; `WorkspaceSelectionPage` uses typed APIs only.

### Completion Notes List

- Added schema-versioned chat terminal output preferences with `stream` default, `finalOnly` mode, typed get/update/reset commands, JSON app-data persistence, storage manifest and data-integrity validation.
- Added generated TypeScript bindings, typed frontend settings API methods, browser fallback state, contract fixtures and schema/data-integrity fixtures for `settings/chat-terminal-output.json`.
- Added the `聊天流式输出` settings section in the existing profile/settings modal with separate draft state, keyboard-operable save, loading/error states and save-failure handling that preserves the previous active preference.
- Extended the existing terminal chat stream pipeline so saved `stream` mode preserves batched live output while saved `finalOnly` buffers chunks outside React state and renders bounded final output on `exited` status/snapshot.
- Added focused frontend and Rust coverage for successful save, failed save preserving active stream mode, stream ordering, final-only hiding live chunks, existing conversation history preservation, fixtures and data-integrity coverage.
- Fixed review findings by guarding stale final-only exit snapshots with `lastSeq`, bounding the final-only fallback buffer during running sessions, and rejecting zero-created-at chat terminal output preference records as recoverable invalid timestamps.

### File List

- `_bmad-output/implementation-artifacts/7-7-chat-terminal-output-display-preferences.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/settings/chat-terminal-output-preferences-get.error.json`
- `fixtures/contracts/settings/chat-terminal-output-preferences-get.request.json`
- `fixtures/contracts/settings/chat-terminal-output-preferences-get.result.json`
- `fixtures/contracts/settings/chat-terminal-output-preferences-reset.error.json`
- `fixtures/contracts/settings/chat-terminal-output-preferences-reset.request.json`
- `fixtures/contracts/settings/chat-terminal-output-preferences-reset.result.json`
- `fixtures/contracts/settings/chat-terminal-output-preferences-update.error.json`
- `fixtures/contracts/settings/chat-terminal-output-preferences-update.request.json`
- `fixtures/contracts/settings/chat-terminal-output-preferences-update.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/app-data/settings/chat-terminal-output.json`
- `fixtures/schema/settings-v1/chat-terminal-output.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/settings.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/settings.rs`
- `src-tauri/src/domain/settings/mod.rs`
- `src-tauri/src/gateway/settings_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/chat_terminal_output_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/settings.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/settings-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 7.7 context for chat terminal output display preferences.
- 2026-05-13: Implemented chat terminal output display preferences, validation coverage and completion verification; story marked ready for review.
- 2026-05-13: Fixed code-review patch findings, reran verification, and marked Story 7.7 done.
