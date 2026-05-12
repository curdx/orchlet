# Story 1.2: 打开目录并创建新版工作区元数据

Status: done

## Story

As a workspace user,
I want to open any local directory as an orchlet workspace,
so that each project can have its own durable collaboration state.

## Acceptance Criteria

1. Given the user selects a writable local directory, when they open it as a workspace, then the app creates or updates `.orchlet/workspace.json`, and the metadata includes project id, schema version, created/updated timestamps and basic workspace identity.
2. Given the selected directory already contains valid `.orchlet/workspace.json`, when the user opens it again, then the app reads the existing metadata and enters the workspace without recreating project identity.
3. Given an invalid or partially written `.orchlet/workspace.json`, when the workspace is opened, then the app reports what is invalid, the impact scope and the available recovery action.

## Tasks / Subtasks

- [x] Task 1: Add real directory-selection capability behind the existing frontend API boundary (AC: 1)
  - [x] Add `@tauri-apps/plugin-dialog@2.7.1` and Rust `tauri-plugin-dialog@2.7.1`.
  - [x] Register `tauri_plugin_dialog::init()` in `src-tauri/src/lib.rs`.
  - [x] Grant only the dialog open permission needed for directory selection, preferably `dialog:allow-open`, in the current capability file; do not grant save/message/shell/fs/opener permissions for this story.
  - [x] Import `open` from `@tauri-apps/plugin-dialog` only inside `src/shared/api`; components/pages must not import Tauri APIs or plugins directly.
  - [x] Treat dialog cancel (`null`) as a no-op: keep the workspace-selection page visible and do not show an error toast.
  - [x] Guard unexpected multi-select/array results even if `multiple: false` is passed.

- [x] Task 2: Replace the Story 1.1 placeholder API with typed open-workspace contracts (AC: 1-3)
  - [x] Replace `OpenWorkspacePlaceholderResponse` with concrete DTOs such as `OpenWorkspaceRequest`, `WorkspaceMetadata`, and `OpenWorkspaceResult` in `src-tauri/src/contracts/workspace.rs`.
  - [x] Keep `WindowMode` and `WorkspaceSelectionStatus`; extend only when needed by this story.
  - [x] Export regenerated TypeScript bindings into `src/contracts/generated` with `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`.
  - [x] Add a typed `workspaceApi.pickAndOpenWorkspace()` or equivalent facade that runs the dialog and then invokes the backend command.
  - [x] Keep raw `invoke` isolated to `src/shared/api/client.ts`; no raw Tauri calls in page/feature code.
  - [x] Remove the browser/test placeholder success path. In non-Tauri browser runtime, opening a workspace should return a recoverable typed `AppError`, not pretend a workspace was opened.

- [x] Task 3: Implement Rust workspace metadata creation/read/update through proper boundaries (AC: 1-3)
  - [x] Keep the exposed Tauri command in `src-tauri/src/gateway/workspace_commands.rs`; gateway should deserialize DTOs and call an app use case, not hold business logic.
  - [x] Add the minimal used modules only, following architecture boundaries:
    - `src-tauri/src/app/workspace/` for the open-workspace use case.
    - `src-tauri/src/domain/workspace/` for metadata validation rules and domain types if they are not purely DTOs.
    - `src-tauri/src/infrastructure/filesystem/` or `src-tauri/src/infrastructure/persistence/json_store/` for filesystem/JSON operations.
  - [x] Validate the requested path exists, is a directory, and is canonicalized before writing.
  - [x] Create `.orchlet/` if missing, then write `.orchlet/workspace.json` atomically via a temporary file and rename.
  - [x] Use schema version `1`.
  - [x] Generate `projectId` as a ULID string; current registry check found `ulid = "1.2.1"`.
  - [x] Use millisecond timestamps for `createdAtMs` and `updatedAtMs`.
  - [x] Store only portable workspace identity in `.orchlet/workspace.json`: `schemaVersion`, `projectId`, `name`, `createdAtMs`, `updatedAtMs`. Do not persist an absolute root path in the workspace-local metadata file.
  - [x] The IPC result may include the selected/canonical root path for current UI state, but path persistence in global recent/registry storage is Story 1.3.
  - [x] When valid metadata already exists, preserve `projectId` and `createdAtMs`; update `updatedAtMs` and current display `name` if needed.
  - [x] When metadata is invalid JSON, missing required fields, has unsupported schema version, or has invalid field types, do not overwrite it automatically. Return an `AppError` with code, message, impact, recovery action and details.

- [x] Task 4: Update Workspace Selection UI from placeholder toast to real open flow (AC: 1-3)
  - [x] Update `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` to call the new `workspaceApi` method.
  - [x] Preserve the existing required first-screen content: `orchlet`, `打开文件夹`, `选择一个文件夹开始或恢复工作区`, `最近的工作区`, `暂无最近工作区`, `打开文件夹以创建你的第一个工作区。`
  - [x] Preserve loading/disabled visual state while dialog/backend work is in progress.
  - [x] On success, show a clear opened-workspace state on the current page with workspace name, project id and schema version. Do not fake chat, members, terminal, recent workspace data, registry data or a complete main shell.
  - [x] On cancel, leave the current state untouched.
  - [x] On invalid metadata or write failure, show a toast that explains what happened, impact scope and the next action, using the existing toast pattern.

- [x] Task 5: Keep this story out of later Epic 1 scopes (AC: 1-3)
  - [x] Do not implement recent workspace listing, search, sorting, or global registry updates; Story 1.3 owns that.
  - [x] Do not implement project-id path conflict/move/copy semantics; Story 1.3 owns that.
  - [x] Do not implement read-only workspace fallback or app-data fallback; Story 1.4 owns that. For now, unwritable workspace metadata creation returns a recoverable error.
  - [x] Do not implement system file-manager open; Story 1.4 owns that. Do not re-add `tauri-plugin-opener` in this story unless a test proves dialog cannot meet the actual directory-selection requirement.
  - [x] Do not add SQLite schema, storage manifest or schema validation report beyond the `workspace.json` schema marker required here; Stories 1.6 and 1.7 own broader fixture/report foundations.
  - [x] Do not read old `.golutra` or old app data.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Add Rust tests for: creates new metadata in a temp directory, reopens valid metadata without changing `projectId`, rejects invalid/partial metadata without overwriting it, and returns useful `AppError` details.
  - [x] Add or update frontend tests for: first screen still renders, cancel/no-Tauri fallback does not fake success, success state renders when `workspaceApi` is mocked to return a workspace, invalid metadata error renders a recoverable toast.
  - [x] Run `pnpm install` after adding frontend dependencies and commit the updated lockfile.
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `cargo check` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run the IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.
  - [x] Record any platform limitation around interactive directory-picker verification in the Dev Agent Record; do not claim a manual desktop picker smoke passed unless it was actually exercised.

### Review Findings

- [x] [Review][Patch] Surface invalid metadata field detail and impact scope in existing toast flow [`src-tauri/src/infrastructure/persistence/json_store/workspace_metadata_store.rs`:43] — resolved by including serde field error text in the user-visible message for invalid/missing metadata fields and prefixing workspace-open failure recovery actions with the impact scope that the current workspace was not opened.

## Dev Notes

### Scope Boundary

This story is the first real workspace-open slice. It should turn the Story 1.1 placeholder into a real Tauri directory picker plus Rust-owned `.orchlet/workspace.json` creation/read/update flow.

The story intentionally stops before recent workspaces, workspace registry conflict handling, read-only fallback, global app-data fallback, file-manager open, SQLite, storage manifest and full main-shell behavior. Those are separate Epic 1 stories and must remain separate to avoid burying persistence and conflict semantics inside a first open-flow patch.

### Current Implementation State

- `WorkspaceSelectionPage` currently calls `workspaceApi.requestOpenWorkspace()` and expects a typed placeholder warning toast.
- `src/shared/api/client.ts` is the only frontend file importing raw `invoke` from `@tauri-apps/api/core`; preserve this boundary.
- `src/shared/api/client.ts` has browser/test fallback behavior for `workspace_selection_status` and `request_open_workspace`; update it so browser runtime cannot fake a successful workspace open.
- `src-tauri/src/contracts/workspace.rs` currently contains `WindowMode`, `WorkspaceSelectionStatus`, and `OpenWorkspacePlaceholderResponse`.
- `src-tauri/src/gateway/workspace_commands.rs` currently returns a placeholder `AppError` for `request_open_workspace`.
- `src-tauri/src/lib.rs` currently registers only the workspace selection placeholder commands.
- `src-tauri/capabilities/default.json` currently grants only `core:default` to the `main` window. Story 1.2 should add the least permission needed for dialog open.
- There are no committed git commits yet; use Story 1.1 file list and current source files as the implementation baseline.

### Metadata Contract

Use this shape for `.orchlet/workspace.json` unless implementation uncovers a hard reason to change it:

```json
{
  "schemaVersion": 1,
  "projectId": "01K...",
  "name": "project-folder",
  "createdAtMs": 1760000000000,
  "updatedAtMs": 1760000000000
}
```

Rules:

- `projectId` is stable for the workspace and must not be regenerated when valid metadata already exists.
- `schemaVersion` is required and currently must equal `1`.
- `createdAtMs` is preserved on reopen.
- `updatedAtMs` may be refreshed on successful open/update.
- `name` is the current directory basename or a safe fallback if the basename is unavailable.
- Do not store absolute local paths in the workspace-local metadata file; paths belong in current IPC state and later global registry/recent workspace data.

### Architecture Compliance

- Frontend stack remains React + TypeScript + Vite + Tailwind CSS v4.
- Desktop backend remains Tauri 2 + Rust.
- Add only libraries needed by this story:
  - `@tauri-apps/plugin-dialog@2.7.1`
  - `tauri-plugin-dialog@2.7.1`
  - `ulid@1.2.1` Rust crate for project ids
  - `tempfile@3.27.0` as a Rust dev-dependency for tests
- Do not re-add `@tauri-apps/plugin-opener` / `tauri-plugin-opener` for this story. It is likely useful for Story 1.4 file-manager open, but directory selection should use the dialog plugin.
- Rust command names use snake_case; frontend API methods use camelCase.
- IPC JSON fields use camelCase through `serde(rename_all = "camelCase")`.
- Frontend components import only typed API methods from `src/shared/api`.
- `gateway` exposes commands, `app` coordinates use cases, `domain` validates workspace invariants, and `infrastructure` owns filesystem/JSON operations.
- Avoid broad empty folder scaffolding. Create a module only when this story places working code in it.

### Error Handling Requirements

All workspace-open failures must become `AppError` values with:

- `code`
- `message`
- `severity`
- `recoverable`
- `userAction`
- `details`
- `correlationId` if available

Required cases:

- Selected path does not exist.
- Selected path is not a directory.
- `.orchlet` cannot be created.
- `workspace.json` cannot be read.
- `workspace.json` is invalid JSON.
- `workspace.json` has missing/invalid fields.
- `workspace.json` has unsupported schema version.
- Atomic write/rename fails.

Do not silently ignore filesystem errors. Do not overwrite invalid metadata automatically.

### UX Requirements

- Keep the workspace-selection first screen dense and work-focused; do not introduce a marketing page.
- `打开文件夹` remains keyboard focusable and has loading/disabled state.
- Directory-picker cancel is not an error.
- Success state should be truthful: the workspace metadata is ready, but chat/terminal/member features are not implemented yet.
- Error toast follows the UX spec: what happened, impact, next action.
- Icon-only controls still use `lucide-react`, `aria-label` and tooltip text.

### Testing Requirements

- Rust tests should exercise filesystem behavior using `tempfile`; avoid relying on the user's real filesystem.
- Tests must prove project identity is not recreated on reopen.
- Tests must prove invalid/partial metadata is not overwritten.
- Frontend tests must not depend on a real system dialog in jsdom.
- Contract export tests must keep generated TypeScript in sync with Rust DTOs.
- IPC boundary scan must allow raw `invoke` and Tauri plugin imports only under `src/shared/api`.

### Previous Story Intelligence

- Story 1.1 established the official Tauri 2 + React + TypeScript starter in this repo without wiping `_bmad`, `_bmad-output`, `docs` or `.git`.
- Story 1.1 established `src/shared/api` as the only frontend Tauri boundary and `src-tauri/src/gateway` as the command boundary.
- Story 1.1 added `src-tauri/src/contracts` DTOs and `ts-rs` TypeScript exports into `src/contracts/generated`.
- Story 1.1 code review removed unused opener plugin/dependency/capability. The removal was intentional least-permission cleanup; future stories can add opener when a real file-manager-open feature requires it.
- Existing verification that should remain green after this story: `pnpm test`, `pnpm build`, `cargo check`, `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`, IPC boundary scan, and `pnpm tauri build`.

### Latest Technical Snapshot

Registry checks on 2026-05-11:

- `@tauri-apps/api@2.11.0`
- `@tauri-apps/cli@2.11.1`
- Rust crate `tauri@2.11.1`
- `@tauri-apps/plugin-dialog@2.7.1`
- Rust crate `tauri-plugin-dialog@2.7.1`
- Rust crate `rusqlite@0.39.0`
- Rust crate `ulid@1.2.1`
- Rust crate `tempfile@3.27.0`

Official Tauri dialog docs state the dialog plugin exposes file/directory picker behavior and has an `allow-open` permission; use the narrow open permission for this story rather than the whole default dialog set unless implementation proves the narrow permission is insufficient.

### Project Structure Notes

Expected touched files/modules:

- `package.json`
- `pnpm-lock.yaml`
- `src/App.test.tsx` or page-specific tests
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/workspace-api.ts`
- `src/contracts/generated/*`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/capabilities/default.json` or a deliberately named workspace-selection capability file
- `src-tauri/src/contracts/workspace.rs`
- `src-tauri/src/contracts/mod.rs` if exports change
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/lib.rs`
- New Rust modules under `src-tauri/src/app/workspace`, `src-tauri/src/domain/workspace`, and/or `src-tauri/src/infrastructure/...` only if they contain real code for this story.

Do not modify `_bmad`, `docs`, planning artifacts, or unrelated generated target/dist files as part of implementation.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 1.2 acceptance criteria and Epic 1 scope.
- `_bmad-output/planning-artifacts/prd.md` - FR1, FR2, FR73, FR75; NFR8, NFR14, NFR19, NFR20, NFR26, NFR31, NFR35, NFR36, NFR37.
- `_bmad-output/planning-artifacts/architecture.md` - storage layout, typed IPC, capabilities by window mode, module boundaries, naming conventions and workspace data flow.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Workspace Selection layout, directory-picker behavior, cancel behavior and toast/error requirements.
- `_bmad-output/implementation-artifacts/1-1-set-up-initial-project-from-starter-template.md` - prior story implementation patterns, review fixes and verification baseline.
- Tauri Dialog plugin docs: https://v2.tauri.app/plugin/dialog/

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm install` - lockfile already up to date; pnpm reported ignored `esbuild` build script warning.
- `pnpm test` - 1 test file, 5 tests passed.
- `pnpm build` - TypeScript and Vite production build passed.
- `cargo fmt --check` - passed after formatting Rust files.
- `cargo check` in `src-tauri` - passed.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri` - 12 tests passed, including regenerated TypeScript bindings.
- IPC boundary scan - only `src/shared/api/client.ts` imports `@tauri-apps/api/core`; only `src/shared/api/workspace-api.ts` imports `@tauri-apps/plugin-dialog`.
- `pnpm tauri build` - passed and produced `src-tauri/target/release/bundle/macos/orchlet.app` and `src-tauri/target/release/bundle/dmg/orchlet_0.1.0_aarch64.dmg`; build emitted the existing warning that bundle identifier `com.orchlet.app` ends with `.app`.
- Code review patch validation: `pnpm test`, `pnpm build`, `cargo fmt --check && cargo check && TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`, IPC boundary scan, and `pnpm tauri build` all passed after the review fix.

### Completion Notes List

- Story context engine analysis completed on 2026-05-11.
- Story prepared with explicit boundaries to avoid absorbing Story 1.3 recent/registry conflict work, Story 1.4 read-only/file-manager work, and Story 1.6/1.7 storage fixture/report work.
- Replaced the placeholder workspace-open path with a real dialog-backed frontend facade and `workspace_open` Tauri command.
- Added `.orchlet/workspace.json` create/read/update behavior with canonical directory validation, ULID project ids, schema version 1, millisecond timestamps, stable project identity on reopen, and atomic temp-file-plus-rename writes.
- Added recoverable `AppError` handling for missing paths, non-directory paths, metadata read/write failures, invalid JSON, invalid/missing fields, unsupported schema versions and invalid domain values; invalid metadata is not overwritten automatically.
- Updated the workspace-selection page to preserve the existing first screen, keep cancel as a no-op, show truthful opened-workspace metadata on success, and show recoverable toasts for invalid metadata/write failures.
- Kept Story 1.3/1.4/1.6/1.7 scope out of this implementation: no recent registry, conflict semantics, read-only fallback, file-manager open, SQLite, storage manifest, or old `.golutra` migration was added.
- Interactive desktop directory-picker smoke was not manually exercised; verification used mocked frontend tests, Rust filesystem tests, IPC boundary scan, and successful Tauri production build.
- Code review found and resolved one acceptance-quality patch: invalid/partial metadata errors now surface the offending field reason and state that the workspace was not opened in the existing toast flow.

### File List

- `package.json`
- `pnpm-lock.yaml`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/workspace.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/workspace-api.ts`
- `src-tauri/Cargo.lock`
- `src-tauri/Cargo.toml`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/app/workspace/mod.rs`
- `src-tauri/src/contracts/common.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/workspace.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/domain/workspace/mod.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/infrastructure/filesystem/mod.rs`
- `src-tauri/src/infrastructure/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_metadata_store.rs`
- `src-tauri/src/infrastructure/persistence/mod.rs`
- `src-tauri/src/lib.rs`

## Change Log

- 2026-05-11: Created Story 1.2 context and marked ready for development.
- 2026-05-11: Implemented real directory open flow, workspace metadata persistence, typed contracts, UI success/error states, tests and production build verification; marked ready for review.
- 2026-05-11: Completed code review patch for metadata error clarity and marked Story 1.2 done.
