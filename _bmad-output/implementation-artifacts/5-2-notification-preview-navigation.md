# Story 5.2: 通知预览跳转

Status: done

## Story

As a user receiving notifications,
I want notification preview actions to take me to the relevant context,
So that I can respond quickly.

## Acceptance Criteria

1. Given there are unread conversations, when the user opens all unread from notification preview, then the main window opens the unread view for the active workspace.
2. Given a notification references a specific conversation, when the user activates it, then the main window opens that conversation.
3. Given a notification references a member terminal, when the user activates it, then the terminal window opens or focuses the corresponding member terminal.

## Tasks / Subtasks

- [x] Task 1: Add typed notification navigation contract and API facade (AC: 1-3)
  - [x] Add notification navigation action DTOs for all-unread, conversation and member-terminal targets.
  - [x] Add commands/events for dispatching and reading the latest pending navigation action.
  - [x] Extend the shared notification API with browser fallback, event subscription and cleanup.
  - [x] Keep raw Tauri `invoke`/`listen` calls inside shared API wrappers.

- [x] Task 2: Expose navigation targets from unread summary state (AC: 2-3)
  - [x] Include a member terminal target on unread conversation summaries when the conversation is a member private chat.
  - [x] Preserve existing unread aggregation behavior and tray state from Story 5.1.
  - [x] Update notification contract fixtures and generated bindings.

- [x] Task 3: Wire notification preview actions (AC: 1-3)
  - [x] Add a "view all unread" action in notification preview.
  - [x] Make unread conversation rows open the matching main-window conversation.
  - [x] Add per-conversation member terminal action only when a terminal member target exists.
  - [x] Surface action failures through existing app error/toast patterns without adding OS notification behavior.

- [x] Task 4: Apply notification navigation in main workspace (AC: 1-2)
  - [x] Main workspace reads pending notification navigation on mount.
  - [x] Main workspace subscribes to notification navigation events.
  - [x] All-unread navigation opens a compact unread conversation view for the active workspace.
  - [x] Conversation navigation selects the referenced conversation without requiring refresh.

- [x] Task 5: Add focused tests (AC: 1-3)
  - [x] Test notification preview "view all unread" dispatches navigation and main workspace enters unread view.
  - [x] Test notification preview row activation dispatches conversation navigation and main workspace selects it.
  - [x] Test member terminal action opens/focuses the corresponding terminal member.
  - [x] Test no raw Tauri usage appears outside shared API wrappers.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test:frontend -- src/App.test.tsx`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 5.2 owns current-session notification preview navigation only: opening all unread in the main workspace, selecting a specific conversation from notification preview and opening/focusing a referenced member terminal. It does not implement ignore-all behavior, durable notification preferences, OS notification delivery, sound, DND policy, notification history, diagnostics export or cross-workspace switching.

### Current Implementation State

- Story 5.1 added `NotificationUnreadSummary`, `NotificationUnreadConversation`, `NotificationTrayState`, `notification_unread_summary_get`, `notification_unread_summary_update`, `notification-unread-changed` and the shared `notificationApi`.
- `NotificationPreviewPage` currently loads unread summary, subscribes to unread summary changes and renders total unread, workspace identity, tray state and unread conversations.
- `WorkspaceSelectionPage` derives unread conversations from `ConversationProfile.unreadCount`, publishes the current summary and displays a compact workspace unread total.
- `WindowContextApi.openWindowMode("main")` can open or focus the main window through the existing typed facade.
- `terminalApi.openTerminal({ memberId })` already opens or focuses a member terminal session.

### Technical Requirements

- Use typed notification navigation commands/events rather than browser globals or component-to-component imports.
- Main-window navigation must work when the notification event fires before the main React tree has subscribed; keep a current-session pending action in the notification runtime state.
- Do not add a second unread source of truth; navigation targets should be derived from the existing unread summary and conversation state.
- Member-terminal actions must only appear when the notification summary carries a concrete member id.
- Keep raw Tauri imports in `src/shared/api/*` only.

### Architecture Compliance

- New IPC payloads must live under `src-tauri/src/contracts` and generated TS contracts.
- New Tauri commands belong in `src-tauri/src/gateway`; current-session notification state remains under `src-tauri/src/app/notification`.
- Frontend state should remain local component state plus TanStack Query data; do not introduce routing libraries for this story.
- Event topics stay kebab-case with a domain prefix.

### UX Requirements

- Notification preview rows must be keyboard-operable and show clear actions without overflowing compact preview dimensions.
- The main workspace unread view should be a small filter/state on the existing conversation list, not a new page or large layout refactor.
- If no unread conversations exist, the "view all unread" action should not create a misleading unread view.
- Existing notification-preview empty/loading/error behavior from Story 5.1 must remain truthful.

### Previous Story Intelligence

- Story 5.1 proved notification unread updates can coexist with terminal output rendering and established fixture coverage for notification contracts.
- Story 4.5 and 5.1 tests use injected API facades in `WorkspaceSelectionPage` and exported `NotificationPreviewPage`; follow that pattern for focused tests.
- IPC boundary scans allow raw Tauri imports in shared API wrappers, not in pages/components.

### Relevant Files To Read Before Coding

- `src/App.tsx`
- `src/App.test.tsx`
- `src/shared/api/notification-api.ts`
- `src/shared/api/window-context-api.ts`
- `src/shared/api/terminal-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src-tauri/src/app/notification/mod.rs`
- `src-tauri/src/contracts/notification.rs`
- `src-tauri/src/gateway/notification_commands.rs`
- `src-tauri/src/gateway/workspace_commands.rs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 5.2 acceptance criteria and Epic 5 context.
- `_bmad-output/planning-artifacts/prd.md` - FR53 and NFR6.
- `_bmad-output/planning-artifacts/architecture.md` - typed IPC/event facade, notification action ownership and window mode boundaries.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - notification preview actions, row click, open terminal and accessibility requirements.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: Story 5.2 created from sprint backlog, Epic 5 spec, Story 5.1 notification summary implementation and existing window/terminal APIs.
- 2026-05-12: Added typed notification navigation action contracts, pending-action runtime state, dispatch/pending commands, event emission and browser fallback API.
- 2026-05-12: Added `terminalMemberId` to unread conversation summaries for member-private terminal navigation targets.
- 2026-05-12: Wired notification preview "查看全部未读", row conversation activation and member terminal actions.
- 2026-05-12: Main workspace now loads pending notification navigation, subscribes to navigation events, opens unread filter view and selects target conversations.
- 2026-05-12: Verified with `pnpm test:frontend -- src/App.test.tsx`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt --manifest-path src-tauri/Cargo.toml`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Notification navigation is now a typed current-session state with `notification-navigation-requested` events and a pending-action read path for late main-window subscribers.
- Notification preview can open all unread in the main window, open a specific conversation and open member terminals for unread member-private notifications.
- Main workspace has a compact conversation filter for all/unread and applies notification navigation without a window refresh.
- Contract fixtures now cover notification unread summaries with terminal member targets plus navigation pending/dispatch request, result, error and event payloads.

### File List

- `_bmad-output/implementation-artifacts/5-2-notification-preview-navigation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/notification/notification-navigation-dispatch.error.json`
- `fixtures/contracts/notification/notification-navigation-dispatch.request.json`
- `fixtures/contracts/notification/notification-navigation-dispatch.result.json`
- `fixtures/contracts/notification/notification-navigation-pending-get.error.json`
- `fixtures/contracts/notification/notification-navigation-pending-get.request.json`
- `fixtures/contracts/notification/notification-navigation-pending-get.result.json`
- `fixtures/contracts/notification/notification-navigation.event.json`
- `fixtures/contracts/notification/notification-unread-summary-get.result.json`
- `fixtures/contracts/notification/notification-unread-summary-update.request.json`
- `fixtures/contracts/notification/notification-unread-summary-update.result.json`
- `fixtures/contracts/notification/notification-unread.event.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/notification.ts`
- `src-tauri/src/app/notification/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/notification.rs`
- `src-tauri/src/gateway/notification_commands.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/notification.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/notification-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 5.2 context for notification preview navigation.
- 2026-05-12: Completed Story 5.2 notification preview navigation implementation, tests and verification.
