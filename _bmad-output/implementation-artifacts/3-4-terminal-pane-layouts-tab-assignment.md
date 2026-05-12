# Story 3.4: Terminal pane layouts 与 tab 分配

Status: done

<!-- Note: Created after Story 3.3 completion to continue Epic 3 in sprint order. -->

## Story

As a developer comparing command output,
I want to arrange terminal tabs into panes,
so that I can watch related processes side by side.

## Acceptance Criteria

1. Given one or more terminal tabs exist, when the user selects single pane, left/right split, top/bottom split or 2x2 layout, then the terminal window applies the selected layout without clipping terminal text.
2. Given multiple panes are visible, when the user assigns a terminal tab to a pane, then that tab renders in the chosen pane and remains attached to the same backend session.
3. Given a layout change occurs, when terminal dimensions change, then backend resize events are sent for affected sessions.

## Tasks / Subtasks

- [x] Task 1: Add pane layout UI state and controls on the terminal page (AC: 1)
  - [x] Add typed frontend-only pane layout state for `single`, `splitVertical`, `splitHorizontal`, and `grid2x2`.
  - [x] Add compact layout controls using lucide icons and accessible labels without adding new Tauri capabilities.
  - [x] Render one, two, or four stable pane containers with responsive constraints that do not clip terminal text.
  - [x] Keep pane layout state local/ephemeral for this story; do not add storage, contracts, migrations or settings unless required by implementation.

- [x] Task 2: Assign terminal tabs to panes without changing backend sessions (AC: 2)
  - [x] Track pane-to-tab assignments by `tabId` and focused pane id in React state only.
  - [x] When a visible pane receives a tab assignment, attach that pane to the tab's existing `terminalSessionId` and keep the same session id.
  - [x] Provide an explicit assignment affordance for the active tab/focused pane and an empty-pane create-tab action.
  - [x] Keep tab create/close/restore/pin/sort/search behavior from Story 3.3 intact.

- [x] Task 3: Render pane-scoped terminal adapters without React-owned output (AC: 1-3)
  - [x] Maintain one `XtermRendererAdapter` per visible pane and dispose adapters when panes disappear.
  - [x] Route terminal output events directly to the renderer for the pane assigned to the matching `terminalSessionId`; do not store terminal output or inactive pane buffers in React state.
  - [x] Forward input from each pane renderer to that pane's assigned session only.
  - [x] Preserve Story 3.2 stale resize guards so exited sessions are not revived by delayed resize results.

- [x] Task 4: Resize affected sessions when layout or pane dimensions change (AC: 3)
  - [x] Measure each visible pane independently with `measureTerminalSize`.
  - [x] Send `resizeTerminal` for each running assigned session when pane dimensions change after layout selection or window resize.
  - [x] Ensure empty panes and closed tabs do not send resize or input requests.
  - [x] Keep terminal body height stable during layout switches and loading/empty states.

- [x] Task 5: Add focused pane layout tests and regression coverage (AC: 1-3)
  - [x] Add frontend tests for switching single/split/grid layouts and keeping pane containers stable.
  - [x] Add frontend tests for assigning a tab to a pane and verifying output/input/resize use the same backend session id.
  - [x] Add frontend tests that inactive/unassigned pane output is not written to the wrong renderer.
  - [x] Keep Story 3.3 tab create/close/restore/search/pin/sort tests green.

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

Story 3.4 owns terminal pane layouts, focused pane selection, tab-to-pane assignment, pane-scoped renderer routing and resize events after layout changes. Do not implement terminal text find/highlight, persisted scrollback/snapshots, CLI environment diagnostics, chat-to-terminal dispatch, notifications, DND/busy queues, terminal-output-to-chat, settings UI, drag-and-drop polish beyond a simple assignment affordance, or durable pane persistence.

### Current Implementation State

- Story 3.3 is complete at commit `cc2bc6f Complete story 3.3 terminal tabs`.
- `TerminalPage` currently stores tab metadata, active tab id, search query and status metadata in React state; terminal output still goes directly to `XtermRendererAdapter`.
- `TerminalPage` currently creates a single renderer adapter mounted to one terminal surface.
- Shared terminal API includes `listTabs`, `createTab`, `closeTab`, `restoreTab`, `updateTab`, `attachTerminal`, `sendInput`, `resizeTerminal`, `subscribeOutput` and `subscribeStatus`.
- Rust terminal lifecycle APIs already support session attach/input/resize/close by `terminalSessionId`.
- There is no pane layout state, pane-to-tab assignment state, pane-specific renderer registry or pane-focused resize logic.

### Technical Requirements

- Layout ids should be frontend-local string literals: `single`, `splitVertical`, `splitHorizontal`, `grid2x2`.
- Pane ids should be stable across renders, e.g. `pane-1` through `pane-4`. Visible panes are derived from the current layout.
- Assignment state should map pane id to `tabId`; session routing should derive `terminalSessionId` from the current `TerminalTabProfile`, not duplicate session ids in separate mutable state.
- A tab may be assigned to a visible pane through an explicit UI control. If the user selects a tab while multiple panes are visible, use the focused pane as the assignment target.
- Empty pane content should match UX copy: `拖动标签到这里，或新建一个终端。`; this story may use click/command assignment instead of full drag-and-drop.
- Search result selection should focus the pane containing the tab if assigned; otherwise assign/focus it in the currently focused pane.
- Layout changes should preserve assignments for panes that remain visible and ignore hidden pane assignments until that pane becomes visible again.
- Terminal output must not be stored in React state. Multiple pane renderers should receive output by matching event `terminalSessionId` to the pane's assigned tab.
- Resize requests should be pane-scoped and guarded by both assigned tab status and latest session status. Closed/unassigned panes must not call `resizeTerminal`.
- No new Rust contracts, storage manifest entries, migrations or Tauri permissions are expected for this story unless implementation discovers a hard requirement.

### Architecture Compliance

- Frontend page code must continue to call only `src/shared/api/terminal-api.ts` for terminal IPC; raw Tauri imports remain limited to shared API modules/tests.
- Terminal output bypasses React state; React may store pane layout, focused pane id and pane/tab assignment metadata only.
- Xterm renderer lifecycle remains encapsulated through `XtermRendererAdapter`; do not parse or persist xterm buffer content.
- Loading indicators and empty pane affordances must not resize fixed terminal/tool layouts.
- Use lucide icons for layout/assignment controls and icon-only button accessible labels.
- Do not broaden Tauri capabilities, dialog/opener access, shell plugins or terminal window permissions.

### UX Requirements

- Follow Terminal Window UX: main body supports single, left/right split, top/bottom split and 2x2 grid.
- Pane layout controls should be compact operational controls, not a marketing-style section.
- The terminal body must remain the first-screen operational surface.
- Empty pane state should be clear and compact; no nested cards.
- Narrow widths should not force unreadable four-pane content. The implementation should keep panes min-sized and allow the grid to collapse/scroll or show a compact warning if needed.
- Text labels in controls and empty states must truncate or wrap without overlapping.

### Previous Story Intelligence

- Story 3.3 established durable terminal tab metadata and browser fallback multiple-tab state. Reuse it; do not create a parallel tab model.
- Story 3.3 frontend tests verify inactive output is not written for active tab switching. Extend that idea to pane-scoped output routing.
- Story 3.3 fixed session reuse mapping so closing one tab does not break reuse of another same workspace/member session.
- Story 3.2 guarded delayed resize results so exited sessions are not revived; preserve this guard per pane.
- Story 3.2 renderer tests cover batching/input/resize; keep them green.

### Relevant Files To Read Before Coding

- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/terminal-renderer.ts`
- `src/pages/terminal/terminal-renderer.test.ts`
- `src/shared/api/terminal-api.ts`
- `src-tauri/src/app/terminal/mod.rs`
- `src-tauri/src/gateway/terminal_commands.rs`
- `_bmad-output/implementation-artifacts/3-3-terminal-tabs-create-restore-search-sort.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 3.4 acceptance criteria and FR36/FR37.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Terminal Window pane layout and pane interaction requirements.
- `_bmad-output/planning-artifacts/architecture.md` - Terminal workspace architecture, frontend state rules, IPC boundary and output routing rules.
- `_bmad-output/implementation-artifacts/3-3-terminal-tabs-create-restore-search-sort.md` - current tab implementation and verification baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: `pnpm test:frontend -- src/pages/terminal/TerminalPage.test.tsx` - pass after fixing focused-pane assignment race.
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

- Implemented local pane layout state for single, left/right split, top/bottom split and 2x2 without adding storage/contracts/capabilities.
- Refactored terminal rendering to one renderer adapter per visible pane, with pane-to-tab assignment by `tabId` and output/input/resize routed by the assigned tab's `terminalSessionId`.
- Added focused-pane assignment controls, empty pane create action, stable pane containers and guarded resize handling so closed/unassigned panes do not revive or receive session traffic.
- Preserved Story 3.3 tab create/close/restore/search/pin/sort behavior and added regression coverage for pane layouts and session routing.

### File List

- `_bmad-output/implementation-artifacts/3-4-terminal-pane-layouts-tab-assignment.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`

## Change Log

- 2026-05-12: Created Story 3.4 context for terminal pane layouts and tab assignment.
- 2026-05-12: Implemented terminal pane layouts, tab assignment, pane-scoped renderer routing, resize handling and frontend regression tests.
