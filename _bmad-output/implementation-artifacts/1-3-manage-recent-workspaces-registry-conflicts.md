# Story 1.3: 管理最近工作区和 workspace registry 冲突

Status: done

## Story

As a returning user,
I want to find and reopen recent workspaces safely,
so that I do not accidentally open duplicated or ambiguous project copies.

## Acceptance Criteria

1. Given the user has opened one or more workspaces, when they view the workspace selector, then recent workspaces are searchable and sorted by recent activity.
2. Given two paths point to the same project id, when the user attempts to open the second path, then the app detects the conflict and asks the user to choose move or copy semantics.
3. Given a workspace is already open in a main window, when the user attempts to open the same workspace again, then the existing window is focused or surfaced and a duplicate main window is not created.

## Tasks / Subtasks

- [x] Task 1: Extend typed workspace contracts for recent workspaces and registry conflict outcomes (AC: 1-3)
  - [x] Add DTOs in `src-tauri/src/contracts/workspace.rs` for `RecentWorkspaceEntry`, `WorkspaceRegistryEntry`, `WorkspaceRegistryConflict`, `WorkspaceConflictResolution`, and an open-workspace response that can represent `opened`, `conflict`, and `focusedExisting` outcomes.
  - [x] Preserve `WindowMode`, `WorkspaceSelectionStatus`, `WorkspaceMetadata`, and existing camelCase JSON field naming.
  - [x] Extend `OpenWorkspaceRequest` with optional conflict resolution, e.g. `conflictResolution: "move" | "copy" | null`; do not encode conflict choices in stringly typed `AppError.details`.
  - [x] Add a typed recent-list command such as `workspace_recent_list`.
  - [x] Regenerate TypeScript bindings with `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`.
  - [x] Keep raw Tauri `invoke` isolated to `src/shared/api/client.ts`; page/feature code must call typed methods from `src/shared/api`.

- [x] Task 2: Add global app-data workspace registry JSON store (AC: 1-2)
  - [x] Resolve app data from Rust/Tauri only, using `AppHandle.path().app_data_dir()` or an infrastructure wrapper passed from the gateway; do not use browser localStorage or frontend path APIs as authoritative storage.
  - [x] Store global registry/recent data under the orchlet app data namespace, not inside `.orchlet/workspace.json`.
  - [x] Use a single minimal JSON registry file unless implementation proves separation is necessary, e.g. `workspace-registry.json`:
    ```json
    {
      "schemaVersion": 1,
      "entries": [
        {
          "projectId": "01K...",
          "path": "/canonical/workspace/path",
          "name": "workspace-folder",
          "firstOpenedAtMs": 1760000000000,
          "lastOpenedAtMs": 1760000000000
        }
      ]
    }
    ```
  - [x] Treat `entries` as both registry and recent-workspace source of truth; sort by `lastOpenedAtMs` descending for recent UI.
  - [x] Validate registry schema version, duplicate `projectId`, duplicate canonical path with different `projectId`, missing fields, invalid timestamps, and invalid ULID project ids.
  - [x] Write registry updates atomically via temp file plus rename, mirroring the Story 1.2 metadata store pattern.
  - [x] Return recoverable `AppError` values for app-data path resolution, registry read/parse/validation, and registry write failures; errors must state what happened, impact scope, and next action.

- [x] Task 3: Refactor workspace open flow so conflict detection does not mutate before user choice (AC: 2)
  - [x] Split current `open_or_create_workspace_metadata` behavior so the app can read existing metadata before updating `updatedAtMs`.
  - [x] For a directory without `.orchlet/workspace.json`, create metadata and add/update the registry entry normally.
  - [x] For valid metadata whose `projectId` is not in the registry, add a registry entry and recent timestamp.
  - [x] For valid metadata whose `projectId` is already registered to the same canonical path, update `lastOpenedAtMs`, workspace name, and metadata `updatedAtMs`.
  - [x] For valid metadata whose `projectId` is already registered to a different canonical path and no resolution was provided, return a structured `conflict` response with existing path, selected path, project id, and workspace name; do not update registry, recent timestamps, or selected workspace metadata yet.
  - [x] For `move` resolution, preserve the project id, update the registry path to the selected canonical path, update recent timestamp/name, and then update selected metadata `updatedAtMs`/name.
  - [x] For `copy` resolution, generate a new ULID project id for the selected path, rewrite selected `.orchlet/workspace.json` atomically with the new identity, and add it as a distinct registry entry.
  - [x] For cancel/no resolution, leave both registry and workspace metadata unchanged.

- [x] Task 4: Add duplicate-open window reuse behavior without implementing full multi-window sync (AC: 3)
  - [x] Track currently opened workspace project ids in a minimal Rust runtime state owned by the app, e.g. `WorkspaceRuntimeState` with a `Mutex` map.
  - [x] When opening a workspace whose project id is already marked open, focus/surface the existing main window if available and return a `focusedExisting` outcome.
  - [x] Do not create a second main window in this story.
  - [x] If the tracked window is missing or stale, recover by replacing the runtime entry on successful open rather than returning a hard failure.
  - [x] Keep broader cross-window context sync, terminal window sync, unread state, and notification preview routing out of scope for Story 1.5.

- [x] Task 5: Update workspace-selection UI for recent list, search, and conflict resolution (AC: 1-3)
  - [x] Query recent workspaces through `workspaceApi.listRecentWorkspaces()` using TanStack Query.
  - [x] Preserve the existing required first-screen content: `orchlet`, `打开文件夹`, `选择一个文件夹开始或恢复工作区`, `最近的工作区`, `暂无最近工作区`, `打开文件夹以创建你的第一个工作区。`
  - [x] When recent entries exist, render a search input labeled/placeholder `搜索文件夹...` and filter case-insensitively by workspace name and path.
  - [x] Render recent entries sorted by most recent activity, showing workspace name, path, recent-open time, and an `打开` action.
  - [x] Opening a recent entry should call the same typed backend open flow by path and handle missing/unreadable paths with the existing recoverable toast pattern.
  - [x] On conflict response, show a modal titled `工作区位置变化` with old path, current path, and actions `移动了`, `复制副本`, and `取消`.
  - [x] `移动了` retries open with `conflictResolution: "move"`; `复制副本` retries with `conflictResolution: "copy"`; `取消` closes the modal and does not open the workspace.
  - [x] The modal must be keyboard accessible: focus enters the dialog, Esc cancels, and focus returns to the triggering control.
  - [x] On `focusedExisting`, keep the current selection UI coherent and show a small status/toast that the existing workspace window was surfaced; do not fake chat, member, terminal, registry inspector, or a complete main shell.

- [x] Task 6: Keep Story 1.3 inside its Epic 1 boundary (AC: 1-3)
  - [x] Do not implement read-only workspace fallback or app-data fallback; Story 1.4 owns that.
  - [x] Do not implement system file-manager open; Story 1.4 owns that and may re-add opener later.
  - [x] Do not implement full multi-window context sync, unread sync, terminal windows, or notification routing; Story 1.5 and later epics own those.
  - [x] Do not add SQLite schema, storage manifest, schema validation report, or storage manifest fixtures beyond the minimal registry schema marker needed here; Stories 1.6 and 1.7 own broader schema/report foundations.
  - [x] Do not read old `.golutra` or old app data.
  - [x] Do not add frontend raw Tauri filesystem/path APIs or broad capabilities; registry persistence stays in Rust app-data infrastructure.

- [x] Task 7: Verification and completion evidence (AC: 1-3)
  - [x] Add Rust tests for: registry create/update, recent sorting, search/list payload ordering if implemented backend-side, same project id same path reopen, same project id different path conflict with no mutation, move resolution, copy resolution rewriting project id, duplicate-open `focusedExisting`, invalid registry JSON/shape without overwrite, and app-data write failure as recoverable error where practical.
  - [x] Add or update frontend tests for: first screen still renders, recent list renders sorted entries, search filters by name/path, recent open uses typed API, conflict modal renders old/current paths and each action calls the expected resolution, cancel leaves state unchanged, and `focusedExisting` feedback renders without fake main-shell data.
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `cargo fmt --check` and `cargo check` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run the IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.
  - [x] Record any platform limitation around manual window focus/surface verification in the Dev Agent Record; do not claim a manual duplicate-window smoke passed unless it was actually exercised.

### Review Findings

- [x] [Review][Patch] Surface recent-workspace registry load failures in the existing toast flow [`src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`:84] — resolved by normalizing `workspace_recent_list` query errors into a recoverable toast and adding a frontend regression test for invalid registry load errors.

## Dev Notes

### Scope Boundary

This story builds on Story 1.2's real open-workspace flow. It adds the global app-data registry/recent-workspace layer, conflict semantics for copied/moved workspaces, and minimal duplicate-open window reuse.

The story intentionally stops before read-only fallback, file-manager open, full multi-window context sync, SQLite, storage manifest/report foundations, terminal windows, notification routing, and old `.golutra` compatibility.

### Current Implementation State

- `workspaceApi.pickAndOpenWorkspace()` currently opens the Tauri dialog and then invokes `workspace_open`.
- `WorkspaceSelectionPage` currently shows a truthful opened-workspace state after success and still renders the "最近的工作区" empty state.
- `workspace_open` currently returns `OpenWorkspaceResult` directly and does not consult global app data.
- `.orchlet/workspace.json` currently stores only `schemaVersion`, `projectId`, `name`, `createdAtMs`, and `updatedAtMs`; it deliberately does not persist absolute paths.
- `open_or_create_workspace_metadata` currently reads/creates/updates metadata in one operation. Story 1.3 likely needs to split read/create/update steps so conflict detection can happen before mutating copied workspace metadata.
- `src/shared/api/client.ts` remains the raw `invoke` boundary. `src/shared/api/workspace-api.ts` remains the only frontend Tauri plugin import site.
- `src-tauri/capabilities/default.json` currently grants only `core:default` and `dialog:allow-open`.

### Registry Contract

Use schema version `1` for the first registry file. A single registry file is preferred because it avoids cross-file consistency bugs between "recent" and "registry" during this early slice.

Suggested minimum shape:

```json
{
  "schemaVersion": 1,
  "entries": [
    {
      "projectId": "01K...",
      "path": "/canonical/workspace/path",
      "name": "workspace-folder",
      "firstOpenedAtMs": 1760000000000,
      "lastOpenedAtMs": 1760000000000
    }
  ]
}
```

Rules:

- `projectId` must be a ULID string and match the workspace identity unless the user chooses copy semantics.
- `path` is a canonical absolute path stored only in global app data; do not add it to `.orchlet/workspace.json`.
- `firstOpenedAtMs` is preserved for a registry entry unless copy semantics creates a new project id.
- `lastOpenedAtMs` updates on successful open, move, copy, or recent reopen.
- Recent workspaces are `entries` sorted by `lastOpenedAtMs` descending.
- Invalid registry data must not be silently overwritten. Return `AppError` with code, message, severity, recoverable, userAction, details, and correlationId if available.
- For privacy, paths remain local-only and must not be uploaded or logged beyond local diagnostic context.

### Conflict Semantics

Conflict means the selected workspace metadata has a `projectId` already known in registry with a different canonical path.

- No resolution: return structured `conflict`; no registry write and no selected workspace metadata update.
- Move: same real project moved locations. Preserve `projectId`, update registry path/name/lastOpenedAtMs, update selected metadata name/updatedAtMs.
- Copy: duplicated folder should become a separate workspace. Generate a new ULID `projectId`, rewrite selected `.orchlet/workspace.json` atomically with new identity, add a new registry entry.
- Cancel: no writes.

Do not handle broader path corruption/import semantics beyond this. If registry has impossible state such as duplicate paths with different project ids, return a recoverable registry validation error rather than guessing.

### Architecture Compliance

- Frontend remains React + TypeScript + Vite + Tailwind CSS v4.
- Desktop backend remains Tauri 2 + Rust.
- No new dependencies are expected. Reuse `serde`, `serde_json`, `ts-rs`, `ulid`, and `tempfile`.
- App-data path resolution belongs in Rust. Tauri 2.11.1 exposes path APIs and `PathResolver::app_data_dir()` returns the suggested app data directory as `data_dir/{bundle_identifier}`.
- Tauri commands stay in `src-tauri/src/gateway`; use cases stay in `src-tauri/src/app/workspace`; validation/invariants stay in `src-tauri/src/domain/workspace`; JSON persistence stays under `src-tauri/src/infrastructure/persistence/json_store`; desktop/window focus helpers, if needed, belong under `src-tauri/src/infrastructure/desktop` or a similarly narrow adapter.
- IPC JSON fields use camelCase through `serde(rename_all = "camelCase")`.
- Rust command names use snake_case; frontend API methods use camelCase.
- Avoid broad empty folder scaffolding. Create only modules with working code.

### UX Requirements

- Keep the workspace-selection page dense and work-focused; do not introduce a marketing page.
- Recent-workspace rows should be compact, scannable, keyboard reachable, and not visually dominate the primary open-folder card.
- Search should be local, immediate, and case-insensitive over name and path.
- Empty state text must remain unchanged when there are no entries.
- Conflict modal copy must match UX terms: `工作区位置变化`, `移动了`, `复制副本`, `取消`.
- Modal cancel is not an error.
- Error toasts follow the same rule as Story 1.2: what happened, impact scope, next action.

### Testing Requirements

- Rust tests should use `tempfile` and should not touch the user's real app data directory.
- App-data path should be injectable for tests; do not force tests to create files in the OS app data path.
- Tests must prove conflict detection does not mutate metadata or registry before the user chooses move/copy.
- Tests must prove copy semantics rewrites the selected workspace project id and move semantics preserves it.
- Frontend tests must mock the typed `WorkspaceApi`; do not depend on a real system dialog or real window focus in jsdom.
- Contract export tests must keep generated TypeScript in sync with Rust DTOs.
- IPC boundary scan must allow raw `invoke` and Tauri plugin imports only under `src/shared/api`.

### Previous Story Intelligence

- Story 1.2 completed the real Tauri dialog open flow and `.orchlet/workspace.json` metadata creation/read/update.
- Story 1.2 established the current workspace metadata shape and the rule that absolute paths must not be stored in workspace-local metadata.
- Story 1.2 added `tauri-plugin-dialog` and the narrow `dialog:allow-open` permission. Do not add `tauri-plugin-opener` in Story 1.3.
- Story 1.2 created the Rust module boundaries now expected for workspace work: `app/workspace`, `domain/workspace`, `infrastructure/filesystem`, and `infrastructure/persistence/json_store`.
- Story 1.2 code review found that user-visible errors must include both specific invalid-field context and impact scope. Keep that bar for registry errors.
- Story 1.2 verification baseline to preserve: `pnpm test`, `pnpm build`, `cargo fmt --check`, `cargo check`, `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`, IPC boundary scan, and `pnpm tauri build`.

### Project Structure Notes

Expected touched files/modules:

- `src/App.test.tsx` or new page-specific tests.
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`.
- `src/shared/api/workspace-api.ts`.
- `src/contracts/generated/*`.
- `src-tauri/src/contracts/workspace.rs`.
- `src-tauri/src/gateway/workspace_commands.rs`.
- `src-tauri/src/app/workspace/mod.rs`.
- `src-tauri/src/domain/workspace/mod.rs`.
- `src-tauri/src/infrastructure/persistence/json_store/workspace_metadata_store.rs`.
- New `src-tauri/src/infrastructure/persistence/json_store/workspace_registry_store.rs`.
- Optional narrow runtime/window adapter modules only if they contain working code for duplicate-open focus behavior.

Do not modify planning artifacts or unrelated generated `target`/`dist` outputs.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 1.3 acceptance criteria and Epic 1 scope.
- `_bmad-output/planning-artifacts/prd.md` - FR4, FR5, FR6; NFR8, NFR13, NFR14, NFR19, NFR20, NFR26, NFR31, NFR35, NFR36, NFR37.
- `_bmad-output/planning-artifacts/architecture.md` - app-data storage layout, registry ownership, typed IPC, capabilities by window mode, naming conventions, module boundaries and workspace data flow.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - recent workspace row behavior, search, conflict modal copy/actions, empty/loading/error states.
- `_bmad-output/implementation-artifacts/1-2-open-directory-create-workspace-metadata.md` - existing workspace metadata flow, file list, review fix and verification baseline.
- Tauri docs.rs `tauri` 2.11.1 crate docs - Path APIs and `AppHandle`/manager APIs.
- Tauri docs.rs `PathResolver::app_data_dir` - app data directory resolution.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm test` - 1 test file, 8 tests passed.
- `pnpm build` - TypeScript and Vite production build passed.
- `cargo fmt --check` in `src-tauri` - passed.
- `cargo check` in `src-tauri` - passed.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri` - 25 tests passed, including regenerated TypeScript bindings.
- IPC boundary scan - only `src/shared/api/client.ts` imports `@tauri-apps/api/core`; only `src/shared/api/workspace-api.ts` imports `@tauri-apps/plugin-dialog`.
- `pnpm tauri build` - passed and produced `src-tauri/target/release/bundle/macos/orchlet.app` and `src-tauri/target/release/bundle/dmg/orchlet_0.1.0_aarch64.dmg`; build emitted the existing warning that bundle identifier `com.orchlet.app` ends with `.app`.
- Code review patch validation: `pnpm test`, `pnpm build`, and `pnpm tauri build` passed after wiring recent-list query failures into toast feedback.

### Completion Notes List

- Story context engine analysis completed on 2026-05-11.
- Story created after Story 1.2 reached `done`, including its code-review finding about user-visible error specificity.
- Added typed workspace open outcomes for `opened`, `conflict`, and `focusedExisting`, plus recent workspace and registry conflict DTOs.
- Added Rust app-data `workspace-registry.json` persistence with schema version 1, atomic writes, validation, recent sorting, and recoverable registry errors.
- Refactored workspace opening so copied-path project-id conflicts return a structured conflict without mutating selected metadata or registry before user choice.
- Implemented move semantics by preserving project id and updating registry path; implemented copy semantics by rewriting selected workspace metadata with a new ULID project id.
- Added minimal in-process duplicate-open tracking and best-effort main-window surface/focus behavior without creating extra main windows.
- Updated Workspace Selection UI with recent list, local search, recent open action, conflict modal, move/copy/cancel handling, and focused-existing feedback.
- Kept Story 1.4/1.5/1.6/1.7 scope out: no read-only fallback, opener/file-manager entry, full multi-window context sync, SQLite, storage manifest, schema report, or old `.golutra` reads were added.
- Manual desktop window-focus smoke was not exercised; verification used Rust runtime-state tests, mocked frontend tests, IPC boundary scan, and successful Tauri production build.
- Code review found and resolved one UI error-handling patch: registry/recent-list load failures now produce a recoverable toast instead of silently showing an empty recent list.

### File List

- `_bmad-output/implementation-artifacts/1-3-manage-recent-workspaces-registry-conflicts.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/workspace.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/workspace-api.ts`
- `src-tauri/src/app/workspace/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/workspace.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_metadata_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_registry_store.rs`
- `src-tauri/src/lib.rs`

## Change Log

- 2026-05-11: Created Story 1.3 context and marked ready for development.
- 2026-05-11: Implemented recent workspaces, app-data registry persistence, registry conflict move/copy flow, duplicate-open focus outcome, tests and production build verification; marked ready for review.
- 2026-05-11: Completed code review patch for recent-list error visibility and marked Story 1.3 done.
