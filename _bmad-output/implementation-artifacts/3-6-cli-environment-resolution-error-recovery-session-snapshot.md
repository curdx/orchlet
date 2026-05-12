# Story 3.6: CLI 环境解析、错误恢复与 session 快照

Status: done

<!-- Note: Created after Story 3.5 completion to continue Epic 3 in sprint order. -->

## Story

As a user launching shells and AI CLIs,
I want launch failures and session recovery to be understandable,
so that I can fix configuration problems without losing terminal context.

## Acceptance Criteria

1. Given terminal environments are requested, when the app lists available shells and configured CLI paths, then it shows available, missing and invalid entries with actionable diagnostics.
2. Given terminal launch fails or resources are limited, when the failure is detected, then the UI explains what happened, the impact scope and the next action.
3. Given a terminal session exits or the terminal window is reopened, when the user restores or attaches to the tab, then the app shows the last observable snapshot, current state and exit reason.

## Tasks / Subtasks

- [x] Task 1: Add terminal environment resolution contracts and backend listing (AC: 1)
  - [x] Add typed terminal environment request/result DTOs and generated TypeScript bindings.
  - [x] Resolve default/common shells plus workspace member runtime commands into available, missing or invalid diagnostics.
  - [x] Keep member runtime source information tied to member id/label without implementing Epic 7 settings.

- [x] Task 2: Add launch failure diagnostics before and during PTY spawn (AC: 2)
  - [x] Preflight configured runtime commands before spawning member terminals.
  - [x] Return recoverable errors that state what happened, impact scope and next action for missing commands, invalid commands, spawn failures and resource-limit-like PTY failures.
  - [x] Ensure failed launch attempts do not create or leak runtime session entries.

- [x] Task 3: Maintain Rust-owned terminal session snapshots and exit reasons (AC: 3)
  - [x] Retain a bounded last observable output snapshot from terminal output events in Rust runtime state.
  - [x] Add snapshot and exit reason fields to session profiles and status events.
  - [x] Set an explicit exit reason when a session is closed and expose snapshot/current state on attach/close/status results.

- [x] Task 4: Surface environment diagnostics, launch errors and snapshots in TerminalPage (AC: 1-3)
  - [x] Add a compact terminal environment diagnostics strip using the shared terminal API only.
  - [x] Replace single-line terminal errors with a structured alert showing message, impact scope and next action.
  - [x] Rehydrate pane renderers from session snapshots on attach and show closed-session overlay with snapshot/current state/exit reason.
  - [x] Preserve the terminal output hot path outside React state.

- [x] Task 5: Add focused tests and contract fixtures (AC: 1-3)
  - [x] Add Rust unit tests for environment resolution, missing launch preflight and attach/close snapshot visibility.
  - [x] Add frontend tests for environment diagnostics, structured launch error alert and closed session snapshot overlay.
  - [x] Update contract fixtures and fixture type checks for new terminal DTO fields.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test:frontend`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 3.6 owns CLI/shell environment visibility, launch diagnostics, Rust-owned session snapshots and session exit reasons. Do not implement Epic 7 settings UI, persistent custom CLI management, durable scrollback storage, chat dispatch, notification wiring, diagnostics export, ACK flow-control changes or terminal output mirroring in React state.

### Current Implementation State

- Story 3.5 is complete at commit `d984ce9 Complete story 3.5 terminal find`.
- `TerminalRuntimeState` owns in-memory PTY sessions, active session id, tab coordination and status/output event sinks.
- `TerminalSessionProfile` currently has schema/session/workspace/member/title/status/cols/rows/timestamps only.
- Terminal output events are emitted with `seq` but not retained for attach/recovery.
- `PtyTerminalLauncher::spawn` wraps member commands through the shell and currently returns generic `terminal.pty.launchFailed` errors.
- `TerminalPage` routes output events directly to pane renderers; React state stores session metadata/tabs only and must not store terminal output chunks or scrollback.

### Technical Requirements

- Add environment listing through `src/shared/api/terminal-api.ts` and `src-tauri/src/gateway/terminal_commands.rs`; no frontend page should import raw Tauri APIs.
- Keep command/path resolution in Rust infrastructure/app layers. Frontend only renders returned diagnostics.
- Treat configured member runtime commands as the configured CLI path source for this story. Use member runtime kind/label/member id to identify diagnostics.
- Parse the executable portion of a configured command conservatively, including quoted executable paths. Invalid/empty commands must produce invalid diagnostics; non-resolvable executables must produce missing diagnostics.
- Preflight terminal launch commands before spawning PTY sessions so missing configured CLI commands fail with a recoverable `AppError` before a session is inserted.
- Keep snapshots bounded and Rust-owned. The frontend may render a returned session snapshot but must not append stream chunks to React state.
- Close/exit handling must preserve the last snapshot and expose an explicit exit reason at least for user-initiated close.
- Existing tab create/close/restore/search/sort, pane assignment, terminal find and text operation behavior must remain green.

### Architecture Compliance

- `src/shared/api` remains the only frontend IPC boundary; `src-tauri/src/gateway` remains the command/event boundary.
- Terminal runtime state is authoritative in Rust; frontend sees snapshots and stream envelopes only.
- Terminal hot-path output continues to use renderer adapter writes, not React output arrays.
- Recoverable errors must include actionable `userAction`; UI must show what happened, impact scope and next action.
- Do not add shell/opener/plugin capabilities for environment listing; command resolution uses backend environment/path inspection.

### UX Requirements

- Environment diagnostics should be compact and operational, not a settings page. Use status labels such as `可用`, `缺失`, `无效` with command/path details and next action.
- Launch failure alerts must show:
  - what happened: error message,
  - impact scope: current terminal action/session request only,
  - next action: `userAction`.
- Closed/re-attached session UI must show current state, exit reason and last observable snapshot. Snapshot text must be constrained so it does not resize or overlap panes.

### Previous Story Intelligence

- Story 3.5 deliberately avoided new Rust IPC; Story 3.6 is the first Epic 3 story after that which should add terminal contracts and IPC again.
- Story 3.5 kept renderer text operations pane-scoped through the renderer registry; snapshot rehydration should target the pane being attached, not all renderers.
- Story 3.4 tests rely on pane labels to identify renderer instances; preserve this pattern for new frontend tests.
- Story 3.2/3.3 established contract fixture coverage for every terminal request/result/event shape. New DTOs and new profile fields must update Rust and TypeScript fixture checks.

### Relevant Files To Read Before Coding

- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/infrastructure/terminal/mod.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `src-tauri/src/domain/terminal/mod.rs`
- `src/shared/api/terminal-api.ts`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src-tauri/tests/contract_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `fixtures/contracts/terminal/*`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 3.6 acceptance criteria and FR41-FR44.
- `_bmad-output/planning-artifacts/prd.md` - Terminal workspace requirements, NFR24 and NFR31.
- `_bmad-output/planning-artifacts/architecture.md` - terminal runtime ownership, snapshot attach, IPC boundaries and recoverable error rules.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - terminal status overlay and error feedback guidance.
- `_bmad-output/implementation-artifacts/3-5-terminal-text-operations-find-options.md` - current renderer/pane behavior and verification baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml app::terminal -- --nocapture` - pass.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` - pass and regenerated frontend TypeScript contracts.
- 2026-05-12: `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` - pass and regenerated Tauri-side bindings.
- 2026-05-12: `pnpm test:frontend -- src/pages/terminal/TerminalPage.test.tsx` - pass.
- 2026-05-12: `pnpm test:contracts` - pass.
- 2026-05-12: `pnpm build` - pass after updating stale test fixture; Vite reported existing chunk-size warning.
- 2026-05-12: `pnpm test:frontend` - pass.
- 2026-05-12: `pnpm test:data-integrity` - pass.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml --check` - pass.
- 2026-05-12: `cargo check --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `pnpm test` - pass.
- 2026-05-12: IPC boundary scan - reviewed expected shared API/Tauri gateway references only.
- 2026-05-12: `pnpm tauri build` - pass; Tauri reported existing bundle identifier warning and Vite reported existing chunk-size warning.

### Completion Notes List

- Added typed terminal environment listing contracts, fixtures and generated bindings for system shells and member runtime command diagnostics.
- Implemented Rust command resolution, missing/invalid launch preflight, resource-limit launch errors and session leak prevention on failed launch.
- Added Rust-owned bounded session snapshots and exit reasons to session profiles/status events, with attach/close returning the latest observable snapshot.
- Added TerminalPage environment diagnostics, structured launch error alert, snapshot rehydration on attach and closed-session snapshot overlay without routing terminal output chunks through React state.
- Added Rust, frontend and contract fixture coverage for the new environment, error recovery and snapshot behavior.

### File List

- `_bmad-output/implementation-artifacts/3-6-cli-environment-resolution-error-recovery-session-snapshot.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/terminal/terminal-attach.result.json`
- `fixtures/contracts/terminal/terminal-close.result.json`
- `fixtures/contracts/terminal/terminal-environments-list.error.json`
- `fixtures/contracts/terminal/terminal-environments-list.request.json`
- `fixtures/contracts/terminal/terminal-environments-list.result.json`
- `fixtures/contracts/terminal/terminal-input.result.json`
- `fixtures/contracts/terminal/terminal-open.result.json`
- `fixtures/contracts/terminal/terminal-resize.result.json`
- `fixtures/contracts/terminal/terminal-status.event.json`
- `fixtures/contracts/terminal/terminal-tab-close.result.json`
- `fixtures/contracts/terminal/terminal-tab-create.result.json`
- `fixtures/contracts/terminal/terminal-tab-restore.result.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/terminal.ts`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/terminal.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `src-tauri/src/infrastructure/terminal/mod.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/terminal.ts`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/TerminalPage.tsx`
- `src/shared/api/terminal-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 3.6 context for CLI environment resolution, recoverable launch errors and terminal session snapshots.
- 2026-05-12: Implemented CLI environment diagnostics, launch recovery errors, Rust-owned terminal snapshots, exit reasons and TerminalPage recovery UI.
