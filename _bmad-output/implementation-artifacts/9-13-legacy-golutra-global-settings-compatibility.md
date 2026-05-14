# Story 9.13: Legacy Golutra global settings compatibility

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a current Golutra user,
I want the React/Tauri rebuild to read my existing `global-settings.json`,
So that theme, language, profile, notification, shortcut, chat-output and terminal preferences survive the rebuild instead of resetting to defaults.

## Acceptance Criteria

1. Given app data contains legacy root-level `global-settings.json` and no current `settings/preferences.json`, when app preferences load, then theme and language are mapped from Golutra settings.
2. Given app data contains legacy `global-settings.json` and no current `settings/profile.json`, when profile settings load, then display name, timezone, status and status message are mapped where valid; avatar library migration remains out of scope.
3. Given app data contains legacy `global-settings.json` and no current notification/shortcut/chat-output/terminal-config store, when those stores load, then compatible legacy fields are mapped into the current snapshots while invalid or unknown fields fall back safely.
4. Given both a current store file and legacy `global-settings.json` exist, when a store loads, then the current store remains authoritative and is not overwritten by legacy data.
5. Given the story is ready for review, when validation runs, then targeted settings/data-integrity tests, `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness validation and `git diff --check` pass structurally. Release readiness may remain blocked for `chat.redb`, avatars/contacts/registry migration and packaged smoke evidence.

## Tasks / Subtasks

- [x] Task 1: Add legacy global settings reader (AC: 1, 2, 3, 4)
  - [x] Read root-level `global-settings.json` from app data.
  - [x] Keep current `settings/*.json` files authoritative when they already exist.
  - [x] Parse legacy data defensively without claiming full avatar/library migration.

- [x] Task 2: Map legacy settings into current stores (AC: 1, 2, 3)
  - [x] Map appearance theme and locale/general language into app preferences.
  - [x] Map account display name/timezone/status/status message into profile settings.
  - [x] Map notifications, keybinds and chat stream output into their current stores.
  - [x] Map built-in CLI paths, custom CLI entries and default custom terminal into terminal configuration where valid.

- [x] Task 3: Add focused tests and fixtures (AC: 1, 2, 3, 4, 5)
  - [x] Add Rust tests for each imported settings surface.
  - [x] Add precedence tests proving current stores override legacy data.
  - [x] Add data-integrity coverage showing legacy global settings can validate current settings surfaces.

- [x] Task 4: Run validation and update release evidence (AC: 5)
  - [x] Run targeted settings/data-integrity Rust tests.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `pnpm exec tsc --noEmit`.
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `node scripts/validate-release-readiness.mjs`.
  - [x] Run `git diff --check`.
  - [x] Update Story 9.10 release gate/checklists to say `global-settings.json` compatibility is resolved while `chat.redb`, avatars/contacts/registry migration and packaged smoke remain blocked.

## Dev Notes

- Golutra reference:
  - `/Users/wdx/opc/golutra/src/features/global/settingsStore.ts`
  - `/Users/wdx/opc/golutra/src-tauri/src/runtime/settings.rs`
  - `/Users/wdx/opc/golutra/src-tauri/src/ports/settings.rs`
- Legacy Golutra keeps app-level settings in root-level `global-settings.json`; orchlet currently stores separate files under `settings/`.
- This story intentionally does not claim old `chat.redb`, avatar binary library, contacts, recent workspace or workspace registry migration.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cargo test --manifest-path src-tauri/Cargo.toml app::settings` — passed; 17 settings tests.
- `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` — passed; 11 data-integrity tests.
- `cargo test --manifest-path src-tauri/Cargo.toml legacy_global_settings` — passed; 4 focused legacy settings tests.
- `pnpm test:data-integrity` — passed; schema/data fixtures validated and 21 Rust fixture tests passed.
- `pnpm test:contracts` — passed; 80 contract fixture groups and 12 Rust contract fixture tests passed.
- `pnpm exec tsc --noEmit` — passed.
- `node scripts/validate-capability-status.mjs` — passed; 85 MVP capability status entries.
- `pnpm test` — passed; frontend 7 files / 133 tests, contract/data-integrity/capability/smoke/release validators passed; release readiness reported `blocked`.
- `pnpm build` — passed; Vite emitted the existing >500 kB chunk warning.
- `node scripts/validate-release-readiness.mjs` — passed structurally; reported `validated MVP release readiness: blocked`.
- `git diff --check` — passed.

### Completion Notes List

- Added a root-level `global-settings.json` reader that maps Golutra settings into current app preferences, profile settings, notification preferences, shortcut preferences, chat terminal output preferences and terminal configuration snapshots.
- Preserved current `settings/*.json` precedence so existing orchlet settings are not overridden by legacy data.
- Kept avatar binary/library migration out of scope; unsupported legacy avatar values fall back to current profile avatar defaults.
- Added focused Rust tests for mapping, malformed legacy JSON, current-store precedence and data-integrity validation.
- Updated Story 9.10 release evidence to mark `global-settings.json` compatibility as resolved while keeping `chat.redb`, avatars, contacts, recent/registry migration and packaged smoke blocked.

### File List

- `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`
- `_bmad-output/implementation-artifacts/9-13-legacy-golutra-global-settings-compatibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/rebuild/feature-inventory.md`
- `docs/rebuild/parity-checklist.md`
- `fixtures/capabilities/mvp-capability-status.json`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/release/mvp-release-readiness.json`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/app_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/chat_terminal_output_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/legacy_global_settings_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/notification_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/shortcut_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/terminal_configuration_store.rs`

## Change Log

- 2026-05-14: Created Story 9.13 from remaining Story 9.10 legacy `global-settings.json` blocker.
- 2026-05-14: Implemented and validated legacy global settings compatibility; moved story to review while release remains blocked for remaining legacy data and packaged smoke evidence.
