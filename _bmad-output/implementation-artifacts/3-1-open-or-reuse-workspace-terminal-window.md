# Story 3.1: 打开或复用工作区终端窗口

Status: done

<!-- Note: Created from sprint backlog to continue Epic 3 execution. -->

## Story

As a developer,
I want to open or reuse a terminal window for the current workspace,
so that command execution stays attached to the project context.

## Acceptance Criteria

1. Given a workspace is open, when the user opens terminal, then the app opens or focuses the workspace terminal window instead of creating unnecessary duplicates.
2. Given a member with a terminal-capable runtime is visible, when the user chooses open member terminal from the member entry, then the app opens or focuses that member's terminal session in the workspace terminal window.
3. Given the terminal window opens, when the first terminal session is requested, then Rust creates the PTY session and xterm.js renders it without owning session lifecycle.
4. Given the terminal backend emits data, when the renderer receives it, then terminal output bypasses React state and is written through a renderer adapter with batching.

## Tasks / Subtasks

- [x] Task 1: Create typed terminal contracts and IPC facade (AC: 1-3)
  - [x] Add Rust `terminal` DTOs for open request/result, session profile, session status and stream event payloads using camelCase exports.
  - [x] Add `src/shared/api/terminal-api.ts` and export it through `src/shared/api/index.ts`; frontend feature code must not call raw Tauri APIs outside `src/shared/api`.
  - [x] Register terminal commands/events in Tauri gateway and generated TypeScript bindings.
  - [x] Add contract fixtures and validators for the new terminal open command and stream event shape.

- [x] Task 2: Implement terminal window open/reuse flow (AC: 1)
  - [x] Reuse the existing `window_open_mode`/window context patterns or a terminal-specific backend wrapper to open/focus the single `terminal` window label.
  - [x] Require an active workspace for terminal open; return a structured recoverable error when no workspace is active.
  - [x] Preserve theme/language/workspace context sync across main, workspace-selection and terminal windows.
  - [x] Add tests proving repeated opens focus/reuse the terminal window instead of creating duplicates.

- [x] Task 3: Implement member terminal targeting and validation (AC: 2)
  - [x] Add an "open member terminal" action to visible member entries with terminal-capable runtime only.
  - [x] Validate member id against the workspace member store and reject missing/non-terminal-capable members with stable recoverable error codes.
  - [x] Open/focus the terminal window and create/reuse a member-scoped terminal session keyed by workspace id and member id.
  - [x] Keep chat dispatch, task routing, DND, notifications and outbox out of scope.

- [x] Task 4: Add minimal Rust-owned PTY session runtime (AC: 3)
  - [x] Add `portable-pty` as the Rust PTY backend and keep session lifecycle in Rust app/domain state.
  - [x] Create the first PTY session on terminal open using the workspace root as the working directory and the member runtime command or a safe default shell.
  - [x] Track session id, workspace id, optional member id, status, title, created/updated timestamps and monotonic output sequence.
  - [x] Do not persist terminal sessions, tabs, panes, snapshots or search state in this story; those belong to Stories 3.2-3.6.

- [x] Task 5: Render terminal output through an adapter, not React state (AC: 3-4)
  - [x] Add `@xterm/xterm` and render the terminal page with a full-width terminal surface instead of a placeholder.
  - [x] Create a renderer adapter that owns the xterm instance and batches stream writes with `requestAnimationFrame` or equivalent.
  - [x] Subscribe to terminal output events via `src/shared/api`; do not append terminal output chunks to React arrays or component state.
  - [x] Provide a browser/test fallback renderer so Vitest can verify batching without needing a real WebView terminal.

- [x] Task 6: Extend tests and fixtures honestly (AC: 1-4)
  - [x] Add Rust unit tests for terminal open requires active workspace, window reuse result, member runtime validation and session reuse.
  - [x] Add frontend tests for opening the terminal window from workspace controls, opening a member terminal, terminal page rendering and renderer batching.
  - [x] Update contract fixtures and smoke/schema documentation only for implemented terminal open/session runtime; do not claim tabs, panes, search, snapshots or dispatch.

- [x] Task 7: Verification and completion evidence (AC: 1-4)
  - [x] Run `pnpm test:frontend`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=bindings cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 3.1 owns opening/reusing the workspace terminal window and the first minimal Rust-owned PTY session path. Do not implement terminal tabs, pane layouts, find/search, snapshots, persisted session recovery, chat-to-terminal dispatch, notifications, DND, busy queues, terminal output-to-chat, CLI settings UI or roadmap/task behavior.

### Current Implementation State

- `WindowMode::Terminal` already exists in `src-tauri/src/contracts/workspace.rs`.
- `window_open_mode` in `src-tauri/src/gateway/workspace_commands.rs` already opens/focuses a single window label for each mode, including `terminal`.
- `WindowContextRuntimeState` stores registered windows, active workspace and preferences in memory and emits `window-context-changed`.
- `App.tsx` currently renders `ModePlaceholder` for terminal and notification-preview windows.
- `WorkspaceSelectionPage.tsx` already receives `onOpenWindowMode`, exposes a window mode control when window context is available, and renders member action menus.
- Member profiles already store runtime metadata and permissions. Runtime kinds are `none`, `builtInAiCli`, `customCli` and `shell`; only non-`none` runtime kinds with a command should be considered terminal-capable in this story.
- Terminal stream fixtures already exist under `fixtures/terminal-streams`; they validate sequence/snapshot fixture honesty but no real terminal IPC exists yet.

### Technical Requirements

- Use ULID strings and millisecond timestamps consistently with prior workspace/chat/member stories.
- Add `src-tauri/src/contracts/terminal.rs`, `src-tauri/src/gateway/terminal_commands.rs`, `src-tauri/src/app/terminal`, `src-tauri/src/domain/terminal` and `src-tauri/src/infrastructure/terminal` only for implemented terminal open/session behavior.
- Use stable recoverable errors for no active workspace, invalid member id, member not found, member runtime not terminal-capable, terminal window open failure and PTY launch failure.
- Rust must own terminal session lifecycle. Frontend can request open/attach and render output, but must not become the source of truth for session status or scrollback.
- Terminal output events must include at least `schemaVersion`, `terminalSessionId`, `workspaceId`, optional `memberId`, `seq`, `chunk`, `kind`, and `emittedAtMs`.
- Use `portable-pty = "0.9.0"` for Rust PTY launch and `@xterm/xterm = "6.0.0"` for the frontend renderer. These versions were checked on 2026-05-12 with `cargo search portable-pty --limit 1` and `pnpm view @xterm/xterm version`.
- Terminal output must bypass React state. The renderer adapter should buffer chunks outside state and flush to xterm in batches.
- Browser/non-Tauri tests may use a fallback renderer and mocked terminal API; they must not require a real PTY.

### Architecture Compliance

- Rust command handlers remain under `src-tauri/src/gateway`; use cases under `src-tauri/src/app`; validation/domain rules under `src-tauri/src/domain`; PTY adapters under `src-tauri/src/infrastructure/terminal`.
- Frontend terminal feature code calls only `src/shared/api/terminal-api.ts`; raw `invoke`, `listen`, `Channel`, `getCurrentWebviewWindow` stay limited to shared API modules/tests.
- Generated contract files live in `src/contracts/generated` and `src-tauri/bindings`; regenerate with `ts-rs`.
- Tauri capabilities stay split by window mode. Terminal window should keep limited capabilities and must not receive dialog/opener permissions unless a story explicitly requires it.
- Event topics use kebab-case with a domain prefix; use `terminal-output` for terminal stream events.
- No SQLite terminal session table in this story. If later stories persist terminal sessions/snapshots, they must add migrations, storage manifest entries and schema fixtures then.

### UX Requirements

- Workspace controls should expose a direct terminal open action when a workspace is active.
- Member action menus should expose terminal opening only for terminal-capable members.
- Terminal page should replace the placeholder with a quiet operational terminal workspace: header with workspace/member/session status and a large terminal surface.
- Terminal surface must have stable dimensions and no decorative card-heavy or marketing layout.
- Terminal output text must not be stored in React state and must not overlap header controls.
- Existing chat, member, contact, conversation and data integrity interactions from Epic 2 must not regress.

### Previous Story Intelligence

- Story 2.7 added composition helpers in `WorkspaceSelectionPage.tsx`; do not regress mention, emoji, quick prompt, attachment chip or send behavior.
- Story 2.6 added conversation management controls in the same page; terminal actions must not crowd or disable those controls.
- Story 2.5 message pagination/read-position tests are sensitive to message object shape; terminal work should not alter chat DTOs.
- Current commit baseline after Story 2.7: `28f86f6 Complete story 2.7 composer helpers`.

### Relevant UPDATE Files To Read Before Coding

- `src-tauri/src/contracts/workspace.rs`
- `src-tauri/src/contracts/member.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/app/window_context/mod.rs`
- `src-tauri/src/app/members/mod.rs`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/infrastructure/mod.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/terminal.json`
- `src/shared/api/window-context-api.ts`
- `src/shared/api/index.ts`
- `src/App.tsx`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `src/shared/api/window-context-api.test.ts`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `tests/contract/contract-fixture-types.ts`
- `src-tauri/tests/contract_fixtures.rs`
- `scripts/validate-contract-fixtures.mjs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 3 and Story 3.1 acceptance criteria.
- `_bmad-output/planning-artifacts/prd.md` - FR17, FR33, FR40 and terminal non-functional requirements.
- `_bmad-output/planning-artifacts/architecture.md` - terminal architecture, Rust-owned runtime, typed IPC, window modes, stream event naming and terminal hot-path constraints.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Terminal Window layout and member terminal entry behavior.
- `_bmad-output/implementation-artifacts/2-7-mentions-emoji-attachments-quick-prompts.md` - latest WorkspaceSelectionPage changes and verification baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: `pnpm test:frontend` passed (4 files, 29 tests).
- 2026-05-12: `pnpm test:contracts` passed and validated 20 contract fixture groups.
- 2026-05-12: `pnpm test:data-integrity` passed.
- 2026-05-12: `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` passed for `src-tauri`.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed and regenerated frontend terminal bindings.
- 2026-05-12: `TS_RS_EXPORT_DIR=bindings cargo test` passed and regenerated Tauri-side terminal bindings.
- 2026-05-12: `pnpm build` passed; Vite reported the existing large chunk size warning.
- 2026-05-12: `pnpm test` passed.
- 2026-05-12: IPC boundary scan passed; raw Tauri calls are limited to `src/shared/api` and tests, with Rust `Channel` enum names as expected false positives.
- 2026-05-12: `pnpm tauri build` passed; macOS app and dmg bundles were produced.

### Completion Notes List

- Implemented typed terminal IPC with `terminal_open`, terminal session profiles, stream event payloads, contract fixtures, and generated TypeScript bindings.
- Added Rust-owned minimal PTY lifecycle with `portable-pty`, workspace/member-scoped session reuse, active workspace requirement, member runtime validation, and monotonic terminal output event sequencing.
- Replaced the terminal placeholder with an xterm-backed terminal page whose renderer adapter batches writes outside React state.
- Added workspace and member terminal entry points through the shared terminal API facade while keeping chat dispatch, tabs, panes, search, snapshots, notifications, and output-to-chat out of scope.

### File List

- `_bmad-output/implementation-artifacts/3-1-open-or-reuse-workspace-terminal-window.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/terminal/terminal-open.request.json`
- `fixtures/contracts/terminal/terminal-open.result.json`
- `fixtures/contracts/terminal/terminal-open.error.json`
- `fixtures/contracts/terminal/terminal-output.event.json`
- `package.json`
- `pnpm-lock.yaml`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/bindings/terminal.ts`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/domain/terminal/mod.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/infrastructure/mod.rs`
- `src-tauri/src/infrastructure/terminal/mod.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/terminal.ts`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/index.ts`
- `src/pages/terminal/terminal-renderer.ts`
- `src/pages/terminal/terminal-renderer.test.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/index.ts`
- `src/shared/api/terminal-api.ts`
- `src/test/setup.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 3.1 context for terminal window open/reuse implementation.
- 2026-05-12: Implemented Story 3.1 terminal window/session open and reuse flow.
