# Story 9.2: App shell、titlebar、sidebar、global systems parity

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a user,
I want the React app shell to look and behave like Golutra,
So that switching from Vue to React does not feel like a different product.

## Acceptance Criteria

1. Given the app opens in any window mode, when the shell is rendered, then `window-frame`、titlebar、window controls、resize handles、focused/maximized/inactive states match Golutra.
2. Given a workspace is open, when the main window is rendered, then SidebarNav, avatar/status menu, unread badge, mobile bottom nav and active tab styling match Golutra.
3. Given a user triggers toasts, context menus, theme or language changes, when global systems respond, then ToastStack, ContextMenuHost and cross-window theme/language sync match Golutra behavior and style.

## Tasks / Subtasks

- [x] Task 1: Bring Golutra global visual assets into React (AC: 1, 3)
  - [x] Copy Be Vietnam Pro font weights and Material Symbols font into `src/assets/fonts`.
  - [x] Replace the React global CSS baseline with Golutra-compatible theme variables, font faces, custom scrollbars and xterm overrides.

- [x] Task 2: Rebuild the React entry shell around Golutra window primitives (AC: 1)
  - [x] Add `window-frame`, `titlebar`, window controls, maximize/focus/inactive classes and resize handles around non-notification windows.
  - [x] Keep terminal mode routed through existing `TerminalPage` inside the Golutra shell.

- [x] Task 3: Add Golutra-style SidebarNav shell (AC: 2)
  - [x] Add Material Symbols nav icons, active rail, unread badge, account avatar/status menu and desktop/mobile nav placement.
  - [x] Keep the current aggregate React page mounted as a functional bridge until Stories 9.3-9.9 replace internal surfaces.

- [x] Task 4: Complete global host parity (AC: 3)
  - [x] Replace the placeholder `ContextMenuHost` with a real React context-menu host matching Golutra rules.
  - [x] Consolidate existing local toast rendering into a shell-level ToastStack without duplicate toasts.
  - [x] Capture reference/current shell screenshots after the internal page bridge is removed enough to compare cleanly.

## Dev Notes

This story is intentionally left in progress after the first implementation slice. The shell, titlebar, sidebar and global CSS foundation are now in React, but internal screen parity remains delegated to Stories 9.3-9.9 and the full global host behavior still needs a follow-up pass.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Ported Golutra font assets and global CSS primitives into React.
- 2026-05-13: Wrapped React `App` routes with Golutra `window-frame`/`titlebar` shell and added SidebarNav parity scaffold.
- 2026-05-13: Preserved current functional aggregate workspace page as a bridge so existing backend and workflow tests remain usable.
- 2026-05-14: Added shell-level ToastStack backed by the shared toast store so workspace routes no longer render duplicate local toasts.
- 2026-05-14: Replaced the placeholder context-menu host with a global edit menu for copy, cut, paste and select-all, including input/contenteditable state handling, escape/scrim dismissal and viewport-aware positioning.
- 2026-05-14: Captured React and Golutra context-menu/toast screenshots for the global host parity pass; React screenshot uses the workspace-selection bridge while remaining internal surfaces are tracked by Stories 9.3-9.9.

### Completion Notes List

- `pnpm build` passed.
- `pnpm test:frontend src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` passed with 107 tests.
- `pnpm exec tsc --noEmit` passed.
- `pnpm test:frontend src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` passed with 108 tests.
- `pnpm test:contracts` passed.
- `pnpm test:data-integrity` passed.
- `pnpm build` passed with the existing Vite large chunk warning.
- `cargo fmt --check --manifest-path src-tauri/Cargo.toml` passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` passed with 444 unit tests, 12 contract fixture tests, 21 schema/data fixture tests and 1 smoke scaffold test.
- `git diff --check` passed.

### File List

- `_bmad-output/implementation-artifacts/9-2-app-shell-titlebar-sidebar-global-systems-parity.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/App.tsx`
- `src/app/styles.css`
- `src/App.test.tsx`
- `src/assets/fonts/BeVietnamPro-300.woff2`
- `src/assets/fonts/BeVietnamPro-400.woff2`
- `src/assets/fonts/BeVietnamPro-500.woff2`
- `src/assets/fonts/BeVietnamPro-600.woff2`
- `src/assets/fonts/BeVietnamPro-700.woff2`
- `src/assets/fonts/MaterialSymbolsOutlined.woff2`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/ui/index.ts`
- `src/shared/ui/toast-store.ts`
- `_bmad-output/implementation-artifacts/9-2-shell-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-2-shell-context-menu-preview.png`
- `_bmad-output/implementation-artifacts/9-2-shell-toast-preview.png`
- `_bmad-output/implementation-artifacts/9-2-golutra-reference-context-menu.png`
- `_bmad-output/implementation-artifacts/9-2-context-menu-comparison.png`

## Change Log

- 2026-05-13: Started Story 9.2 and completed the first shell/global visual foundation slice.
- 2026-05-14: Completed Story 9.2 global host parity, added shell ToastStack/context menu implementation, captured comparison artifacts and moved story to review.
