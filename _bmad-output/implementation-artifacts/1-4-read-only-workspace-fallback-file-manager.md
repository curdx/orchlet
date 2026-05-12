# Story 1.4: 只读工作区 fallback 与系统文件管理器入口

Status: done

## Story

As a user working with restricted directories,
I want orchlet to handle unwritable workspaces predictably,
so that I can still inspect the project without losing app state.

## Acceptance Criteria

1. Given a selected workspace directory is not writable, when the user opens it, then the app enters read-only mode for workspace-local data and stores necessary fallback state under local application data.
2. Given the app enters read-only mode, when the UI displays workspace status, then the user can see what is read-only, which actions are limited and what they can do next.
3. Given any opened workspace, when the user chooses open in file manager, then the operating system file manager opens the workspace path on Windows, macOS and Linux or shows a platform-specific unavailable message.

## Tasks / Subtasks

- [x] Task 1: Add typed read-only and file-manager contracts (AC: 1-3)
  - [x] Extend workspace DTOs with a `WorkspaceAccessMode` such as `readWrite | readOnly`.
  - [x] Add a `WorkspaceFallbackState` / read-only details DTO containing reason, fallback path, limited actions and user action.
  - [x] Add a typed file-manager open request/result command such as `workspace_open_in_file_manager`.
  - [x] Regenerate TypeScript bindings with `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`.
  - [x] Keep raw Tauri calls isolated to `src/shared/api`; UI code must call typed facade methods.

- [x] Task 2: Add opener plugin and least required permission for file-manager entry (AC: 3)
  - [x] Add `@tauri-apps/plugin-opener@2.5.4` and `tauri-plugin-opener@2.5.4`.
  - [x] Register `tauri_plugin_opener::init()` in `src-tauri/src/lib.rs`.
  - [x] Add the narrow opener permission needed for paths, expected `opener:allow-open-path`, without adding URL/default-url/shell permissions.
  - [x] Use Rust-side opener (`OpenerExt::open_path`) from a gateway/app boundary; do not import `@tauri-apps/plugin-opener` in frontend page code.

- [x] Task 3: Detect unwritable workspace-local metadata and enter read-only fallback (AC: 1-2)
  - [x] Before mutating `.orchlet/workspace.json`, check whether workspace-local metadata can be created/updated.
  - [x] If metadata creation/update fails because the selected workspace is unwritable, return an opened workspace in `readOnly` mode instead of failing the open flow.
  - [x] Preserve any valid existing metadata identity in read-only mode.
  - [x] If metadata is missing and cannot be created, generate a stable fallback project id persisted under app data for the canonical path.
  - [x] Store fallback state under app data, not under `.orchlet`, using a small JSON file with schema version 1 and atomic writes.
  - [x] Continue updating global registry/recent entries for read-only workspaces using app-data fallback identity/path.
  - [x] Do not treat invalid existing `.orchlet/workspace.json` as read-only fallback; invalid metadata still returns the structured repair error from prior stories.

- [x] Task 4: Surface read-only status in Workspace Selection UI (AC: 2)
  - [x] On opened workspace success, show whether access is read-write or read-only.
  - [x] For read-only mode, show a clear banner/status with what is read-only, which actions are limited, and the next action.
  - [x] Disable or mark workspace-local write actions that exist on this page if they would write `.orchlet`.
  - [x] Keep first-screen content and recent-workspace behavior from Stories 1.2/1.3 intact.

- [x] Task 5: Add Open in File Manager UI action (AC: 3)
  - [x] Add an `打开文件管理器` action for any opened workspace.
  - [x] The action calls `workspaceApi.openWorkspaceInFileManager(path)` and shows success/failure feedback using the existing toast pattern.
  - [x] If the platform/opener fails, show a recoverable typed error with what happened, impact scope and next action.
  - [x] Do not add arbitrary URL opener behavior, shell commands, or generic path open from UI.

- [x] Task 6: Keep Story 1.4 inside its Epic 1 boundary (AC: 1-3)
  - [x] Do not implement full multi-window context sync; Story 1.5 owns that.
  - [x] Do not add SQLite schema, storage manifest or schema validation report; Stories 1.6 and 1.7 own those.
  - [x] Do not read old `.golutra` or old app data.
  - [x] Do not add URL opener/default-url permissions.

- [x] Task 7: Verification and completion evidence (AC: 1-3)
  - [x] Add Rust tests for read-write open, existing valid metadata read-only fallback, missing metadata fallback identity persistence, invalid metadata still rejected, registry/recent update in read-only mode, and file-manager opener success/failure adapter behavior where practical.
  - [x] Add/update frontend tests for read-only banner/status, file-manager action success/failure, existing first screen, recent list/search/conflict regression.
  - [x] Run `pnpm install` after adding frontend dependencies and commit updated lockfile.
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `cargo fmt --check` and `cargo check` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.
  - [x] Record any platform limitation around manual file-manager verification; do not claim manual OS file-manager smoke passed unless exercised.

### Review Findings

- [x] [Review][Patch] Disable opener plugin auto-link URL behavior and preserve fallback identity after permissions recover [`src-tauri/src/lib.rs`:10, `src-tauri/src/app/workspace/mod.rs`:93] — resolved by registering opener through `Builder::new().open_js_links_on_click(false)`, reusing persisted fallback project ids when `.orchlet/workspace.json` can later be written, and adding a Rust regression test for read-only-to-read-write recovery.

## Dev Notes

### Scope Boundary

Story 1.4 adds read-only workspace fallback and system file-manager opening. It builds on Story 1.2 metadata opening and Story 1.3 registry/recent/conflict behavior.

Read-only fallback applies to workspace-local write failure. It must not hide invalid/corrupt `.orchlet/workspace.json`; corrupt metadata remains a repair error.

### Current Implementation State

- `OpenWorkspaceResult` currently has `status`, optional `workspace`, and optional `conflict`.
- `OpenedWorkspace` currently includes `rootPath`, `metadata`, `created`, `registryEntry`, and `registryAction`.
- Registry/recent persistence lives in app data `workspace-registry.json`.
- Workspace metadata writes are owned by `workspace_metadata_store.rs` and currently return recoverable metadata write/create errors.
- `WorkspaceSelectionPage` already renders opened workspace metadata, recent workspaces, conflict modal and recoverable toasts.

### Technical Guidance

- Re-add opener only now because Story 1.4 owns file-manager open. Use current registry checks: `@tauri-apps/plugin-opener@2.5.4`, `tauri-plugin-opener@2.5.4`.
- Tauri opener docs list `opener:allow-open-path` for `open_path`; do not add `opener:allow-open-url`, `opener:allow-default-urls`, shell permissions, or broad fs plugin permissions.
- Prefer Rust-side `tauri_plugin_opener::OpenerExt` so frontend does not import opener.
- App-data fallback identity should be deterministic by persisted mapping, not by hashing path every time unless the mapping is missing and write fails.
- Keep fallback JSON minimal, e.g. `workspace-fallbacks.json` with `schemaVersion: 1` and entries keyed by canonical path/project id.

### UX Requirements

- Read-only status must be visible near the opened-workspace state.
- Copy must explain: workspace-local data is read-only, fallback state is stored in app data, future write actions may be limited.
- File-manager action should be a normal button with icon/text, not a hidden icon-only control.
- Errors must state what happened, impact scope and next action.

### Previous Story Intelligence

- Story 1.3 added registry/recent app-data persistence and structured conflict outcomes.
- Story 1.3 code review fixed recent-list registry load failures so they show recoverable toasts; keep that standard for file-manager failures and fallback failures.
- Story 1.2/1.3 verification baseline to preserve: `pnpm test`, `pnpm build`, `cargo fmt --check`, `cargo check`, `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`, IPC boundary scan, and `pnpm tauri build`.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 1.4 ACs and Epic 1 scope.
- `_bmad-output/planning-artifacts/prd.md` - FR3, FR7; NFR8, NFR19, NFR20, NFR22, NFR31, NFR35, NFR36, NFR37.
- `_bmad-output/planning-artifacts/architecture.md` - read-only fallback ownership, platform adapter boundaries, capabilities, typed IPC and workspace service responsibility.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - read-only banner and limited actions.
- `_bmad-output/implementation-artifacts/1-3-manage-recent-workspaces-registry-conflicts.md` - registry/recent/conflict implementation baseline.
- Tauri Opener plugin docs - `openPath`/Rust `open_path` and `opener:allow-open-path` permission.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-11: `pnpm install` passed; lockfile already up to date after adding opener.
- 2026-05-11: `pnpm test` passed (11 tests).
- 2026-05-11: `pnpm build` passed.
- 2026-05-11: `cargo fmt --check` passed in `src-tauri`.
- 2026-05-11: `cargo check` passed in `src-tauri`.
- 2026-05-11: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed (34 tests).
- 2026-05-11: IPC boundary scan only found Tauri imports in `src/shared/api/client.ts` and `src/shared/api/workspace-api.ts`.
- 2026-05-11: `pnpm tauri build` passed and produced macOS app/dmg bundles; existing `com.orchlet.app` identifier warning remains.
- 2026-05-11: Code review patch validation passed after disabling opener auto-link behavior and adding fallback identity recovery: `pnpm test`, `pnpm build`, `cargo fmt --check`, `cargo check`, `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`, IPC boundary scan, and `pnpm tauri build`.

### Completion Notes List

- Story context engine analysis completed on 2026-05-11.
- Implemented typed read-only workspace mode and fallback DTOs on `OpenedWorkspace`.
- Added app-data `workspace-fallbacks.json` store with schema version 1, stable fallback project ids, validation, and atomic writes.
- Added read-only fallback when workspace-local metadata creation/update fails while preserving invalid metadata repair errors.
- Added Rust-side file manager opening through `tauri-plugin-opener` and a typed `workspace_open_in_file_manager` command.
- Added Workspace Selection UI read-only status/banner and `打开文件管理器` action with recoverable toast feedback.
- Manual OS file-manager smoke was not exercised; adapter behavior, typed command path validation, permissions, and Tauri packaging were verified by automated tests/build.
- Code review found and resolved one patch: opener URL auto-link behavior is disabled, and missing-metadata fallback identities are reused when the workspace becomes writable later.

### File List

- `_bmad-output/implementation-artifacts/1-4-read-only-workspace-fallback-file-manager.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `package.json`
- `pnpm-lock.yaml`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/workspace.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/workspace-api.ts`
- `src-tauri/Cargo.lock`
- `src-tauri/Cargo.toml`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/app/workspace/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/workspace.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_fallback_store.rs`
- `src-tauri/src/lib.rs`

## Change Log

- 2026-05-11: Created Story 1.4 context and marked ready for development.
- 2026-05-11: Implemented read-only workspace fallback, file-manager opener command/UI, tests, and validation evidence; marked ready for review.
- 2026-05-11: Resolved code review patch, reran full validation, and marked Story 1.4 done.
