# Story 9.1: 建立 Golutra parity baseline

Status: done

<!-- Created after Golutra parity correction approval. This story establishes the source-based parity baseline that later UI implementation stories must use. It does not implement UI parity by itself. -->

## Story

As a product owner,
I want a concrete parity baseline from the reference Golutra app,
So that implementation agents stop relying on memory or feature categories when rebuilding the UI.

## Acceptance Criteria

1. Given the reference app lives at `/Users/wdx/opc/golutra`, when parity baseline is prepared, then screen inventory, component mapping, visual tokens and core interaction inventory are documented from source.
2. Given current React UI exists, when the baseline compares it to Golutra, then deviations are listed as parity bugs, approved exceptions or not-yet-captured items.
3. Given future parity stories begin, when they need screenshots, then baseline artifact defines required reference/current screenshot states and storage paths.

## Tasks / Subtasks

- [x] Task 1: Document reference screen inventory and component mapping (AC: 1)
  - [x] Identify window modes and top-level screens from Golutra source.
  - [x] Map Vue reference components to React parity targets.
  - [x] Include chat, terminal, settings, skill/plugin, notification and global shell surfaces.

- [x] Task 2: Extract visual and layout baseline (AC: 1)
  - [x] Record fonts, icon system, CSS variables, shell primitives and glass panel model.
  - [x] Record required layout structure for workspace selection, chat, terminal, settings, skill/plugin and notification preview.

- [x] Task 3: Compare current React UI against reference baseline (AC: 2)
  - [x] Record current shell/style/component-structure deviations as parity bugs.
  - [x] Identify the current aggregate `WorkspaceSelectionPage.tsx` surface as non-accepted UI scaffolding.

- [x] Task 4: Define screenshot baseline matrix and artifact paths (AC: 3)
  - [x] Define required reference/current screenshot states.
  - [x] Define screenshot storage paths for reference, current and review artifacts.
  - [x] Define parity exception policy.

## Dev Notes

### Scope Boundary

Story 9.1 creates the baseline and correction evidence. It does not implement the visual rewrite. Stories 9.2 through 9.10 consume this artifact and perform the actual parity implementation, screenshots and release gate validation.

### Primary Artifact

- `_bmad-output/planning-artifacts/golutra-parity-baseline-2026-05-13.md`

### Reference Files Read

- `/Users/wdx/opc/golutra/src/app/App.vue`
- `/Users/wdx/opc/golutra/src/features/WorkspaceSelection.vue`
- `/Users/wdx/opc/golutra/src/shared/components/SidebarNav.vue`
- `/Users/wdx/opc/golutra/src/styles/global.css`
- `/Users/wdx/opc/golutra/tailwind.config.cjs`
- `/Users/wdx/opc/golutra/src/features/chat/ChatInterface.vue`
- `/Users/wdx/opc/golutra/src/features/chat/components/ChatSidebar.vue`
- `/Users/wdx/opc/golutra/src/features/chat/components/ChatHeader.vue`
- `/Users/wdx/opc/golutra/src/features/chat/components/MessagesList.vue`
- `/Users/wdx/opc/golutra/src/features/chat/components/ChatInput.vue`
- `/Users/wdx/opc/golutra/src/features/chat/components/MembersSidebar.vue`
- `/Users/wdx/opc/golutra/src/features/chat/FriendsView.vue`
- `/Users/wdx/opc/golutra/src/features/terminal/TerminalWorkspace.vue`
- `/Users/wdx/opc/golutra/src/features/terminal/TerminalPane.vue`
- `/Users/wdx/opc/golutra/src/features/Settings.vue`
- `/Users/wdx/opc/golutra/src/features/SkillStore.vue`
- `/Users/wdx/opc/golutra/src/features/PluginMarketplace.vue`
- `/Users/wdx/opc/golutra/src/features/notifications/NotificationPreview.vue`

### Current React Files Compared

- `src/App.tsx`
- `src/app/styles.css`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/pages/terminal/TerminalPage.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: User approved Golutra parity correction with “开始吧”.
- 2026-05-13: Updated PRD, Architecture, UX specification and Epics to make Golutra UI and behavior parity release-blocking.
- 2026-05-13: Added Epic 9 backlog to sprint status and marked product acceptance as blocked by Golutra parity.
- 2026-05-13: Created source-based Golutra parity baseline artifact and deviation log.

### Completion Notes List

- Created a canonical baseline artifact covering screen inventory, visual tokens, component mapping, current React deviations, screenshot matrix and exception policy.
- The baseline confirms current React UI is not product-accepted and must be rebuilt around Golutra parity.
- Actual screenshot capture and UI rewrite are intentionally deferred to Stories 9.2-9.10.

### File List

- `_bmad-output/implementation-artifacts/9-1-golutra-parity-baseline.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/golutra-parity-baseline-2026-05-13.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-13-golutra-parity.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`

## Change Log

- 2026-05-13: Created and completed baseline story after approved correct-course proposal.
