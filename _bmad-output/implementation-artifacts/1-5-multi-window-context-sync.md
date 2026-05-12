# Story 1.5: 多窗口模式与上下文同步

Status: done

## Story

As a desktop user,
I want main, workspace-selection, terminal and notification-preview windows to stay in the same context,
so that moving between windows does not lose my workspace, theme or language.

## Acceptance Criteria

1. Given the user opens multiple orchlet window modes, when workspace context changes, then main, terminal, workspace-selection and notification-preview windows receive the updated workspace context.
2. Given the user changes theme or language, when any supported window is open, then all windows apply the same theme and language without requiring restart.
3. Given a window mode requests a Tauri capability, when capabilities are evaluated, then only the minimum permissions required for that window mode are available.

## Tasks / Subtasks

- [x] Task 1: Add typed window-context contracts and event names (AC: 1-3)
  - [x] Reuse existing `WindowMode` values: `main`, `workspaceSelection`, `terminal`, `notificationPreview`; do not invent duplicate mode strings.
  - [x] Add DTOs in `src-tauri/src/contracts/workspace.rs` or a new focused contracts module for `WindowContextSnapshot`, `WorkspaceContextSnapshot`, `AppPreferencesSnapshot`, `RegisterWindowRequest/Result`, and `UpdateAppPreferencesRequest/Result`.
  - [x] Include `schemaVersion`, `workspace` or `activeWorkspace` data, `theme`, `language`, `updatedAtMs`, and `sourceWindowLabel` where useful for idempotent cross-window updates.
  - [x] Define event topic constants in the typed frontend API boundary, expected names like `window-context-changed` and `app-preferences-changed`; use kebab-case domain-prefixed event topics.
  - [x] Regenerate TypeScript bindings with `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`.
  - [x] Keep raw Tauri `invoke`, `listen`, `emit`, `getCurrentWebview`, or window APIs isolated to `src/shared/api`.

- [x] Task 2: Add Rust runtime context state and event emission boundary (AC: 1-2)
  - [x] Add a Rust app-level runtime state, likely `WindowContextRuntimeState`, separate from or carefully composed with `WorkspaceRuntimeState`; do not turn frontend Zustand into authoritative cross-window state.
  - [x] Store the current workspace context from successful `workspace_open` results, including Story 1.4 `accessMode` and `fallbackState`.
  - [x] Store runtime theme/language preferences for this story; do not implement full settings persistence from Story 7.3.
  - [x] Add typed commands such as `window_context_get`, `window_context_register`, and `app_preferences_update`.
  - [x] Emit context/preferences updates from Rust through a single gateway/app boundary after successful state transitions; do not emit on conflict, cancelled directory selection, or failed workspace open.
  - [x] Make repeated events idempotent by snapshot version/timestamp and avoid event loops when the source window receives its own update.

- [x] Task 3: Create or surface supported window modes without implementing their future domains (AC: 1, 3)
  - [x] Add a typed frontend facade method to open or focus a supported window mode if needed, e.g. `workspaceApi.openWindowMode(mode)` or a separate `windowContextApi`.
  - [x] If Tauri window creation is implemented, use deterministic labels for modes: `main`, `workspace-selection`, `terminal`, `notification-preview`.
  - [x] The same React app may render mode-specific placeholder surfaces, but placeholders must be truthful and minimal; do not fake terminal sessions, chats, unread data, tray state, or notification lists.
  - [x] Each mode must show the synchronized workspace identity and current theme/language state so cross-window sync is testable.
  - [x] Preserve existing Workspace Selection first-screen/recent/conflict/read-only/file-manager behavior.

- [x] Task 4: Apply theme and language updates across windows (AC: 2)
  - [x] Add a minimal UI control or testable user action for theme/language changes; keep it small and avoid a full settings page.
  - [x] Supported theme values should be explicit, e.g. `system | light | dark`; supported language values should be explicit, e.g. `zh-CN | en-US`.
  - [x] Apply theme/language to each active window without restart, at minimum through `document.documentElement.dataset.theme` and `document.documentElement.lang`, plus visible state labels for verification.
  - [x] Do not introduce a full translation catalog, profile settings persistence, notification preferences, shortcuts, or Story 7 settings scope.
  - [x] Use Zustand only for per-window ephemeral UI snapshot state fed by typed API/events.

- [x] Task 5: Split Tauri capabilities by window mode with minimum permissions (AC: 3)
  - [x] Replace the single broad `src-tauri/capabilities/default.json` shape with window-specific capability files or equivalent least-permission configuration.
  - [x] Ensure workspace selection/opening has only the permissions it needs, currently `dialog:allow-open` and path opener only where the file-manager action is exposed.
  - [x] Ensure terminal and notification-preview windows do not inherit dialog or opener permissions unless directly required by this story.
  - [x] Keep `tauri_plugin_opener::Builder::new().open_js_links_on_click(false).build()`; do not add URL/default-url/shell permissions.
  - [x] Document any Tauri limitation discovered during build if custom commands cannot be split as intended yet.

- [x] Task 6: Keep Story 1.5 inside its Epic 1 boundary (AC: 1-3)
  - [x] Do not implement terminal PTY/session lifecycle, tabs, panes, xterm rendering or terminal attach; Epic 3 owns that.
  - [x] Do not implement chat, members, conversations, unread aggregation, tray, or notification business data; Epics 2, 4 and 5 own those.
  - [x] Do not add SQLite schema, storage manifest, schema validation report, diagnostics database or release smoke matrix; Stories 1.6 and 1.7 own those foundations.
  - [x] Do not read old `.golutra` or legacy app data.
  - [x] Do not add broad shell/window/plugin permissions to make tests pass.

- [x] Task 7: Verification and completion evidence (AC: 1-3)
  - [x] Add Rust tests for context snapshot update, repeated/idempotent update behavior, no event/state update on conflict, preference update state, and command error behavior where practical.
  - [x] Add/update frontend tests for window context subscription, workspace context rendering, theme/language sync rendering, mode-specific placeholder honesty, existing first screen, recent list/search/conflict/read-only/file-manager regressions.
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `cargo fmt --check` and `cargo check` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.
  - [x] Record any limitation around manual multi-window OS smoke; do not claim manual cross-window smoke passed unless multiple real Tauri windows were exercised.

### Review Findings

- [x] [Review][Patch] 全局上下文事件会覆盖接收窗口自己的 `currentWindow` [src/shared/api/window-context-api.ts:96] — fixed by preserving the local window identity at the typed frontend API boundary before handing broadcast snapshots to React state.
- [x] [Review][Patch] 窗口上下文订阅异步完成晚于组件卸载时可能泄漏订阅或卸载后更新状态 [src/App.tsx:37] — fixed by guarding the subscription callback and disposing late subscriptions.

## Dev Notes

### Scope Boundary

Story 1.5 adds the synchronization substrate for workspace context and runtime theme/language across window modes. It should produce truthful minimal surfaces for `main`, `workspace-selection`, `terminal`, and `notification-preview`, but it must not implement the future terminal, chat, unread, tray, or settings domains.

### Current Implementation State

- The app currently has a single Tauri window from `tauri.conf.json`; `workspace_selection_status` returns `WindowMode::WorkspaceSelection` while the actual label is `main`.
- `WindowMode` already exists in Rust contracts and generated TypeScript. Reuse it.
- `OpenedWorkspace` now includes Story 1.4 `accessMode` and `fallbackState`; any context snapshot must preserve those fields.
- `WorkspaceRuntimeState` tracks open project ids to avoid duplicate main windows. Do not remove this behavior while adding context sync.
- Raw Tauri frontend access is currently limited to `src/shared/api/client.ts` and `src/shared/api/workspace-api.ts`.
- `src-tauri/capabilities/default.json` currently targets only `main` and grants `core:default`, `dialog:allow-open`, and `opener:allow-open-path`.
- `tauri_plugin_opener` is registered with `open_js_links_on_click(false)`; keep that narrower behavior.

### Technical Guidance

- Prefer a small Rust-owned runtime context state, with frontend windows subscribing to typed events and fetching the current snapshot on mount/register.
- Event payloads should be snapshots, not partial patches, so a newly opened window can become consistent from one command result.
- Use TanStack Query for initial async snapshot fetch and Zustand only as a local in-window mirror of the latest event snapshot.
- Avoid browser globals or localStorage as authoritative sync. Browser storage may only be a non-authoritative UI cache if needed.
- If window creation is added, keep labels deterministic and map labels to `WindowMode` in one place.
- For capabilities, Tauri capabilities are grouped by window/webview labels and permissions; a window matching multiple capabilities receives the merged permission set, so avoid broad wildcard capabilities.
- Tauri events are appropriate for lifecycle/state notifications; keep request/response operations as commands.

### UX Requirements

- The user should be able to see the active workspace identity and current theme/language in each supported window mode.
- Theme/language changes should be visible immediately in all open modes without claiming full localization.
- Placeholder surfaces for terminal/notification modes should be compact and honest; they may show synchronized context but must not mimic unavailable business data.
- Keep first-screen workspace selection content and Story 1.4 read-only/file-manager UI intact.
- Any error feedback must state what happened, impact scope and next action.

### Previous Story Intelligence

- Story 1.4 added `workspace-fallbacks.json`, read-only `accessMode`, `fallbackState`, and file-manager opener flow. Preserve these fields when broadcasting workspace context.
- Story 1.4 code review fixed a recovery bug: if a missing-metadata workspace first opens read-only and later becomes writable, the fallback project id must be reused when materializing `.orchlet/workspace.json`.
- Story 1.4 code review also tightened opener registration to disable automatic URL link opening; do not regress this by using `tauri_plugin_opener::init()`.
- Story 1.3 and 1.4 established the verification baseline: `pnpm test`, `pnpm build`, `cargo fmt --check`, `cargo check`, `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`, IPC boundary scan, and `pnpm tauri build`.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 1.5 ACs and Epic 1 scope.
- `_bmad-output/planning-artifacts/prd.md` - FR8, FR9; NFR8, NFR19, NFR20, NFR21, NFR22, NFR26, NFR29, NFR30, NFR31.
- `_bmad-output/planning-artifacts/architecture.md` - typed IPC/events, window mode strategy, capability split, event payload conventions and frontend state ownership.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - workspace selection preservation, read-only banner, notification preview layout boundaries and error feedback format.
- `_bmad-output/implementation-artifacts/1-4-read-only-workspace-fallback-file-manager.md` - read-only/file-manager implementation baseline and review learnings.
- Tauri Capability reference: https://v2.tauri.app/reference/acl/capability/ - capabilities target windows/webviews and group permissions.
- Tauri Core Permissions reference: https://v2.tauri.app/reference/acl/core-permissions/ - `core:default` contents and window permission implications.
- Tauri Event API reference: https://v2.tauri.app/reference/javascript/api/namespaceevent/ - event listen/emit semantics for frontend/backend notifications.
- Tauri Calling Rust guide: https://v2.tauri.app/develop/calling-rust/ - command/event boundary guidance.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-11: `pnpm test` passed (13 tests).
- 2026-05-11: `pnpm build` passed.
- 2026-05-11: `cargo fmt --check` passed in `src-tauri`.
- 2026-05-11: `cargo check` passed in `src-tauri`.
- 2026-05-11: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed (45 tests).
- 2026-05-11: IPC boundary scan only found Tauri imports/listeners in `src/shared/api/client.ts`, `src/shared/api/workspace-api.ts`, and `src/shared/api/window-context-api.ts`.
- 2026-05-11: `pnpm tauri build` passed and produced macOS app/dmg bundles; existing `com.orchlet.app` identifier warning remains.
- 2026-05-11: Code review patch validation `pnpm test` passed (14 tests across 2 files).
- 2026-05-11: Code review patch validation `pnpm build` passed.
- 2026-05-11: Code review patch validation `cargo fmt --check`, `cargo check`, and `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed in `src-tauri` (45 tests).
- 2026-05-11: Code review patch IPC scan found Tauri access only under `src/shared/api` boundary files, including the new `window-context-api.test.ts` boundary test mock.
- 2026-05-11: Code review patch validation `pnpm tauri build` passed and produced macOS app/dmg bundles; existing `com.orchlet.app` identifier warning remains.

### Completion Notes List

- Story context engine analysis completed on 2026-05-11.
- Added typed window-context/preference/window-mode contracts and regenerated TS bindings.
- Added Rust-owned `WindowContextRuntimeState` with snapshot, registration, active workspace and idempotent preference update behavior.
- Broadcast workspace context after successful workspace opens and preference/context updates through typed Tauri events.
- Added typed frontend `windowContextApi`, current-window registration, event subscription, browser fallback and document theme/language application.
- Fixed broadcast event handling so global context snapshots update workspace/preferences without changing the receiving window's local mode.
- Guarded the App window-context subscription lifecycle against late async subscription completion after unmount.
- Added minimal synchronized context controls and truthful terminal/notification placeholder surfaces without implementing terminal/chat/notification domains.
- Split capability files for `main`, `workspace-selection`, `terminal`, and `notification-preview`; terminal and notification placeholder windows only receive `core:default`.
- Manual real multi-window OS smoke was not exercised; verification used Rust state tests, frontend mocked/browser-fallback tests, IPC boundary scan and successful Tauri packaging.

### File List

- `_bmad-output/implementation-artifacts/1-5-multi-window-context-sync.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/workspace.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/index.ts`
- `src/shared/api/window-context-api.test.ts`
- `src/shared/api/window-context-api.ts`
- `src-tauri/capabilities/notification-preview.json`
- `src-tauri/capabilities/terminal.json`
- `src-tauri/capabilities/workspace-selection.json`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/app/window_context/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/workspace.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/lib.rs`

## Change Log

- 2026-05-11: Created Story 1.5 context and marked ready for development.
- 2026-05-11: Implemented multi-window context sync substrate, runtime theme/language sync, mode placeholders, capability split, tests and validation evidence; marked ready for review.
- 2026-05-11: Completed code review, fixed window identity preservation for broadcast context events, reran validation, and marked story done.
