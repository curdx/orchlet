# Story 9.7: Settings parity

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a user,
I want settings to match Golutra,
So that account, theme, language, terminal and data preferences remain understandable after the React rewrite.

## Acceptance Criteria

1. Given the Settings tab is selected from SidebarNav, when the main panel renders, then the React app shows a Golutra-style settings surface instead of a placeholder.
2. Given settings sections render, when users inspect account, appearance, language, members, notifications, keybinds and data, then the left settings rail, section headers, cards, controls, separators and scrolling behavior match Golutra's structure and visual language.
3. Given users edit settings, when they change profile fields, avatar presets, theme, language, notification toggles, shortcut toggles, CLI commands, chat output mode or data maintenance actions, then existing React/Tauri handlers remain wired.
4. Given desktop and mobile previews are captured, when the current React screen is reviewed, then no blocking layout overlap or unreadable text remains in the first settings parity slice.

## Tasks / Subtasks

- [x] Task 1: Route Settings tab to a real parity surface (AC: 1)
  - [x] Replace the Settings placeholder with `SettingsParity` when `parityView === "settings"`.
  - [x] Pass existing profile, notification, shortcut, chat output, terminal configuration and data maintenance state into the parity surface.

- [x] Task 2: Implement Golutra-style settings layout (AC: 2)
  - [x] Add left settings rail with user/app groups and icon navigation.
  - [x] Add right-side `Preferences` content area with account, appearance, language, default member/CLI, notifications, keybinds and data sections.
  - [x] Add desktop and mobile CSS matching Golutra's glass cards, section separators, Material Symbols and compact icon rail.

- [x] Task 3: Wire first-slice settings actions (AC: 3)
  - [x] Profile display name, status, timezone and status message update the existing profile draft and save handler.
  - [x] Avatar upload, preset, reset and delete reuse existing avatar handlers.
  - [x] Theme/language buttons call existing preference synchronization.
  - [x] Notification toggles, shortcut toggles, built-in CLI commands, chat output mode and chat maintenance actions reuse existing handlers.

- [x] Task 4: Capture preview screenshots (AC: 4)
  - [x] Desktop preview captured at `_bmad-output/implementation-artifacts/9-7-settings-browser-preview.png`.
  - [x] Mobile preview captured at `_bmad-output/implementation-artifacts/9-7-settings-mobile-preview.png`.

- [x] Task 5: Complete full Golutra Settings parity (AC: 2, 3, 4)
  - [x] Port exact avatar floating menu placement and uploaded-avatar grid.
  - [x] Port custom member and custom terminal add/edit/remove card flows.
  - [x] Port exact keybind profile rows and disabled/unavailable badges.
  - [x] Capture matching Golutra reference screenshots for pixel-level comparison.

## Dev Notes

This story remains in progress. The Settings tab is now a real Golutra-style settings page and uses the existing settings contracts, but full parity still requires the floating avatar menu, custom member/terminal edit flows and exact reference screenshot diffing.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Read Golutra `Settings.vue`.
- 2026-05-13: Added `SettingsParity` to the React workspace parity bridge.
- 2026-05-13: Added Settings parity CSS with desktop rail and mobile icon rail.
- 2026-05-13: Verified desktop and mobile browser previews.
- 2026-05-14: Ported Golutra avatar floating menu positioning, uploaded-avatar tile, custom CLI and terminal card forms, keybind availability rows and reference comparison screenshots.
- 2026-05-14: Verified Settings parity with `pnpm exec tsc --noEmit`, `pnpm test:frontend src/App.test.tsx -- --runInBand`, `pnpm test`, `pnpm build`, `git diff --check` and browser screenshots.

### Completion Notes List

- `pnpm exec tsc --noEmit` passed before artifact creation.
- Desktop preview captured at `_bmad-output/implementation-artifacts/9-7-settings-browser-preview.png`.
- Mobile preview captured at `_bmad-output/implementation-artifacts/9-7-settings-mobile-preview.png`.
- Avatar menu now uses the Golutra click-position floating menu pattern, clamps inside the viewport, and exposes preset/upload actions through the existing avatar handlers.
- Default member settings now use Golutra-style built-in/custom CLI cards plus custom terminal cards with add/edit/remove/default-selection flows wired to the existing terminal configuration handler.
- Keybinds now render all backend shortcut rows for the selected draft profile, including Enabled, Disabled and Unavailable badges with unavailable reasons.
- Matching reference and React screenshots were captured for full settings, avatar menu and custom form states, then regenerated as comparison montages.
- Rechecked Golutra `Settings.vue` / `settingsStore.setLocale` against React settings parity after user feedback: the preference persistence/event path already existed, but the parity settings surface used hard-coded English. Settings parity now derives section labels, language/theme copy, account controls, terminal controls, notification controls, shortcut states and data-maintenance labels from the active `language`.
- Rechecked Golutra terminal-member menu behavior: `Test` opens a terminal window there, while React had disabled menu items. Settings parity now wires those `Test` actions to the existing workspace terminal opener.
- `pnpm exec tsc --noEmit` passed on 2026-05-14.
- `pnpm test:frontend src/App.test.tsx -- --runInBand` passed on 2026-05-14: 101 tests.
- `pnpm test` passed on 2026-05-14: frontend 135 tests plus contract, data-integrity, capability, smoke and release-readiness scripts; release readiness remains blocked by the existing product acceptance gate.
- `pnpm build` passed on 2026-05-14.
- `git diff --check` passed on 2026-05-14.

### File List

- `_bmad-output/implementation-artifacts/9-7-settings-parity.md`
- `_bmad-output/implementation-artifacts/9-7-settings-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-7-settings-mobile-preview.png`
- `_bmad-output/implementation-artifacts/9-7-golutra-reference-settings-full.png`
- `_bmad-output/implementation-artifacts/9-7-golutra-reference-settings-avatar-menu.png`
- `_bmad-output/implementation-artifacts/9-7-golutra-reference-settings-custom-forms.png`
- `_bmad-output/implementation-artifacts/9-7-settings-full-parity-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-7-settings-avatar-menu-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-7-settings-custom-card-forms-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-7-settings-full-comparison.png`
- `_bmad-output/implementation-artifacts/9-7-settings-avatar-menu-comparison.png`
- `_bmad-output/implementation-artifacts/9-7-settings-custom-forms-comparison.png`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/App.test.tsx`
- `src/app/styles.css`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`

## Change Log

- 2026-05-13: Started Story 9.7 and completed the first Settings parity slice.
- 2026-05-14: Completed Settings parity follow-up for avatar menu, custom CLI/terminal cards, keybind rows, reference captures and regression validation.
