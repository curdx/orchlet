# Story 3.2: 终端 session 生命周期 IPC

Status: done

<!-- Note: Created from sprint backlog after Story 3.1 completion to continue Epic 3 execution. -->

## Story

As a terminal user,
I want terminal sessions to support attach, input, resize and close,
so that terminal behavior matches desktop terminal expectations.

## Acceptance Criteria

1. Given a terminal session exists, when the frontend attaches to it, then the backend returns session metadata and starts streaming output events with schema version, session id, sequence, chunk kind and emitted timestamp.
2. Given the user types in the terminal, when input is sent, then Rust writes the input to the PTY for the correct session.
3. Given the terminal viewport changes size or the user closes the session, when resize or close is requested, then Rust resizes or closes the PTY and emits an updated session state.

## Tasks / Subtasks

- [x] Task 1: Extend typed terminal lifecycle contracts and fixtures (AC: 1-3)
  - [x] Add Rust DTOs for terminal attach, input, resize, close and session status/state event payloads using camelCase exports.
  - [x] Include stable recoverable error codes for missing active workspace, invalid session id, session not found, input write failure, resize failure and close failure.
  - [x] Add contract fixtures and TypeScript validators for attach/input/resize/close commands and terminal status event shape.
  - [x] Regenerate `src/contracts/generated/terminal.ts` and `src-tauri/bindings/terminal.ts`.

- [x] Task 2: Add Rust-owned session attach and status state flow (AC: 1, 3)
  - [x] Add session lookup by terminal session id inside `TerminalRuntimeState`; do not identify lifecycle operations only by workspace/member key.
  - [x] Implement attach so frontend can attach to an existing active session or explicit session id and receive current `TerminalSessionProfile`.
  - [x] Emit `terminal-status-change` or equivalent typed terminal status event when a session starts, is attached, is resized, or is closed.
  - [x] Preserve output event schema from Story 3.1 and keep terminal output out of persisted storage.

- [x] Task 3: Implement PTY input, resize and close adapters (AC: 2-3)
  - [x] Extend the terminal session handle abstraction so Rust can write input to the PTY writer, resize the PTY master and close/kill the PTY.
  - [x] Implement `terminal_input` to write user input bytes to the correct PTY session and return updated metadata.
  - [x] Implement `terminal_resize` to resize the correct PTY with rows/cols and emit updated session state.
  - [x] Implement `terminal_close` to close/kill the PTY, update status to `exited`, remove or mark the session consistently, and emit updated session state.

- [x] Task 4: Wire lifecycle IPC through gateway and frontend API facade (AC: 1-3)
  - [x] Register terminal lifecycle commands in Tauri gateway and `lib.rs`.
  - [x] Extend `src/shared/api/terminal-api.ts` with attach/input/resize/close methods and typed status event subscription.
  - [x] Ensure feature code still calls only `src/shared/api`; raw Tauri `invoke`/`listen` must remain limited to shared API modules/tests.
  - [x] Keep Tauri terminal window capabilities limited; do not add unrelated dialog/opener permissions.

- [x] Task 5: Connect xterm input and resize without React owning terminal output (AC: 1-3)
  - [x] Extend the xterm renderer adapter to forward `onData` input to `terminal_input` without storing typed input/output chunks in React state.
  - [x] Add a resize path from the terminal surface to `terminal_resize` using stable rows/cols calculations or a testable adapter abstraction.
  - [x] Attach terminal page startup through `terminal_attach` rather than reopening or creating duplicate sessions.
  - [x] Add a close action that calls `terminal_close`, updates visible session status and avoids implementing tabs/panes/recovery in this story.

- [x] Task 6: Add focused lifecycle tests (AC: 1-3)
  - [x] Add Rust tests for attach by active/explicit session, invalid session id, write input dispatch, resize dispatch, close status update and status event emission.
  - [x] Add frontend tests for attach-on-load, xterm input forwarding, resize forwarding, close action and status event handling.
  - [x] Extend contract fixture tests for lifecycle DTOs and event payloads.
  - [x] Keep Story 3.1 open/reuse, member terminal and renderer batching tests green.

- [x] Task 7: Verification and completion evidence (AC: 1-3)
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

Story 3.2 owns terminal session attach, input, resize, close and status lifecycle IPC. Do not implement terminal tabs, pane layouts, tab search/sort, persisted snapshots, recovery, chat-to-terminal dispatch, notifications, DND, busy queues, terminal output-to-chat, CLI settings UI or roadmap/task behavior.

### Current Implementation State

- Story 3.1 is complete at commit `b20e04e Complete story 3.1 terminal window`.
- `src-tauri/src/contracts/terminal.rs` currently defines `TerminalOpenRequest`, `TerminalOpenResult`, `TerminalSessionProfile`, `TerminalSessionStatus` and `TerminalOutputEventPayload`.
- `src-tauri/src/gateway/terminal_commands.rs` currently registers only `terminal_open`.
- `TerminalRuntimeState` stores sessions by workspace id and optional member id, creates sessions with ULID ids, emits `terminal-output`, and keeps session lifecycle in Rust memory.
- `TerminalSessionHandle` currently has no operations. `PtyTerminalSession` currently keeps the PTY master, child process and reader thread, but does not keep a writer or expose resize/close methods.
- `src/shared/api/terminal-api.ts` currently exposes `openTerminal` and `subscribeOutput`.
- `TerminalPage` currently calls `openTerminal({ attachCurrent: true })` on mount and subscribes to output; 3.2 should change this to attach without creating duplicate sessions.
- `XtermRendererAdapter` currently owns the xterm instance and batches writes; it does not yet forward user input or expose resize hooks.

### Technical Requirements

- Use ULID strings and millisecond timestamps consistently with prior terminal/session contracts.
- Add lifecycle commands under `src-tauri/src/gateway/terminal_commands.rs`; keep use cases in `src-tauri/src/app/terminal` and PTY operations in `src-tauri/src/infrastructure/terminal`.
- Status event payloads must include at least `schemaVersion`, `terminalSessionId`, `workspaceId`, optional `memberId`, `status`, `title`, and `emittedAtMs`.
- Preserve `terminal-output` payload fields from Story 3.1: `schemaVersion`, `terminalSessionId`, `workspaceId`, optional `memberId`, `seq`, `chunk`, `kind`, `emittedAtMs`.
- Input requests should carry `terminalSessionId` and `input`; resize requests should carry `terminalSessionId`, `cols`, and `rows`; close requests should carry `terminalSessionId`.
- Validate session ids as ULID strings before lookup.
- Closed sessions should no longer accept input or resize; return stable recoverable errors for invalid lifecycle operations.
- No SQLite terminal session table in this story. Lifecycle state remains in Rust memory only.
- Frontend terminal output must continue to bypass React state; React may store metadata/status only.

### Architecture Compliance

- IPC JSON fields must be camelCase through serde/`ts-rs`.
- Event topics use kebab-case with a domain prefix; use `terminal-status-change` for session state events unless implementation discovers an existing stronger local convention.
- Frontend feature/page code must call `src/shared/api/terminal-api.ts`; raw `invoke`, `listen`, `Channel`, `getCurrentWebviewWindow` remain limited to shared API modules/tests.
- Generated contract files live in `src/contracts/generated` and `src-tauri/bindings`; regenerate with `ts-rs`, do not hand-edit generated terminal bindings except the repository's generated `index.ts` export aggregator if needed.
- Tauri capabilities stay split by window mode and terminal should not receive unrelated permissions.

### UX Requirements

- Terminal page remains a quiet operational surface with a compact header and large terminal surface.
- Close action should be visible but restrained; it should update the visible session status instead of creating tabs or recovery UI.
- Text and controls must not overlap at desktop or mobile widths.
- Loading/connecting/closed states must not resize the terminal surface unexpectedly.

### Previous Story Intelligence

- Story 3.1 added `portable-pty = "0.9.0"` and `@xterm/xterm = "6.0.0"`; reuse these exact dependencies.
- Story 3.1 established `terminal-output` fixture coverage and renderer batching tests; do not regress those.
- Story 3.1 `openTerminal` creates or reuses sessions by workspace/member key; Story 3.2 should add session-id lifecycle operations rather than replacing that behavior.
- Existing Epic 2 chat/member tests are sensitive to `WorkspaceSelectionPage.tsx`; terminal lifecycle changes should not alter chat DTOs or member runtime semantics.

### Relevant UPDATE Files To Read Before Coding

- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/domain/terminal/mod.rs`
- `src-tauri/src/infrastructure/terminal/mod.rs`
- `src-tauri/src/lib.rs`
- `src/shared/api/terminal-api.ts`
- `src/shared/api/index.ts`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/terminal-renderer.ts`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/terminal-renderer.test.ts`
- `src/App.tsx`
- `src/App.test.tsx`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/terminal/*`
- `tests/contract/contract-fixture-types.ts`
- `src-tauri/tests/contract_fixtures.rs`
- `scripts/validate-contract-fixtures.mjs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 3 and Story 3.2 acceptance criteria.
- `_bmad-output/planning-artifacts/architecture.md` - terminal architecture, typed IPC, event naming, Rust-owned session lifecycle, terminal hot path constraints.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Terminal Window layout constraints.
- `_bmad-output/implementation-artifacts/3-1-open-or-reuse-workspace-terminal-window.md` - current terminal implementation baseline and verification evidence.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: `pnpm test:frontend` passed (4 files, 33 tests).
- 2026-05-12: `pnpm test:contracts` passed; manifest validates 24 contract fixture groups and Rust contract fixtures pass.
- 2026-05-12: `pnpm test:data-integrity` passed; schema/data/terminal stream fixture checks pass.
- 2026-05-12: `cargo fmt`, `cargo fmt --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, and `cargo test --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts -- --nocapture` passed and regenerated frontend contract bindings.
- 2026-05-12: `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts -- --nocapture` passed and regenerated Tauri bindings.
- 2026-05-12: `pnpm build` passed.
- 2026-05-12: `pnpm test` passed.
- 2026-05-12: IPC boundary scan confirmed raw Tauri calls remain in shared API modules/tests; other hits are Rust enum/test names.
- 2026-05-12: `pnpm tauri build` passed and produced macOS app/dmg bundles.

### Completion Notes List

- Added typed terminal lifecycle IPC contracts for attach, input, resize, close and status events, including regenerated TypeScript bindings and fixtures.
- Reworked Rust terminal runtime state to track sessions by `terminalSessionId`, attach active/explicit sessions, reject invalid/closed lifecycle operations, and emit `terminal-status-change`.
- Extended PTY infrastructure to retain writer/master/child handles for input, resize and close/kill operations.
- Wired new Tauri commands through gateway/lib registration and shared frontend API facade.
- Updated TerminalPage to attach instead of reopening, forward xterm input, resize via calculated terminal dimensions, handle status events, and close sessions without storing terminal output in React state.
- Added Rust, frontend and contract fixture coverage for lifecycle behavior while keeping Story 3.1 terminal output batching/reuse coverage green.

### File List

- `_bmad-output/implementation-artifacts/3-2-terminal-session-lifecycle-ipc.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/terminal/terminal-attach.error.json`
- `fixtures/contracts/terminal/terminal-attach.request.json`
- `fixtures/contracts/terminal/terminal-attach.result.json`
- `fixtures/contracts/terminal/terminal-close.error.json`
- `fixtures/contracts/terminal/terminal-close.request.json`
- `fixtures/contracts/terminal/terminal-close.result.json`
- `fixtures/contracts/terminal/terminal-input.error.json`
- `fixtures/contracts/terminal/terminal-input.request.json`
- `fixtures/contracts/terminal/terminal-input.result.json`
- `fixtures/contracts/terminal/terminal-open.result.json`
- `fixtures/contracts/terminal/terminal-resize.error.json`
- `fixtures/contracts/terminal/terminal-resize.request.json`
- `fixtures/contracts/terminal/terminal-resize.result.json`
- `fixtures/contracts/terminal/terminal-status.event.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/terminal.ts`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/domain/terminal/mod.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `src-tauri/src/infrastructure/terminal/mod.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/terminal.ts`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/terminal-renderer.test.ts`
- `src/pages/terminal/terminal-renderer.ts`
- `src/shared/api/terminal-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 3.2 context for terminal session lifecycle IPC implementation.
- 2026-05-12: Implemented terminal attach/input/resize/close lifecycle IPC, status events, frontend lifecycle wiring, fixtures, tests and verification evidence.
