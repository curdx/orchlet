# Story 7.2: 头像上传、删除、重置与预设

Status: done

## Story

As a user,
I want to manage my avatar,
So that my identity is recognizable without relying on external services.

## Acceptance Criteria

1. Given the user uploads an avatar image, when the upload is accepted, then the avatar is stored in the avatar library and shown in profile surfaces.
2. Given the user deletes or resets an avatar, when the action completes, then the profile falls back to the selected default or generated placeholder.
3. Given preset avatars are available, when the user selects one, then the selected preset is saved without copying unrelated files into the workspace.

## Tasks / Subtasks

- [x] Task 1: Extend profile/avatar contracts and persistence (AC: 1-3)
  - [x] Add typed avatar selection DTOs to settings contracts and generated TS bindings.
  - [x] Persist avatar selection metadata with the profile settings snapshot.
  - [x] Store accepted uploaded images under an app-data avatar library path, not under the active workspace.
  - [x] Validate allowed extensions/content types, maximum 2 MB upload size, missing uploaded files and unsupported preset ids.

- [x] Task 2: Add avatar app logic and gateway commands (AC: 1-3)
  - [x] Implement avatar upload, preset selection and reset/delete behavior in the Rust settings app layer.
  - [x] Return recoverable `AppError`s that identify avatar validation and persistence failures.
  - [x] Register typed Tauri gateway commands behind `src-tauri/src/gateway`.
  - [x] Ensure saved avatar selection and uploaded asset metadata restore after runtime restart.

- [x] Task 3: Add avatar library manifest and integrity coverage (AC: 1-3)
  - [x] Add storage manifest category/entry for the app-data avatar library.
  - [x] Add data-integrity validation for profile avatar metadata and referenced uploaded avatar assets.
  - [x] Add schema/data fixtures for profile settings with avatar metadata and avatar library validation.
  - [x] Confirm preset selection does not create workspace-local files or unrelated copies.

- [x] Task 4: Reflect avatars in current profile/member surfaces (AC: 1-3)
  - [x] Load the saved avatar snapshot with the existing profile settings query.
  - [x] Show uploaded avatar preview, selected preset or generated placeholder in settings.
  - [x] Apply saved avatar display to current owner/member surfaces and profile entry points.
  - [x] Preserve existing member invite, member status and profile text behavior from Story 7.1.

- [x] Task 5: Add avatar management UI (AC: 1-3)
  - [x] Add avatar controls to the existing Profile settings modal.
  - [x] Provide preset selection, upload, delete uploaded avatar and reset-to-placeholder actions.
  - [x] Keep controls keyboard accessible and label icon-only/avatar buttons.
  - [x] Show recoverable toast feedback for validation or persistence errors.

- [x] Task 6: Add contract, data-integrity and behavior tests (AC: 1-3)
  - [x] Add contract fixtures for avatar upload, preset selection and reset commands.
  - [x] Add Rust tests for accepted upload copy, invalid upload rejection, preset selection, reset/delete and restore.
  - [x] Add frontend tests for upload/preset/reset UI state and reflected owner/member avatar surfaces.
  - [x] Add fixture validator coverage for avatar metadata and avatar library paths.

- [x] Task 7: Verification and completion evidence (AC: 1-3)
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

Story 7.2 owns local avatar management for uploaded avatar assets, preset avatar selection, uploaded-avatar delete and reset-to-placeholder behavior. It does not implement image cropping, remote avatar sync, accounts, email, team profiles, theme/language preferences, notification preferences, shortcut configuration, custom CLI defaults, chat terminal output preferences, data repair or workspace chat clearing.

### Product Policy

- MVP has no product authentication; avatar state is local app/profile state, not account data.
- Avatars are local-first and must not upload to remote services by default.
- User-uploaded avatars must live in app data, not workspace data.
- Preset selection should save a preset identifier and visual recipe; it must not copy unrelated files into the active workspace.
- Accepted upload formats are PNG, JPG/JPEG, WEBP and GIF with a maximum size of 2 MB.
- Delete uploaded avatar removes the selected uploaded asset and falls back to the current preset/default placeholder.
- Reset returns profile avatar selection to generated placeholder/default styling without deleting unrelated avatar library files.

### Current Implementation State

- Story 7.1 added `ProfileSettingsSnapshot`, `profile_settings_get`, `profile_settings_update`, app-data `settings/profile.json`, profile settings data-integrity validation and a compact Profile settings modal inside `WorkspaceSelectionPage`.
- `ProfileSettingsSnapshot` currently stores display name, timezone, status, status message and timestamps, but no avatar metadata.
- `WorkspaceSelectionPage` applies saved display name/status to owner/member surfaces via `applyProfileSettingsToOwnerMembers`.
- `src/shared/api/settings-api.ts` and `src/shared/api/client.ts` are the frontend IPC facade and browser fallback points for settings commands.
- Raw Tauri APIs must remain isolated to `src/shared/api/*` and Rust gateway modules.

### Technical Requirements

- Extend settings/profile contracts under `src-tauri/src/contracts/settings.rs` and generated `src/contracts/generated/settings.ts`.
- Keep avatar commands under the settings domain/gateway unless a dedicated avatar module is required by complexity.
- Store uploaded avatar assets under an app-data avatar library path such as `avatars/uploads/<avatarId>.<ext>`.
- Persist avatar selection metadata in schema-versioned profile settings JSON. If schema changes are incompatible, update schema fixtures and validation intentionally.
- Add data-integrity manifest coverage for avatar library storage and metadata references.
- Return uploaded avatar preview data or a renderable avatar snapshot through typed command results; do not make UI components read local files directly.
- Add shared frontend API methods under `src/shared/api/settings-api.ts`; components must not call raw `invoke`, dialog APIs or filesystem APIs directly.
- Reuse existing Profile modal patterns in `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` rather than creating a landing page.

### Architecture Compliance

- IPC payload fields must be camelCase via serde/ts-rs.
- App data remains authoritative; frontend state updates only from command results.
- JSON writes and avatar asset changes must return recoverable `AppError`s on validation/persistence failures.
- Pages/components must not import raw Tauri APIs.
- Do not introduce account/auth concepts; architecture explicitly says MVP uses a local profile model only.
- User-uploaded avatars and skills are never committed assets; fixture images may be tiny test fixtures only.

### UX Requirements

- Avatar controls belong in the existing Settings/Profile surface.
- Users can select a preset, upload a local image, delete an uploaded avatar and reset to placeholder.
- Invalid upload errors identify the cause and preserve the current saved avatar selection.
- Saved avatar changes should be visible immediately in settings and relevant owner/member/profile surfaces.
- All avatar buttons need accessible labels and selected states; visual state cannot rely on color alone.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/7-1-profile-status-settings.md`
- `src-tauri/src/contracts/settings.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/domain/settings/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/gateway/settings_commands.rs`
- `src/shared/api/settings-api.ts`
- `src/shared/api/client.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`

### Previous Story Intelligence

- Story 7.1 established the local profile settings command, JSON persistence and Profile modal. Extend that shape rather than adding parallel profile state.
- Story 7.1 kept raw Tauri calls in `src/shared/api/*`; avatar upload file selection must follow the same boundary.
- Story 7.1 behavior tests inject `settingsApi`; add avatar methods to the injected API shape so tests do not depend on desktop runtime.
- Story 7.1 data-integrity counts and manifest fixtures must be updated when avatar library coverage is added.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 7.2 acceptance criteria and Epic 7 context.
- `_bmad-output/planning-artifacts/prd.md` - FR64, FR72, FR73, NFR8, NFR14, NFR17, NFR27.
- `_bmad-output/planning-artifacts/architecture.md` - settings/avatar ownership, app-data avatar library and raw Tauri boundary.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Settings Page "我的账号" avatar controls and 2 MB image upload rule.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Story 7.2 created from sprint backlog, Epic 7 avatar requirements, Settings UX avatar controls, local profile architecture decision and Story 7.1 implementation patterns.
- 2026-05-13: `cargo test --manifest-path src-tauri/Cargo.toml app::settings -- --nocapture` passed: 7 settings tests.
- 2026-05-13: Generated settings/data-integrity TS bindings with `TS_RS_EXPORT_DIR=../src/contracts/generated` and `TS_RS_EXPORT_DIR=bindings`.
- 2026-05-13: `pnpm test:frontend -- src/App.test.tsx` passed: 4 test files, 89 tests.
- 2026-05-13: `pnpm test:contracts` passed: 59 fixture groups and 11 Rust contract fixture tests.
- 2026-05-13: `pnpm test:data-integrity` passed: schema/data-integrity fixtures and 16 Rust schema/data fixture tests.
- 2026-05-13: `cargo fmt --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-13: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` passed.
- 2026-05-13: `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-13: `cargo test --manifest-path src-tauri/Cargo.toml` passed: 313 Rust lib tests plus integration/fixture/smoke tests.
- 2026-05-13: `pnpm build` passed with the existing Vite large chunk warning.
- 2026-05-13: `pnpm test` passed: frontend, contracts, data-integrity and smoke suites passed.
- 2026-05-13: IPC boundary scan passed; raw Tauri imports remain in `src/shared/api/*` or test mocks, with expected `Channel`/`defaultChannel` regex false positives.
- 2026-05-13: `pnpm tauri build` passed and produced macOS `.app` and `.dmg` bundles; existing bundle identifier warning remains.

### Completion Notes List

- Extended profile settings with local avatar metadata, uploaded avatar preview snapshots, preset ids and placeholder fallback.
- Added Rust avatar upload, preset selection, reset and uploaded-asset delete flows under the settings app/gateway layer.
- Stored uploads in app-data `avatars/uploads` and validated image type, 2 MB size limit, path safety, missing assets and unsupported presets with recoverable `AppError`s.
- Added avatar library storage manifest coverage, data-integrity validation, fixtures and fixture validators.
- Added Profile modal avatar controls and reflected uploaded/preset/default avatars into settings and owner/member surfaces.
- Added contract fixtures, Rust tests and frontend behavior tests for upload, preset, delete/reset and restore behavior.

### File List

- `_bmad-output/implementation-artifacts/7-2-avatar-upload-delete-reset-presets.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/settings/profile-avatar-delete-uploaded.error.json`
- `fixtures/contracts/settings/profile-avatar-delete-uploaded.request.json`
- `fixtures/contracts/settings/profile-avatar-delete-uploaded.result.json`
- `fixtures/contracts/settings/profile-avatar-preset-select.error.json`
- `fixtures/contracts/settings/profile-avatar-preset-select.request.json`
- `fixtures/contracts/settings/profile-avatar-preset-select.result.json`
- `fixtures/contracts/settings/profile-avatar-reset.error.json`
- `fixtures/contracts/settings/profile-avatar-reset.request.json`
- `fixtures/contracts/settings/profile-avatar-reset.result.json`
- `fixtures/contracts/settings/profile-avatar-upload.error.json`
- `fixtures/contracts/settings/profile-avatar-upload.request.json`
- `fixtures/contracts/settings/profile-avatar-upload.result.json`
- `fixtures/contracts/settings/profile-settings-get.result.json`
- `fixtures/contracts/settings/profile-settings-update.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/app-data/avatars/uploads/01KAVATARUPLOAD000000000001.png`
- `fixtures/data-integrity/valid-json-stores/app-data/settings/profile.json`
- `fixtures/schema/settings-v1/profile-settings.json`
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
- `src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/settings.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/settings-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 7.2 context for local avatar upload, delete/reset and preset selection.
- 2026-05-13: Completed Story 7.2 avatar upload, preset, delete/reset, manifest and UI reflection implementation.
