# Story 7.5: 快捷键配置

Status: done

## Story

As a keyboard-focused user,
I want to view and control shortcuts,
So that core workflows are efficient without a mouse.

## Acceptance Criteria

1. Given shortcut settings are open, when the user views shortcuts, then enabled, disabled and unavailable shortcuts are clearly shown.
2. Given the user enables or disables a shortcut, when the setting is saved, then the shortcut behavior updates without requiring restart where technically possible.
3. Given a core workflow exists, when tested by keyboard, then chat input, conversation switching, terminal find, settings save and notification handling are keyboard-operable.

## Tasks / Subtasks

- [x] Task 1: Add persisted shortcut preferences storage and contracts (AC: 1-2)
  - [x] Add schema-versioned shortcut preference DTOs for keymap profile, global enabled state, shortcut hint visibility and per-action overrides.
  - [x] Persist shortcut preferences under app-data settings.
  - [x] Validate unsupported profiles, unknown shortcut actions and invalid persisted JSON with recoverable errors.
  - [x] Represent unavailable shortcuts in the settings snapshot.

- [x] Task 2: Apply shortcut preferences to runtime behavior (AC: 2-3)
  - [x] Load shortcut preferences through typed API methods and browser fallback.
  - [x] Update enabled shortcut behavior without requiring app restart where technically possible.
  - [x] Preserve existing text input, IME, terminal input and chat input behavior.
  - [x] Keep unavailable shortcuts visible but inactive.

- [x] Task 3: Add shortcut settings UI (AC: 1-2)
  - [x] Add controls for keymap profile, global shortcut enablement and shortcut hint visibility.
  - [x] Add restore defaults action for the current keymap profile.
  - [x] Add a read-only shortcut list with enabled, disabled and unavailable states.
  - [x] Save preferences through typed API methods.

- [x] Task 4: Add keyboard operability coverage (AC: 3)
  - [x] Cover chat input send/newline/emoji escape behavior.
  - [x] Cover conversation list keyboard focus path.
  - [x] Cover terminal find Enter/Shift+Enter/Escape behavior.
  - [x] Cover settings save and notification preview keyboard actions.

- [x] Task 5: Add fixtures and validation (AC: 1-3)
  - [x] Add generated TypeScript bindings and contract/data-integrity fixtures.
  - [x] Add Rust tests for persistence, reset defaults, invalid JSON and invalid shortcut fields.
  - [x] Add frontend tests for shortcut settings controls, saved state and unavailable/disabled labels.
  - [x] Add data-integrity validation for shortcut preference storage.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run focused frontend tests for shortcut preferences and keyboard operability.
  - [x] Run focused Rust settings tests.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 7.5 owns local shortcut preferences, shortcut settings visibility, default profile reset and the current app-level shortcut behavior that can be updated at runtime. It does not implement editable arbitrary key rebinding, CLI path configuration, custom terminal defaults, chat terminal output preferences, data repair operations or new OS-global hotkey registration.

### Product Policy

- Shortcut preferences are local app settings, not remote account preferences.
- Users can view shortcut state even when an action is disabled or technically unavailable.
- Disabling shortcuts must not break native text editing, IME composition, terminal input or browser accessibility behavior.
- Runtime updates should apply immediately for React-managed shortcuts; unavailable/native shortcuts may require explanatory unavailable state instead of fake behavior.

### Current Implementation State

- Settings currently live in `ProfileSettingsModal` inside `WorkspaceSelectionPage`.
- Story 7.4 added notification settings and a separate typed notification preferences API.
- App preferences already persist theme and language under `settings/preferences.json`.
- There is no persisted shortcut preference store yet.
- Terminal find already has keyboard handlers for Enter, Shift+Enter and Escape.
- Notification preview is rendered by `NotificationPreviewPage` in `src/App.tsx`.

### Technical Requirements

- Store shortcut preferences in app data, for example `settings/shortcuts.json`.
- Keep raw Tauri calls in `src/shared/api/*` and Rust gateway modules.
- Add typed commands for shortcut preference get/update/reset.
- Keep storage schema versioned and covered by storage manifest/data-integrity fixtures.
- IPC payload fields use camelCase via serde/ts-rs.
- Browser fallback may keep in-memory shortcut preferences for UI tests only.
- Shortcut profile values must include `default`, `vscode` and `slack`.
- Shortcut actions should cover at least: chat send, chat newline, close emoji panel, insert mention, conversation focus navigation, terminal find next, terminal find previous, close terminal find, settings save, notification view all, notification ignore all and notification open terminal.

### Architecture Compliance

- Rust app-data storage remains authoritative.
- React pages consume typed shortcut API methods and should not import raw Tauri APIs.
- Storage manifest must include a shortcut settings entry with owner/path/schema/validation metadata.
- JSON app-data access must go through the existing JSON store/persistence adapter pattern.
- Contract and data fixtures must stay in sync with generated TypeScript bindings.

### UX Requirements

- `键位方案` is a select with 默认 / VS Code / Slack.
- `启用快捷键` is a binary toggle.
- `显示快捷键提示` is a binary toggle.
- `恢复默认` restores the current profile default bindings.
- `快捷键列表` is read-only and shows action plus keys.
- Enabled, disabled and unavailable states must be distinguishable by text/icon, not color alone.
- Settings save must be keyboard-operable.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/7-3-theme-language-switching.md`
- `_bmad-output/implementation-artifacts/7-4-notification-sound-preview-dnd-preferences.md`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/contracts/settings.rs`
- `src-tauri/src/gateway/settings_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/app_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/notification_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src/shared/api/settings-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/pages/terminal/TerminalPage.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`

### Previous Story Intelligence

- Story 7.4 established the pattern for a separate app-data settings JSON store, storage manifest entry, data-integrity fixture, generated contract bindings and settings UI section.
- Story 7.4 kept platform capability state visible in settings rather than hiding unavailable controls.
- Story 7.3 established the app preferences API and cross-window/local fallback patterns used by the settings modal.
- Previous Epic 7 stories kept settings in the existing workspace selection surface rather than adding a separate settings page.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 7.5 acceptance criteria.
- `_bmad-output/planning-artifacts/prd.md` - FR67, NFR29 and system integration constraints.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Settings Page "快捷键" controls and Keyboard Requirements.
- `_bmad-output/planning-artifacts/architecture.md` - settings ownership, typed IPC boundary and storage manifest requirements.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Story 7.5 created from sprint backlog, Epic 7 shortcut configuration requirements, Settings UX shortcut controls and current settings/notification/terminal implementation context.
- 2026-05-13: Began Story 7.5 implementation from ready-for-dev state.
- 2026-05-13: Implemented schema-versioned shortcut preferences storage, validation, typed Tauri commands and generated TypeScript bindings.
- 2026-05-13: Added settings UI controls, runtime shortcut preference application for chat and terminal find, and browser fallback API behavior.
- 2026-05-13: Added contract/data-integrity fixtures, Rust persistence/domain tests and frontend keyboard operability coverage.
- 2026-05-13: Verification passed: focused frontend tests, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt --check`, `cargo check`, `cargo test`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Persisted shortcut preferences now live under app-data `settings/shortcuts.json` with schema-versioned DTOs, generated bindings, storage manifest coverage and data-integrity validation.
- Settings exposes keymap profile, global shortcut enablement, hint visibility, restore defaults and a read-only shortcut list with enabled, disabled and unavailable states.
- Runtime preferences apply without restart for React-managed chat send/emoji close and terminal find shortcuts while preserving native text input and terminal input behavior.
- Keyboard operability coverage now includes settings save, conversation selection, chat send behavior, emoji close, terminal find navigation/close and notification preview commands.

### File List

- `_bmad-output/implementation-artifacts/7-5-shortcut-configuration.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/settings/shortcut-preferences-get.error.json`
- `fixtures/contracts/settings/shortcut-preferences-get.request.json`
- `fixtures/contracts/settings/shortcut-preferences-get.result.json`
- `fixtures/contracts/settings/shortcut-preferences-reset.error.json`
- `fixtures/contracts/settings/shortcut-preferences-reset.request.json`
- `fixtures/contracts/settings/shortcut-preferences-reset.result.json`
- `fixtures/contracts/settings/shortcut-preferences-update.error.json`
- `fixtures/contracts/settings/shortcut-preferences-update.request.json`
- `fixtures/contracts/settings/shortcut-preferences-update.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/app-data/settings/shortcuts.json`
- `fixtures/schema/settings-v1/shortcut-preferences.json`
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
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/shortcut_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/settings.ts`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/settings-api.ts`
- `src/shared/shortcuts.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 7.5 context for shortcut configuration.
- 2026-05-13: Completed Story 7.5 shortcut preferences storage, settings UI, runtime behavior, fixtures and validation evidence.
