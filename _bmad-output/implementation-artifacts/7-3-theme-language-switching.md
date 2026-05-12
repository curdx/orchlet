# Story 7.3: 主题与语言切换

Status: done

## Story

As a desktop user,
I want theme and language preferences to apply everywhere,
So that the app feels coherent across windows.

## Acceptance Criteria

1. Given the user changes theme, when main, terminal, workspace-selection or notification-preview windows are open, then all windows apply the selected theme.
2. Given the user changes language, when supported windows are open, then visible labels and supported messages switch language consistently.
3. Given preferences are persisted, when the app restarts, then theme and language restore before the user begins core work.

## Tasks / Subtasks

- [x] Task 1: Add persisted app preferences storage and validation (AC: 1, 3)
  - [x] Add schema-versioned app preferences snapshot for theme and language.
  - [x] Store preferences under app-data settings, not localStorage as authoritative state.
  - [x] Validate unsupported theme/language values and invalid persisted JSON with recoverable errors.
  - [x] Add storage manifest and data-integrity coverage for the persisted preferences store.

- [x] Task 2: Wire preferences into window context commands (AC: 1, 3)
  - [x] Load persisted preferences before window registration returns the first context snapshot.
  - [x] Persist preference updates before broadcasting window context changes.
  - [x] Broadcast preference/window context changes to all open windows.
  - [x] Keep raw Tauri APIs isolated to `src/shared/api/*` and Rust gateway modules.

- [x] Task 3: Apply theme and language consistently in supported windows (AC: 1, 2)
  - [x] Ensure `data-theme` and `lang` are updated from the latest context snapshot.
  - [x] Add localized labels/messages for workspace-selection preference controls.
  - [x] Add localized labels/messages for terminal shell preference controls.
  - [x] Add localized labels/messages for notification-preview preference/status controls.

- [x] Task 4: Add focused tests and fixtures (AC: 1-3)
  - [x] Add Rust tests for default preferences, persisted restore, update persistence and invalid JSON handling.
  - [x] Add frontend tests for restored browser fallback preferences and language label switching.
  - [x] Add window context API tests for the app preference event subscription path.
  - [x] Update contract/data-integrity generated types and fixtures as needed.

- [x] Task 5: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test:frontend -- src/App.test.tsx src/shared/api/window-context-api.test.ts`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 7.3 owns theme and language preferences, their persistence, cross-window broadcast, and visible label/message switching in currently supported surfaces. It does not implement notification preferences, shortcut configuration, custom CLI defaults, chat terminal output preferences, data repair, account settings, or remote synchronization.

### Product Policy

- MVP has no product authentication; theme/language are local app preferences.
- Browser/localStorage may be used only as UI cache/fallback for browser preview. Rust app-data storage is authoritative in the desktop runtime.
- Supported themes are `system`, `light`, and `dark`.
- Supported languages are `zh-CN` and `en-US`.
- Preference changes should apply immediately when technically possible.

### Current Implementation State

- `WindowContextRuntimeState` keeps `AppPreferencesSnapshot` in memory and defaults to `system` / `zh-CN`.
- `App.tsx` applies `document.documentElement.dataset.theme` and `document.documentElement.lang` from `windowContext.preferences`.
- `app_preferences_update` updates in-memory context and emits `app-preferences-changed` plus `window-context-changed`, but preferences are not persisted.
- `windowContextApi.subscribe` listens only to `window-context-changed`.
- The browser fallback keeps preferences in memory only.
- Workspace-selection, terminal and notification-preview surfaces already receive the context snapshot, but most visible labels are hard-coded Chinese.

### Technical Requirements

- Add a schema-versioned app preferences store under app data, for example `settings/preferences.json`.
- Keep preference persistence in Rust storage/app layers; do not use frontend localStorage as desktop truth.
- Wire persistence through typed Tauri gateway commands, not raw frontend `invoke`.
- Hydrate window context from persisted preferences before returning the initial registered window snapshot.
- Persist preference updates before emitting cross-window events.
- Preserve existing active workspace/window registration behavior.
- Keep IPC payload fields camelCase via serde/ts-rs.
- Add storage manifest and data-integrity validation for the new persisted preferences store.

### Architecture Compliance

- Raw Tauri APIs must stay under `src/shared/api/*` or Rust gateway modules.
- Frontend pages/components should depend on typed facades and snapshots, not direct Tauri APIs.
- Durable truth must remain in Rust/app-data storage; React state and localStorage are caches only.
- Theme/language changes must keep main, workspace-selection, terminal and notification-preview windows coherent through window context events.

### UX Requirements

- Theme controls expose dark, light and system options with selected state.
- Language controls expose English (United States) and Chinese (Simplified) options with selected state.
- If real-time switching is supported, copy should indicate immediate effect rather than requiring restart.
- Icon-only or compact controls must keep accessible labels.
- Supported labels/messages should switch consistently when language changes.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/7-2-avatar-upload-delete-reset-presets.md`
- `src-tauri/src/app/window_context/mod.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/contracts/workspace.rs`
- `src-tauri/src/contracts/settings.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src/shared/api/window-context-api.ts`
- `src/App.tsx`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/pages/terminal/TerminalPage.tsx`
- `src/App.test.tsx`
- `src/shared/api/window-context-api.test.ts`
- `scripts/validate-data-fixtures.mjs`

### Previous Story Intelligence

- Story 7.2 extended app-data settings storage and data-integrity coverage without leaking raw Tauri APIs into UI components.
- Story 7.2 showed the expected pattern for schema-versioned JSON stores, manifest entries, generated TS bindings, fixtures and focused frontend/Rust tests.
- Story 7.1/7.2 kept settings UI embedded in the existing workspace-selection surface rather than adding a separate landing/settings page.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 7.3 acceptance criteria and Epic 7 context.
- `_bmad-output/planning-artifacts/prd.md` - FR65, NFR30.
- `_bmad-output/planning-artifacts/architecture.md` - browser/localStorage as UI cache only, typed IPC facade, app-data storage truth.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Settings Page "外观" and "语言" controls.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Story 7.3 created from sprint backlog, Epic 7 theme/language requirements, Settings UX controls and existing window-context implementation.
- 2026-05-13: `cargo test --manifest-path src-tauri/Cargo.toml app::settings -- --nocapture` passed: 9 settings tests.
- 2026-05-13: `pnpm test:frontend -- src/shared/api/window-context-api.test.ts` passed: 4 frontend test files, 91 tests.
- 2026-05-13: `pnpm test:frontend -- src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` passed: 4 frontend test files, 91 tests.
- 2026-05-13: `pnpm test:data-integrity` passed: schema/data-integrity fixtures and 17 Rust schema/data fixture tests.
- 2026-05-13: `pnpm test:contracts` passed: 59 fixture groups and 11 Rust contract fixture tests.
- 2026-05-13: `cargo fmt --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-13: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` passed.
- 2026-05-13: `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-13: `cargo test --manifest-path src-tauri/Cargo.toml` passed: 317 Rust lib tests plus integration/fixture/smoke tests.
- 2026-05-13: `pnpm build` passed with the existing Vite large chunk warning.
- 2026-05-13: `pnpm test` passed: frontend, contracts, data-integrity and smoke suites passed.
- 2026-05-13: IPC boundary scan passed; raw Tauri imports remain in `src/shared/api/*`, with expected test mocks and `Channel`/`defaultChannel` regex false positives.
- 2026-05-13: `pnpm tauri build` passed and produced macOS `.app` and `.dmg` bundles; existing bundle identifier warning remains.

### Completion Notes List

- Added app-data `settings/preferences.json` persistence for theme and language with schema version, timestamps and recoverable validation errors.
- Hydrated window context from persisted app preferences before registration and persisted updates before broadcasting cross-window events.
- Subscribed frontend window context API to both context and app-preference events while preserving each window's local identity.
- Added browser-preview localStorage cache for preferences while keeping desktop app-data storage authoritative.
- Localized supported workspace-selection, terminal shell and notification-preview labels/messages for `zh-CN` and `en-US`.
- Added app preferences storage manifest, data-integrity validation, fixtures and generated TypeScript bindings.

### File List

- `_bmad-output/implementation-artifacts/7-3-theme-language-switching.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/app-data/settings/preferences.json`
- `fixtures/schema/settings-v1/app-preferences.json`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/settings.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/app/window_context/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/settings.rs`
- `src-tauri/src/domain/settings/mod.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/app_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/app/styles.css`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/settings.ts`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/window-context-api.test.ts`
- `src/shared/api/window-context-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 7.3 context for persisted theme/language preferences and cross-window application.
- 2026-05-13: Completed Story 7.3 theme/language persistence, cross-window broadcast, supported localization and validation coverage.
