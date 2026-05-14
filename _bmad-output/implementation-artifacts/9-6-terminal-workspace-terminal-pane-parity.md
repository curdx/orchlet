# Story 9.6: TerminalWorkspace and TerminalPane parity

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a user,
I want the terminal window to match Golutra,
So that terminal-heavy workflows keep the same muscle memory after the React rewrite.

## Acceptance Criteria

1. Given the terminal window opens, when TerminalWorkspace renders, then header, subtitle, tab search, new tab button, recent closed button and tab bar match Golutra structure, density, colors and iconography.
2. Given tabs and panes are used, when users create, close, restore, search, pin, move or assign tabs to panes, then existing React/Tauri behavior remains functional while the visible state follows Golutra.
3. Given TerminalPane renders, when users focus, copy, clear, search or inspect exited sessions, then xterm background, pane focus ring, closed overlay and find overlay match Golutra style.
4. Given browser preview is used outside Tauri, when `?mode=terminal` is opened, then the terminal parity surface can be visually inspected without launching a separate desktop terminal window.

## Tasks / Subtasks

- [x] Task 1: Restyle TerminalWorkspace visible shell (AC: 1, 2)
  - [x] Replace the green/slate terminal toolbar with Golutra-style compact dark header, tab search, new-tab control and recent-closed tab affordance.
  - [x] Switch visible terminal controls from lucide icons to Material Symbols on the parity surface.
  - [x] Preserve existing create, restore, pin, move, assign and close handlers.

- [x] Task 2: Restyle tab bar and pane grid (AC: 2, 3)
  - [x] Match Golutra tab pills with terminal icon, pin indicator, activity dot and inline close affordance.
  - [x] Render pane grid as black terminal cells with sky focus ring, compact in-pane tab header and empty-pane drop/create state.
  - [x] Keep closed-session overlay visible after closing the last active tab.

- [x] Task 3: Restyle find overlay and xterm theme (AC: 3)
  - [x] Move terminal find to Golutra-style black glass overlay with `Aa`, `ab`, `.*`, previous/next and close controls.
  - [x] Update xterm theme to Golutra black background and sky cursor/selection accents.

- [x] Task 4: Add browser preview support and screenshots (AC: 4)
  - [x] Add browser-only `?mode=terminal` window-mode override for parity preview.
  - [x] Capture terminal workspace and find overlay screenshots.

- [x] Task 5: Complete full Golutra terminal parity (AC: 1, 2, 3)
  - [x] Port exact drag/drop tab reordering and pane drop visual behavior from Golutra.
  - [x] Port terminal tab context menu behavior.
  - [x] Add attach/reconnect/fatal overlay parity against the reference implementation.
  - [x] Capture matching Golutra reference screenshots for pixel-level comparison.

## Dev Notes

This story remains in progress. The terminal window now uses the Golutra visual system and keeps the existing tested React/Tauri terminal behavior, but complete parity still requires drag/drop, context menus, failure overlay comparison and reference screenshot diffing.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Read Golutra `TerminalWorkspace.vue` and `TerminalPane.vue`.
- 2026-05-13: Reworked React `TerminalPage` visible structure to match Golutra terminal header, tab bar, pane grid and find overlay.
- 2026-05-13: Added browser-only `?mode=terminal` preview mode in the window context fallback.
- 2026-05-13: Updated xterm theme to black/sky Golutra terminal colors.
- 2026-05-14: Completed Task 5 drag/drop tab behavior, Golutra terminal tab context menu, pane attach/reconnect/fatal overlays and reference screenshot comparisons.

### Completion Notes List

- `pnpm exec tsc --noEmit` passed.
- `pnpm test:frontend src/pages/terminal/TerminalPage.test.tsx` passed with 20 tests.
- `pnpm test` passed across frontend, contracts, data-integrity, capabilities, smoke and release readiness validators; release readiness validator reports the existing MVP release gate as blocked while exiting successfully.
- `pnpm build` passed with the existing Vite large chunk warning.
- Terminal preview captured at `_bmad-output/implementation-artifacts/9-6-terminal-workspace-browser-preview.png`.
- Terminal find overlay preview captured at `_bmad-output/implementation-artifacts/9-6-terminal-find-overlay-browser-preview.png`.
- Terminal tab context menu preview captured at `_bmad-output/implementation-artifacts/9-6-terminal-context-menu-browser-preview.png`.
- Golutra terminal reference screenshots captured for workspace, context menu and attach overlay.
- Workspace and context menu comparison images captured at `_bmad-output/implementation-artifacts/9-6-terminal-workspace-comparison.png` and `_bmad-output/implementation-artifacts/9-6-terminal-context-menu-comparison.png`.

### File List

- `_bmad-output/implementation-artifacts/9-6-terminal-workspace-terminal-pane-parity.md`
- `_bmad-output/implementation-artifacts/9-6-terminal-workspace-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-6-terminal-find-overlay-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-6-terminal-context-menu-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-6-golutra-reference-terminal-workspace.png`
- `_bmad-output/implementation-artifacts/9-6-golutra-reference-terminal-context-menu.png`
- `_bmad-output/implementation-artifacts/9-6-golutra-reference-terminal-attach-overlay.png`
- `_bmad-output/implementation-artifacts/9-6-terminal-workspace-comparison.png`
- `_bmad-output/implementation-artifacts/9-6-terminal-context-menu-comparison.png`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/terminal/TerminalPage.test.tsx`
- `src/pages/terminal/terminal-renderer.ts`
- `src/shared/api/terminal-api.ts`
- `src/shared/api/window-context-api.ts`

## Change Log

- 2026-05-13: Started Story 9.6 and completed the first terminal workspace/pane parity slice.
- 2026-05-14: Completed Task 5 terminal interaction parity and moved story to review.
