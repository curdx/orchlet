# Story 7.1: 个人资料与状态设置

Status: done

## Story

As a user,
I want to configure my display identity and status,
So that collaborators see accurate presence information.

## Acceptance Criteria

1. Given the user opens profile settings, when they update display name, timezone, status or status message, then the settings are saved and reflected in relevant member/profile surfaces.
2. Given invalid profile input is entered, when the user saves, then the app identifies the invalid field and preserves editable input.
3. Given profile settings are saved, when the app restarts, then the saved profile values are restored.

## Tasks / Subtasks

- [x] Task 1: Add typed profile settings contracts and persistence (AC: 1-3)
  - [x] Add profile settings DTOs for get/update commands and a profile snapshot record.
  - [x] Persist profile settings in app-data JSON with schema versioning.
  - [x] Store display name, timezone, status and status message with timestamps.
  - [x] Validate blank display name, unsupported timezone, unsupported status and oversized status message.

- [x] Task 2: Add settings app logic and gateway commands (AC: 1-3)
  - [x] Implement get/update profile settings behavior in the Rust app layer.
  - [x] Return recoverable `AppError`s that identify the invalid field.
  - [x] Register typed Tauri gateway commands.
  - [x] Ensure saved profile settings are restored from disk after runtime restart.

- [x] Task 3: Reflect profile settings in current member/profile surfaces (AC: 1)
  - [x] Load the saved profile snapshot with the active workspace shell.
  - [x] Show the current profile identity/status in the settings surface.
  - [x] Apply saved display name/status to the current workspace owner/member surface where applicable.
  - [x] Preserve existing member invitation and member status flows.

- [x] Task 4: Add profile settings UI (AC: 1-3)
  - [x] Add a Settings/Profile entry point from the workspace shell.
  - [x] Let users edit display name, timezone, status and status message.
  - [x] Save on explicit form action and keep editable drafts on failure.
  - [x] Show recoverable toast feedback for validation or persistence errors.

- [x] Task 5: Add contract, data-integrity and focused behavior tests (AC: 1-3)
  - [x] Add contract fixtures and generated TS bindings for profile settings commands.
  - [x] Add storage manifest category and validation check for profile settings.
  - [x] Add schema/data-integrity fixtures for profile settings JSON.
  - [x] Test settings save/restore, invalid field preservation and reflected profile surfaces.
  - [x] Test Rust validation and persistence behavior.

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

Story 7.1 owns local profile settings for display name, timezone, status and status message. It does not implement avatar upload/presets, theme/language preferences, notification preferences, shortcut configuration, custom CLI defaults, chat terminal output preferences, data repair, data clearing, accounts, email or team settings.

### Product Policy

- MVP has no product authentication; profile settings are local app/profile state, not account data.
- The Settings page "我的账号" area must not show email/account/team actions.
- Display name cannot be blank after normalization. On invalid save, the invalid draft remains visible.
- Status must use the existing member status vocabulary where possible: `online`, `offline`, `working`, `doNotDisturb`.
- Status message is local profile metadata and must be bounded to avoid oversized app-data JSON.
- Timezone should be a valid IANA timezone string; default to the local runtime timezone when available, otherwise `UTC`.

### Current Implementation State

- `WindowContextControls` already exposes theme/language/window-mode controls inside `WorkspaceSelectionPage`, but app preferences are runtime-only and are not profile settings.
- Member profiles already contain `displayName` and `status`, and `member_status_update` updates status for workspace members.
- There is no dedicated `pages/settings` route yet; current workspace shell behavior is centralized in `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`.
- Raw Tauri APIs remain isolated to `src/shared/api/*` and Rust gateway modules.

### Technical Requirements

- Add typed settings/profile contracts under `src-tauri/src/contracts` and generated `src/contracts/generated`.
- Add Rust settings app/domain modules under `src-tauri/src/app/settings` and `src-tauri/src/domain/settings`.
- Add app-data JSON persistence under `src-tauri/src/infrastructure/persistence/json_store`.
- Add typed gateway commands under `src-tauri/src/gateway/settings_commands.rs` and register in `src-tauri/src/lib.rs`.
- Add shared frontend methods under `src/shared/api`.
- Extend `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` with a compact settings/profile modal or panel consistent with current shell patterns.
- Add contract fixtures, schema/data fixtures and fixture validators for profile settings.

### Architecture Compliance

- IPC payload fields must be camelCase via serde/ts-rs.
- App data and workspace data remain authoritative; frontend state updates only from command results.
- JSON writes must be schema-versioned and return recoverable `AppError`s on validation/persistence failures.
- Pages/components must not import raw Tauri APIs.
- Do not introduce account/auth concepts; architecture explicitly says MVP uses a local profile model only.

### UX Requirements

- Settings entry point should be available from the workspace shell without a landing page.
- Profile settings include display name, timezone select/input, status select and status message textarea.
- Invalid save identifies the affected field and keeps the draft in place.
- Saved values should be visible immediately in settings and relevant member/profile surfaces.
- All icon-only buttons need accessible labels; destructive actions are out of scope for this story.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/6-5-roadmap-goals-status-progress.md`
- `src-tauri/src/contracts/member.rs`
- `src-tauri/src/app/members/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/App.test.tsx`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`

### Previous Story Intelligence

- Story 6.5 added typed IPC, schema-versioned JSON persistence, storage manifest/data-integrity coverage, shared API methods and focused modal tests. Reuse that pattern for profile settings rather than adding raw Tauri calls in UI components.
- Story 6.5 preserved unsaved drafts on save failure by keeping local frontend draft state and only replacing it from successful command results.
- Recent commits use local JSON store helpers returning recoverable `AppError`s with stable error codes and user actions.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 7.1 acceptance criteria and Epic 7 context.
- `_bmad-output/planning-artifacts/prd.md` - FR63, FR72, FR73, NFR8, NFR14, NFR17.
- `_bmad-output/planning-artifacts/architecture.md` - settings/profile module ownership, local profile decision and IPC/storage boundaries.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Settings Page, "我的账号" controls and settings save/error behavior.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Reuse the typed IPC, JSON-store and fixture patterns from Story 6.5 for local profile settings.
- Keep raw Tauri calls isolated to `src/shared/api/*` and Rust gateway modules.
- Add focused Rust and frontend behavior coverage before marking acceptance criteria complete.

### Debug Log References

- 2026-05-13: Story 7.1 created from sprint backlog, Epic 7 spec, Settings UX requirements, local profile architecture decision and Story 6.5 implementation patterns.
- 2026-05-13: `pnpm test:frontend -- src/App.test.tsx` passed: 4 test files, 85 tests.
- 2026-05-13: `pnpm test:contracts` passed: 55 fixture groups validated and 11 Rust contract fixture tests passed.
- 2026-05-13: `pnpm test:data-integrity` passed: schema/data-integrity fixtures validated and 16 Rust schema/data fixture tests passed.
- 2026-05-13: `cargo fmt --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-13: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` passed.
- 2026-05-13: `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-13: `cargo test --manifest-path src-tauri/Cargo.toml` passed: Rust unit, integration, fixture and smoke tests passed.
- 2026-05-13: `pnpm build` passed with the existing Vite large chunk warning.
- 2026-05-13: `pnpm test` passed: frontend, contracts, data-integrity and smoke suites passed.
- 2026-05-13: IPC boundary scan passed; raw Tauri imports remain in `src/shared/api/*` or test mocks, with expected `Channel`/`defaultChannel` regex false positives.
- 2026-05-13: `pnpm tauri build` passed and produced macOS `.app` and `.dmg` bundles; existing bundle identifier warning remains.

### Completion Notes List

- Added typed local profile settings contracts, generated bindings, gateway commands and Rust app/domain behavior.
- Added schema-versioned app-data JSON persistence for display name, timezone, status, status message and timestamps.
- Added validation for blank display name, unsupported timezone/status and oversized status message with recoverable field-level `AppError` responses.
- Added workspace-shell profile settings UI with explicit save, draft preservation on failure and toast feedback.
- Reflected saved profile display name/status into current owner/member surfaces without changing existing invitation/member status flows.
- Added contract fixtures, schema/data-integrity fixtures, storage manifest coverage, Rust tests and focused frontend behavior tests.

### File List

- `_bmad-output/implementation-artifacts/7-1-profile-status-settings.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/settings/profile-settings-get.error.json`
- `fixtures/contracts/settings/profile-settings-get.request.json`
- `fixtures/contracts/settings/profile-settings-get.result.json`
- `fixtures/contracts/settings/profile-settings-update.error.json`
- `fixtures/contracts/settings/profile-settings-update.request.json`
- `fixtures/contracts/settings/profile-settings-update.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/app-data/settings/profile.json`
- `fixtures/schema/settings-v1/profile-settings.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/settings.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/settings.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/domain/settings/mod.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/gateway/settings_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/roadmap.ts`
- `src/contracts/generated/settings.ts`
- `src/contracts/generated/skill.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/index.ts`
- `src/shared/api/settings-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 7.1 context for local profile display identity, timezone, status and status message settings.
- 2026-05-13: Completed Story 7.1 profile/status settings implementation, fixtures, UI reflection and validation evidence.
