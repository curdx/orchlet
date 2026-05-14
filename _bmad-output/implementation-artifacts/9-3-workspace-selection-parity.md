# Story 9.3: WorkspaceSelection parity

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a user,
I want the workspace selection screen to match Golutra,
So that opening projects feels familiar and trustworthy.

## Acceptance Criteria

1. Given no workspace is open, when WorkspaceSelection renders, then open-folder hero card, recent workspace grid, more dropdown/search, empty state, error toast and background treatment match Golutra.
2. Given a directory is opened or a recent workspace is selected, when the backend returns success, read-only fallback or registry conflict, then the flow remains functional and the visible states match Golutra where old behavior exists.
3. Given screenshots are captured, when reference and React screenshots are compared, then no intentional visual deviation remains without an approved parity exception.

## Tasks / Subtasks

- [x] Task 1: Port the no-workspace landing layout (AC: 1)
  - [x] Replace the old light green entry panel with Golutra-style glass open-folder card.
  - [x] Add ambient glow background, Material Symbols icons, uppercase recent header, empty state and primary recent cards.
  - [x] Add Golutra-style More dropdown/search for overflow recent workspaces.

- [x] Task 2: Preserve existing functional entry flows (AC: 2)
  - [x] Keep `pickAndOpenWorkspace`, `openWorkspace`, conflict modal and browser fallback toast behavior wired.
  - [x] Keep direct component compatibility controls available for existing context/data-integrity tests while hiding them from the App shell landing surface.

- [x] Task 3: Replace post-open workspace bridge (AC: 2)
  - [x] After a workspace opens, route to Golutra-style chat/workbench instead of the old aggregate React page.
  - [x] Match read-only fallback, opened workspace and registry-conflict visible states against Golutra or document approved exceptions.

- [x] Task 4: Capture final reference/current screenshot comparison (AC: 3)
  - [x] Captured current browser preview at `_bmad-output/implementation-artifacts/9-3-workspace-selection-browser-preview.png`.
  - [x] Capture matching Golutra reference screenshot and compare after bridge removal.

## Dev Notes

This story is in progress. The initial no-workspace landing now follows Golutra much more closely, but post-open workspace behavior still falls through to the previous aggregate React page and must be replaced by later parity stories.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Read `/Users/wdx/opc/golutra/src/features/WorkspaceSelection.vue` and mapped its visible states to the React workspace entry data.
- 2026-05-13: Reworked the React no-workspace landing into Golutra-style open-folder hero, recent section and More search menu.
- 2026-05-13: Updated App tests that asserted the previous non-parity `orchlet` heading and always-visible workspace debug controls.
- 2026-05-14: Verified App shell post-open routing now uses `parityWorkbench` and added regression coverage proving opened workspaces render `Chat workspace` instead of the old aggregate `工作区已打开` card.
- 2026-05-14: Added parity-workbench read-only fallback coverage; the shell view shows the Golutra-style workbench banner while the direct component keeps legacy compatibility details for older tests.
- 2026-05-14: Aligned English workspace-selection copy with Golutra i18n (`Open Folder`, `Pick a folder...`, empty hint and no-results copy).
- 2026-05-14: Captured final React and Golutra workspace-selection screenshots at the same viewport and generated a side-by-side comparison; RMSE was 3771.31 (0.0575465). Remaining visual difference is structural chrome/runtime rendering, not an intentional workspace-selection content deviation.
- 2026-05-14: Documented registry-conflict behavior as a retained React compatibility modal because Golutra has no matching registry-conflict reference state.

### Completion Notes List

- `pnpm build` passed after the WorkspaceSelection rewrite.
- `pnpm test:frontend src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` passed with 107 tests.
- `pnpm exec tsc --noEmit` passed.
- `pnpm test:frontend src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` passed with 110 tests.
- `pnpm build` passed with the existing Vite large chunk warning.
- `git diff --check` passed.

### File List

- `_bmad-output/implementation-artifacts/9-3-workspace-selection-parity.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/app/styles.css`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `_bmad-output/implementation-artifacts/9-3-workspace-selection-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-3-workspace-selection-final-preview.png`
- `_bmad-output/implementation-artifacts/9-3-golutra-reference-workspace-selection.png`
- `_bmad-output/implementation-artifacts/9-3-workspace-selection-comparison.png`

## Change Log

- 2026-05-13: Started Story 9.3 and completed the no-workspace landing parity slice.
- 2026-05-14: Completed Story 9.3 by validating post-open parity workbench routing, aligning workspace-selection copy, adding regression tests and capturing final React/Golutra comparison artifacts.
