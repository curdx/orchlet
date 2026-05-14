# Story 7.6: CLI、自定义成员与默认终端配置

Status: done

## Story

As a developer,
I want to configure CLI and terminal paths,
So that orchlet can launch the tools I actually use.

## Acceptance Criteria

1. Given CLI settings are open, when the user configures built-in CLI paths, custom members, custom terminal or default terminal, then values are validated and saved.
2. Given a configured CLI path is missing, when validation runs, then the app reports the missing path with an actionable correction.
3. Given a custom CLI is configured, when a member runtime uses it, then the runtime launches through the configured path without depending on a private AI CLI output format.

## Tasks / Subtasks

- [x] Task 1: Add persisted CLI and terminal configuration contracts (AC: 1-2)
  - [x] Add schema-versioned DTOs for built-in CLI path overrides, custom CLI entries, custom terminal entries and default terminal selection.
  - [x] Persist configuration under app-data settings, for example `settings/terminal-config.json`.
  - [x] Validate duplicate ids, empty labels/commands, unsupported built-in ids and invalid persisted JSON with recoverable errors.
  - [x] Add storage manifest and data-integrity coverage for the new app-data settings file.

- [x] Task 2: Apply configuration to terminal diagnostics and launch behavior (AC: 2-3)
  - [x] Include configured built-in CLI overrides, custom CLI entries and custom terminal entries in terminal environment diagnostics.
  - [x] Use the configured default terminal command when opening a workspace terminal without a member target.
  - [x] Resolve member runtimes through the configured built-in/custom CLI command when applicable.
  - [x] Preserve current shell fallback, member runtime launch, terminal tab and dispatch behavior.

- [x] Task 3: Add settings UI and member runtime selection support (AC: 1)
  - [x] Add CLI/terminal configuration controls inside the existing settings surface.
  - [x] Allow users to add/remove custom CLI entries and custom terminal entries with clear labels and commands.
  - [x] Allow users to choose a default terminal from configured/system terminal candidates.
  - [x] Make member invitation runtime options consume configured built-in and custom CLI entries.

- [x] Task 4: Add validation and keyboard-operable UX coverage (AC: 1-2)
  - [x] Surface missing or invalid CLI/terminal commands with actionable messages.
  - [x] Cover saving CLI/terminal settings from the keyboard.
  - [x] Cover member runtime selection using configured custom CLI entries.
  - [x] Cover terminal diagnostics showing available and missing configured entries.

- [x] Task 5: Add fixtures and generated bindings (AC: 1-3)
  - [x] Add generated TypeScript bindings for new settings contracts.
  - [x] Add contract fixtures for get/update/reset or equivalent CLI terminal configuration commands.
  - [x] Add schema/data-integrity fixtures for terminal configuration storage.
  - [x] Update contract and data-integrity validators.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run focused frontend tests for settings/member/terminal configuration behavior.
  - [x] Run focused Rust settings and terminal tests.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

### Review Findings

- [x] [Review][Patch] Settings-sourced missing CLI diagnostics point users at member runtime instead of Settings [src-tauri/src/app/terminal/mod.rs:433]
- [x] [Review][Patch] Custom CLI/terminal ID validation accepts whitespace-padded duplicates [src-tauri/src/domain/settings/mod.rs:175]

## Dev Notes

### Scope Boundary

Story 7.6 owns local CLI/terminal path preferences, custom CLI definitions, custom terminal definitions, default workspace-terminal selection and applying those preferences to current launch diagnostics/runtime resolution. It does not implement cloud account/API key management, private AI CLI output parsing, terminal output display preferences, data repair operations, plugin installation or OS-global shell registration.

### Product Policy

- CLI and terminal configuration is local app-data settings, not workspace metadata or remote account state.
- Missing configured commands must remain visible in diagnostics with actionable recovery text.
- Custom CLI launch must treat the configured command as a generic terminal command; do not parse vendor/private AI CLI output formats.
- Existing member runtime behavior from Epic 2 and launch diagnostics from Story 3.6 must keep working.

### Current Implementation State

- Member profiles already support `builtInAiCli`, `customCli` and `shell` runtime kinds via `MemberRuntimeProfile`.
- `WorkspaceSelectionPage` currently has hard-coded built-in runtime options and free-text custom CLI/shell fields in `MembersPanel`.
- `TerminalRuntimeState::list_environments` currently reports system shell candidates and member runtime commands.
- Workspace terminal launch currently uses `default_shell_command()` when no member target is provided.
- Story 7.5 established the settings-store pattern for schema-versioned app-data JSON, storage manifest entries, generated bindings, typed API methods and settings modal UI sections.

### Technical Requirements

- Keep raw Tauri calls in `src/shared/api/*` and Rust gateway modules.
- Add typed settings commands for CLI/terminal configuration get/update/reset or a clearly equivalent command set.
- Store app-data JSON through the existing JSON store/persistence adapter pattern.
- IPC payload fields use camelCase via serde/ts-rs.
- Built-in CLI ids must align with existing UI ids: `codex`, `claude-code`, `gemini-cli`, `opencode`, `qwen-code`.
- Default terminal selection must support a system/default shell fallback when no custom/default terminal is configured.
- Command validation should reuse `resolve_terminal_command` diagnostics where possible.

### Architecture Compliance

- Rust app-data storage remains authoritative.
- Terminal launch resolution belongs in Rust app/domain/infrastructure layers, not React.
- React pages consume typed settings/terminal APIs and must not import raw Tauri APIs.
- Storage manifest and data-integrity fixtures must cover the new settings file.
- Contract and data fixtures must stay in sync with generated TypeScript bindings.

### UX Requirements

- Settings should expose built-in CLI path override rows, custom CLI rows and custom terminal rows.
- Users need visible status for available/missing/invalid configured commands, not color-only state.
- Default terminal selection should be explicit and reversible to system default.
- Member invite runtime selection should show configured custom CLI choices before requiring manual free-text command entry.
- Save actions must be keyboard-operable.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/2-1-default-owner-member-invitation.md`
- `_bmad-output/implementation-artifacts/3-6-cli-environment-resolution-error-recovery-session-snapshot.md`
- `_bmad-output/implementation-artifacts/7-5-shortcut-configuration.md`
- `src-tauri/src/contracts/settings.rs`
- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/domain/member/mod.rs`
- `src-tauri/src/domain/terminal/mod.rs`
- `src-tauri/src/domain/settings/mod.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/gateway/settings_commands.rs`
- `src-tauri/src/infrastructure/terminal/mod.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src/shared/api/settings-api.ts`
- `src/shared/api/terminal-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/pages/terminal/TerminalPage.tsx`
- `src/App.test.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`

### Previous Story Intelligence

- Story 7.5 added `settings/shortcuts.json`, shortcut DTOs, generated bindings, contract fixtures, data-integrity fixtures and a settings modal section. Follow that pattern instead of inventing another settings architecture.
- Story 3.6 already added terminal environment diagnostics and recoverable missing-command errors. Extend `resolve_terminal_command` usage instead of duplicating command resolution in React.
- Story 2.1 already persists member runtime kind/label/command. Configuration should feed those fields and launch resolution, not replace member profiles.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 7.6 acceptance criteria and FR68.
- `_bmad-output/planning-artifacts/prd.md` - FR68, NFR24 and NFR25.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Members/CLI configuration controls.
- `_bmad-output/planning-artifacts/architecture.md` - settings ownership, typed IPC boundary, storage manifest and external CLI integration constraints.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Created Story 7.6 from sprint backlog and began implementation in sprint order after Story 7.5 completion.
- 2026-05-13: Added terminal configuration contracts, JSON store, storage manifest/data-integrity coverage, settings commands and generated bindings.
- 2026-05-13: Applied terminal configuration to diagnostics, workspace terminal launch, member runtime launch and orchestration test fixtures.
- 2026-05-13: Added settings modal controls for built-in CLI overrides, custom CLI entries, custom terminal entries and default terminal selection.
- 2026-05-13: Added frontend coverage for keyboard save, configured custom CLI invite flow and configured environment diagnostics.
- 2026-05-13: Verification passed: focused frontend, focused Rust settings/terminal/data-integrity/orchestration, contract fixtures, data-integrity fixtures, cargo fmt/check/test, pnpm build/test, IPC boundary scan and pnpm tauri build.

### Completion Notes List

- Implemented schema-versioned terminal configuration under app-data `settings/terminal-config.json` with validation for duplicate IDs, unsupported built-in CLI IDs, empty labels/commands and invalid JSON recovery.
- Added typed settings IPC for get/update/reset terminal configuration and browser fallbacks for tests/non-Tauri contexts.
- Extended terminal diagnostics and launch resolution so configured built-in CLI overrides, custom CLI entries and custom terminals are visible and used by workspace/member terminal launches.
- Wired the existing settings modal and member invite form to terminal configuration, including configured custom CLI selection and keyboard-operable save/reset controls.
- Added contract fixtures, schema/data-integrity fixtures, generated bindings and validation coverage for the new settings storage.
- Fixed editable terminal configuration rows to keep stable DOM identity while users type custom IDs from the keyboard.

### File List

- `_bmad-output/implementation-artifacts/7-6-cli-custom-member-default-terminal-configuration.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/settings/terminal-configuration-get.error.json`
- `fixtures/contracts/settings/terminal-configuration-get.request.json`
- `fixtures/contracts/settings/terminal-configuration-get.result.json`
- `fixtures/contracts/settings/terminal-configuration-reset.error.json`
- `fixtures/contracts/settings/terminal-configuration-reset.request.json`
- `fixtures/contracts/settings/terminal-configuration-reset.result.json`
- `fixtures/contracts/settings/terminal-configuration-update.error.json`
- `fixtures/contracts/settings/terminal-configuration-update.request.json`
- `fixtures/contracts/settings/terminal-configuration-update.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/app-data/settings/terminal-config.json`
- `fixtures/schema/settings-v1/terminal-config.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/settings.ts`
- `src-tauri/bindings/terminal.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/orchestration/mod.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/settings.rs`
- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/domain/settings/mod.rs`
- `src-tauri/src/gateway/settings_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/terminal_configuration_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/settings.ts`
- `src/contracts/generated/terminal.ts`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/settings-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 7.6 context for CLI, custom member and default terminal configuration.
- 2026-05-13: Implemented CLI/custom member/default terminal configuration and marked Story 7.6 ready for review.
