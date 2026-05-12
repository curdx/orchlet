# Story 3.5: Terminal 文本操作和查找选项

Status: done

<!-- Note: Created after Story 3.4 completion to continue Epic 3 in sprint order. -->

## Story

As a terminal user,
I want standard input, selection, copy, clear and find behavior,
so that terminal interaction feels native and efficient.

## Acceptance Criteria

1. Given a terminal is focused, when the user types, selects, copies or clears terminal text, then the terminal performs the expected operation without breaking session output.
2. Given the user opens terminal find, when they search text, then matches are highlighted and navigation between matches is keyboard-operable.
3. Given find options are set, when the user toggles case sensitivity, whole word or regex mode, then search results update according to the selected options.

## Tasks / Subtasks

- [x] Task 1: Extend the terminal renderer adapter with text operation APIs (AC: 1-3)
  - [x] Add adapter methods for focus, select all, copy selected text, clear terminal, clear selection and find navigation using xterm public APIs.
  - [x] Read searchable text from xterm's active buffer without storing terminal output in React state.
  - [x] Implement find matching for plain text, case-sensitive mode, whole-word mode and regex mode, including invalid regex handling.
  - [x] Keep output batching and input forwarding behavior from Stories 3.2-3.4 intact.

- [x] Task 2: Add pane-scoped terminal text controls in `TerminalPage` (AC: 1)
  - [x] Add compact icon controls for focus, select all, copy selected text and clear terminal for the focused/assigned pane.
  - [x] Ensure controls target only the focused pane's renderer and do nothing for empty panes.
  - [x] Preserve tab create/close/restore/search/pin/sort and pane layout behavior from Stories 3.3-3.4.
  - [x] Do not add new Rust IPC, storage, contracts, migrations or Tauri capabilities.

- [x] Task 3: Add terminal find overlay with keyboard navigation (AC: 2-3)
  - [x] Add a focused-pane find overlay with input, result count, previous/next controls and close action.
  - [x] Support keyboard behavior: `Enter` next, `Shift+Enter` previous and `Escape` close.
  - [x] Add `Aa`, `ab` and `.*` option toggles for case sensitivity, whole word and regex.
  - [x] Update results immediately when query or options change, and clear selection when the overlay closes or query is empty.

- [x] Task 4: Add focused tests and regression coverage (AC: 1-3)
  - [x] Add renderer adapter tests for select/copy/clear and find matching/options/navigation.
  - [x] Add frontend tests that text operations target the focused pane renderer only.
  - [x] Add frontend tests for find overlay keyboard navigation and option updates.
  - [x] Keep Story 3.4 pane layout and Story 3.3 tab tests green.

- [x] Task 5: Verification and completion evidence (AC: 1-3)
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

Story 3.5 owns terminal text operations and find UI for the existing terminal page and pane renderer adapters. Do not implement CLI environment diagnostics, session snapshots, persisted scrollback, chat dispatch, DND/busy queues, terminal-output-to-chat, notifications, settings, tab right-click menus, drag-and-drop polish or durable pane persistence.

### Current Implementation State

- Story 3.4 is complete at commit `1e74c5b Complete story 3.4 terminal panes`.
- `TerminalPage` now has local pane layout state, pane-to-tab assignment state and one renderer adapter per visible pane.
- Terminal output events are routed directly to pane renderers by `terminalSessionId`; React state must not store output chunks or scrollback.
- `XtermRendererAdapter` currently exposes mount/write/resize/dispose only, but xterm core exposes public APIs for focus, select all, selection text, clear, clear selection, active buffer access, select and scroll-to-line.
- No current Rust command or contract is required for local text selection/find operations.

### Technical Requirements

- Extend `XtermRendererAdapter` rather than reaching into xterm from React.
- Keep all text operations pane-scoped through the existing renderer registry in `TerminalPage`.
- Find implementation should read the current xterm active buffer on demand; it must not mirror terminal output into React state.
- Plain search should escape user text; regex search should catch invalid expressions and surface a compact error/no-result state instead of throwing.
- Whole-word mode should use a word-boundary matcher for both plain and regex search where practical.
- Navigation should select and scroll to the active match; result count should show `index/total`, `无结果`, or an invalid-regex state.
- Copy should use selected text from the focused pane renderer and write to `navigator.clipboard` when available. If clipboard is unavailable or no selection exists, do not send terminal input or resize.
- Clear terminal should call xterm clear on the focused pane renderer only; it must not close or recreate the backend session.
- Closing find overlay or clearing query should clear the current find selection.

### Architecture Compliance

- Frontend page code must continue to call only `src/shared/api/terminal-api.ts` for terminal IPC; this story should not add IPC.
- Terminal output hot path stays outside React state; find may compute matches from xterm buffer on demand.
- Xterm renderer lifecycle and text operations remain encapsulated in `terminal-renderer.ts`.
- Use lucide icons for icon controls and keep icon-only buttons accessible with `aria-label` and `title`.
- Do not broaden Tauri capabilities or add dialog/opener/shell plugin access.

### UX Requirements

- Follow Terminal Window UX: find overlay contains input, result count, previous/next controls, close action and `Aa`, `ab`, `.*` toggles.
- Keyboard behavior: `Enter` moves to next match, `Shift+Enter` moves to previous match, `Escape` closes the find overlay.
- Controls should be compact operational controls in the terminal toolbar/pane surface, not a marketing-style section.
- Text labels must truncate or wrap without overlapping. Loading/empty/find states must not resize terminal panes.

### Previous Story Intelligence

- Story 3.4 added per-pane renderer refs and a synchronous focused pane ref after tests exposed a focused-pane assignment race. Text operations must use the latest focused pane synchronously.
- Story 3.4 tests identify renderers by mounted pane output labels because renderer creation order is not a stable proxy for pane id.
- Story 3.4 preserved closed/unassigned pane guards for input and resize. Text operations should follow the same no-op behavior for empty panes.
- Story 3.3 tab behavior and Story 3.4 pane behavior must remain green.

### Relevant Files To Read Before Coding

- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/terminal-renderer.ts`
- `src/pages/terminal/terminal-renderer.test.ts`
- `src/shared/api/terminal-api.ts`
- `_bmad-output/implementation-artifacts/3-4-terminal-pane-layouts-tab-assignment.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 3.5 acceptance criteria and FR38/FR39.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Terminal Find Overlay and keyboard requirements.
- `_bmad-output/planning-artifacts/architecture.md` - Terminal hot-path, IPC boundary and xterm renderer rules.
- `_bmad-output/implementation-artifacts/3-4-terminal-pane-layouts-tab-assignment.md` - current pane renderer and verification baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: `pnpm test:frontend -- src/pages/terminal/terminal-renderer.test.ts src/pages/terminal/TerminalPage.test.tsx` - pass.
- 2026-05-12: `pnpm test:frontend` - pass.
- 2026-05-12: `pnpm test:contracts` - pass.
- 2026-05-12: `pnpm test:data-integrity` - pass.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml --check` - pass.
- 2026-05-12: `cargo check --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `pnpm build` - pass; Vite reported existing chunk-size warning.
- 2026-05-12: `pnpm test` - pass.
- 2026-05-12: IPC boundary scan - reviewed expected shared API/Tauri gateway references only.
- 2026-05-12: `pnpm tauri build` - pass; Tauri reported existing bundle identifier warning.

### Completion Notes List

- Added xterm adapter text operations for focus, select all, copy selection, clear terminal, clear selection and buffer-backed find.
- Implemented plain/case-sensitive/whole-word/regex find with invalid regex handling, keyboard navigation and current-match selection/scrolling without mirroring terminal output into React state.
- Added pane-scoped terminal text controls and a compact find overlay that targets the focused assigned pane only.
- Preserved existing tab and pane behavior; no Rust IPC, storage, contract, migration or Tauri capability changes were needed.

### File List

- `_bmad-output/implementation-artifacts/3-5-terminal-text-operations-find-options.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/terminal-renderer.ts`
- `src/pages/terminal/terminal-renderer.test.ts`

## Change Log

- 2026-05-12: Created Story 3.5 context for terminal text operations and find options.
- 2026-05-12: Implemented terminal text operations, pane-scoped find overlay, find options and regression coverage.
