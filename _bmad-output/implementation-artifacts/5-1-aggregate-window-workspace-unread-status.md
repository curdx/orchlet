# Story 5.1: 聚合窗口与工作区未读状态

Status: done

## Story

As a busy desktop user,
I want unread state aggregated across windows and workspaces,
So that I know where attention is needed.

## Acceptance Criteria

1. Given messages become unread in the current workspace, when unread aggregation runs, then main window, notification preview and tray state reflect the updated count.
2. Given the user reads a conversation, when read state changes, then unread aggregation updates without requiring a window refresh.
3. Given terminal output is streaming, when unread state changes, then notification aggregation does not block terminal rendering.

## Tasks / Subtasks

- [x] Task 1: Add typed unread aggregation contract and shared API facade (AC: 1-3)
  - [x] Add notification unread summary DTOs with workspace, conversation and tray-state fields.
  - [x] Add Tauri commands for reading/updating the current unread summary.
  - [x] Add a typed frontend notification API with browser fallback and subscription cleanup.
  - [x] Keep raw Tauri `invoke`/`listen` calls inside shared API wrappers.

- [x] Task 2: Publish current workspace unread changes from chat state (AC: 1-2)
  - [x] Aggregate unread totals from current `ConversationProfile.unreadCount`.
  - [x] Publish changes after conversation list updates and read-position updates.
  - [x] Display current workspace unread total in the main workspace surface.
  - [x] Ensure read state changes update the aggregate without requiring a window refresh.

- [x] Task 3: Replace notification-preview placeholder with real unread summary surface (AC: 1)
  - [x] Load the current unread summary when the notification-preview window opens.
  - [x] Subscribe to unread summary events and update the preview live.
  - [x] Render total unread, workspace identity, tray-state label and unread conversations.

- [x] Task 4: Add focused tests (AC: 1-3)
  - [x] Test unread aggregate publish and main window visible total.
  - [x] Test read-position updates republish a cleared unread count without refresh.
  - [x] Test notification preview reacts to unread summary events.
  - [x] Test terminal output subscription remains usable while unread aggregation updates.

- [x] Task 5: Verification and completion evidence (AC: 1-3)
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

Story 5.1 owns current-session unread aggregation and live cross-window visibility for the active workspace. It does not implement notification action routing, ignore-all behavior, durable notification preferences, OS notification delivery, sound, DND policy, unread repair tooling or diagnostics export; later Epic 5/7/8 stories own those.

### Current Implementation State

- `ConversationProfile` already exposes `unreadCount`, `lastMessagePreview`, `updatedAtMs` and `lastActivityAtMs`.
- `WorkspaceSelectionPage` already reads conversations via TanStack Query and updates read position when messages are observed.
- `WindowContextApi` already provides cross-window context events and `WindowMode` includes `notificationPreview`.
- `App.tsx` currently renders a truthful placeholder for notification-preview mode.
- No notification domain, shared notification API facade, unread event or tray-state snapshot exists yet.

### Technical Requirements

- Keep unread aggregation derived from existing conversation state in this story; do not add a second unread source of truth.
- Cross-window updates must go through typed shared API commands/events.
- Browser fallback must work for Vitest and local web preview.
- Tray state in this story is a typed snapshot (`unreadCount`, `badgeLabel`, `hasUnread`) exposed through the notification summary; do not add platform-specific tray APIs unless already available.
- Notification aggregation must be lightweight and must not store terminal output chunks or subscribe to terminal hot-path data.

### Architecture Compliance

- No raw Tauri imports inside pages/components.
- New IPC payloads must live under `src-tauri/src/contracts` and generated TS contracts.
- New Tauri commands belong in `src-tauri/src/gateway`; app state belongs under `src-tauri/src/app`.
- Frontend async state should remain TanStack Query plus narrow component state/subscriptions.

### UX Requirements

- Main workspace surface should show a compact total unread indicator without disturbing conversation list layout.
- Notification preview should show the active workspace, total unread count, tray badge label and a concise list of unread conversations.
- Empty state must be truthful when no unread conversations exist.
- UI text must fit compact notification-preview dimensions and remain keyboard-readable.

### Previous Story Intelligence

- Story 4.5 added terminal chat stream subscriptions with batched output and proved terminal output can remain responsive while unrelated UI state changes.
- `WorkspaceSelectionPage` now accepts injected API facades in tests; follow that pattern for notification API injection.
- IPC boundary scans allow raw Tauri imports in `src/shared/api/*`, not in page components.

### Relevant Files To Read Before Coding

- `src/App.tsx`
- `src/App.test.tsx`
- `src/shared/api/window-context-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/lib.rs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 5.1 acceptance criteria and Epic 5 context.
- `_bmad-output/planning-artifacts/prd.md` - FR52 and NFR6.
- `_bmad-output/planning-artifacts/architecture.md` - typed IPC/event facade, notification service ownership and terminal hot-path guidance.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - notification preview layout boundaries.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: Story 5.1 created from sprint backlog, Epic 5 spec, existing chat unread state and Story 4.5 terminal stream implementation.
- 2026-05-12: Added typed notification unread contracts, runtime state, gateway commands, generated TS bindings, shared frontend API and contract fixtures.
- 2026-05-12: Published workspace unread aggregates from chat conversation state and rendered the compact main-window unread indicator.
- 2026-05-12: Replaced notification-preview placeholder with live unread summary loading, event subscription and tray-state display.
- 2026-05-12: Added focused frontend tests for aggregate publish, read-position clearing, notification-preview event updates and terminal stream coexistence.
- 2026-05-12: Verified with `pnpm test:frontend -- src/App.test.tsx`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt --manifest-path src-tauri/Cargo.toml`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Added a current-session notification unread summary source owned by the Tauri app layer, with typed get/update commands and a live `notification-unread-changed` event.
- Workspace chat state now derives unread totals from `ConversationProfile.unreadCount`, republishes when read-position changes clear unread counts and shows the active workspace total.
- Notification preview now renders total unread, workspace identity, tray badge snapshot and unread conversation rows, including a truthful empty state.
- Browser fallback keeps Vitest and local web preview behavior deterministic without leaking raw Tauri calls outside shared API wrappers.

### File List

- `_bmad-output/implementation-artifacts/5-1-aggregate-window-workspace-unread-status.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/notification/notification-unread.event.json`
- `fixtures/contracts/notification/notification-unread-summary-get.error.json`
- `fixtures/contracts/notification/notification-unread-summary-get.request.json`
- `fixtures/contracts/notification/notification-unread-summary-get.result.json`
- `fixtures/contracts/notification/notification-unread-summary-update.error.json`
- `fixtures/contracts/notification/notification-unread-summary-update.request.json`
- `fixtures/contracts/notification/notification-unread-summary-update.result.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/app/notification/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/notification.rs`
- `src-tauri/bindings/notification.ts`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/gateway/notification_commands.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/notification.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/index.ts`
- `src/shared/api/notification-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 5.1 context for unread aggregation across workspace, notification preview and tray-state snapshot.
- 2026-05-12: Completed Story 5.1 unread aggregation implementation, tests and verification.
