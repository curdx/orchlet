# Story 9.4: Chat interface parity

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a user,
I want the post-open workspace chat interface to match Golutra,
So that the React app remains the same product after replacing the Vue implementation.

## Acceptance Criteria

1. Given a workspace is open, when the main chat view renders, then ChatSidebar, ChatHeader, MessagesList, ChatInput and MembersSidebar match Golutra layout, density, typography, color, iconography and responsive behavior.
2. Given conversations, messages and members load from the existing React/Tauri contracts, when a user selects conversations or sends messages, then the visible state and functional flow remain compatible with the implemented backend behavior.
3. Given browser preview is used outside Tauri, when a seeded recent workspace is opened, then the parity chat workbench can be visually inspected with representative conversations, messages and members.
4. Given desktop and mobile screenshots are captured, when the current React screen is reviewed against Golutra reference behavior, then no blocking visual defects remain without an approved parity exception.

## Tasks / Subtasks

- [x] Task 1: Add Golutra-style chat workbench bridge (AC: 1, 2)
  - [x] Route the App post-open workspace surface to `ChatWorkbenchParity` instead of the old aggregate page when `parityWorkbench` is enabled.
  - [x] Render compact channel/direct-message sidebar, centered chat header actions, message stream, input toolbar and right members sidebar using current React contract data.
  - [x] Preserve existing conversation selection and send-message handlers.

- [x] Task 2: Match responsive chat styling (AC: 1, 4)
  - [x] Add `.chat-workbench-parity` CSS for desktop three-column layout, mobile compact sidebar, glass panels, Material Symbols buttons, owner message bubble and member status dots.
  - [x] Add mobile bottom-nav clearance matching Golutra `pb-16 md:pb-0` behavior.
  - [x] Reduce ChatInput to a single-line starting height and keep the input row visible above mobile nav.
  - [x] Auto-scroll the message list to the latest message on conversation/message changes.

- [x] Task 3: Add browser preview data for visual inspection (AC: 3)
  - [x] Extend browser fallback `workspace_open`, recent workspaces, members, conversations, messages, read-position update and send-message commands.
  - [x] Keep default browser state empty unless a recent workspace is seeded or a workspace is opened, preserving existing app entry tests.

- [x] Task 4: Complete full Golutra chat feature parity (AC: 2, 4)
  - [x] Port Golutra conversation action menus: pin, rename, mute, clear and delete.
  - [x] Port ChatInput mention suggestions, emoji panel, quick prompts and attachment handling to the parity workbench instead of relying on the old aggregate panels.
  - [x] Port members drawer/member action menus and invite modal parity.
  - [x] Capture matching Golutra reference screenshots for pixel-level comparison.

## Dev Notes

This story remains in progress. The main chat surface now visually matches Golutra far more closely and is usable in browser preview, but full interaction parity still requires the conversation menus, rich input overlays and member/invite modal flows.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Read Golutra `ChatInterface.vue`, `ChatSidebar.vue`, `ChatHeader.vue`, `MessagesList.vue`, `ChatInput.vue` and `MembersSidebar.vue`.
- 2026-05-13: Added `ChatWorkbenchParity` to the React workspace selection page as the App post-open workbench.
- 2026-05-13: Added chat workbench CSS and corrected mobile bottom-nav clearance after browser screenshot review.
- 2026-05-13: Added browser fallback data to inspect post-open chat UI without Tauri.
- 2026-05-14: Completed Task 4 conversation menus, rich input overlays, full Golutra emoji data, members/invite parity flows and reference screenshot comparisons.

### Completion Notes List

- `pnpm exec tsc --noEmit` passed.
- `pnpm test:frontend src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` passed with 112 tests.
- `pnpm test:contracts` passed.
- `pnpm test:data-integrity` passed.
- `pnpm test` passed across frontend, contracts, data-integrity, capabilities, smoke and release readiness validators; release readiness validator reports the existing MVP release gate as blocked while exiting successfully.
- `pnpm build` passed with the existing Vite large chunk warning.
- `git diff --check` passed.
- Desktop, mobile, emoji panel, conversation menu, member menu and invite flow previews captured under `_bmad-output/implementation-artifacts/9-4-*.png`.
- Matching Golutra reference screenshots captured with a read-only browser IPC stub for chat, emoji, conversation menu and mobile reference states.

### File List

- `_bmad-output/implementation-artifacts/9-4-chat-interface-parity.md`
- `_bmad-output/implementation-artifacts/9-4-chat-interface-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-4-chat-interface-mobile-preview.png`
- `_bmad-output/implementation-artifacts/9-4-chat-input-emoji-preview.png`
- `_bmad-output/implementation-artifacts/9-4-chat-conversation-menu-preview.png`
- `_bmad-output/implementation-artifacts/9-4-chat-member-menu-preview.png`
- `_bmad-output/implementation-artifacts/9-4-chat-invite-menu-preview.png`
- `_bmad-output/implementation-artifacts/9-4-chat-assistant-invite-modal-preview.png`
- `_bmad-output/implementation-artifacts/9-4-golutra-reference-chat-interface.png`
- `_bmad-output/implementation-artifacts/9-4-golutra-reference-chat-emoji.png`
- `_bmad-output/implementation-artifacts/9-4-golutra-reference-conversation-menu.png`
- `_bmad-output/implementation-artifacts/9-4-golutra-reference-chat-mobile.png`
- `_bmad-output/implementation-artifacts/9-4-chat-interface-comparison.png`
- `_bmad-output/implementation-artifacts/9-4-chat-emoji-comparison.png`
- `_bmad-output/implementation-artifacts/9-4-chat-conversation-menu-comparison.png`
- `_bmad-output/implementation-artifacts/9-4-chat-mobile-comparison.png`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/app/styles.css`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/pages/workspace-selection/ui/golutra-emoji-data.ts`
- `src/shared/api/client.ts`

## Change Log

- 2026-05-13: Started Story 9.4 and completed the first chat workbench parity slice.
- 2026-05-14: Completed chat interaction parity and moved story to review.
