# Story 5.3: 忽略全部未读通知

Status: done

## Story

As a user managing attention,
I want to dismiss all unread notifications,
So that I can clear notification pressure without changing stored message history.

## Acceptance Criteria

1. Given unread notifications are visible, when the user chooses ignore all, then notification preview and tray indicators clear for the ignored notification set.
2. Given notifications are ignored, when the user later opens the conversation, then message history remains available and read state follows the product policy.
3. Given ignore all fails to persist, when the error occurs, then the app shows a recoverable error instead of silently clearing UI state.

## Tasks / Subtasks

- [x] Task 1: Add typed ignore-all contract and runtime behavior (AC: 1-3)
  - [x] Add notification ignore-all request/result DTOs.
  - [x] Add a Tauri command that records the current ignored notification set and returns the filtered summary.
  - [x] Filter later unread summary updates by ignored conversation/update markers without changing chat read positions.
  - [x] Emit the existing unread summary event after successful ignore-all updates.

- [x] Task 2: Extend shared notification API and fixtures (AC: 1-3)
  - [x] Add `ignoreAllUnread` to the shared notification API with browser fallback.
  - [x] Keep raw Tauri `invoke`/`listen` calls inside shared API wrappers.
  - [x] Add contract fixtures for ignore-all request, result and recoverable error.
  - [x] Update generated TS/Rust binding coverage.

- [x] Task 3: Wire notification preview ignore-all UI (AC: 1, 3)
  - [x] Add an "ignore all" action to notification preview.
  - [x] Clear notification preview and tray display only after the command succeeds.
  - [x] Show a recoverable error if ignore-all fails.
  - [x] Preserve existing view-all, row navigation and member-terminal actions.

- [x] Task 4: Add focused tests (AC: 1-3)
  - [x] Test ignore-all clears notification preview and tray indicators.
  - [x] Test ignore-all does not mutate chat read state or message history.
  - [x] Test ignore-all failure leaves visible unread state and shows an error.
  - [x] Test ignored conversations can reappear when their updated timestamp advances.

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

Story 5.3 owns current-session ignore-all notification behavior only. It does not implement durable notification preferences, DND policy, OS notification cancellation, sound, notification history, diagnostics export or chat data repair. Ignore-all must not mark messages read or delete message history.

### Current Implementation State

- Story 5.1 added unread summary aggregation, tray-state snapshots and `notification-unread-changed`.
- Story 5.2 added notification navigation actions, pending navigation state and notification-preview actions for view-all, row click and member terminal opening.
- `WorkspaceSelectionPage` still owns chat read-position updates when messages are actually observed.
- `NotificationPreviewPage` displays unread summary from `notificationApi` and already has local error handling for failed notification actions.

### Technical Requirements

- Ignore-all should suppress only the current notification set. Use conversation id plus the unread summary conversation `updatedAtMs` as the current-session suppression marker so newer activity can notify again.
- The command should return a filtered `NotificationUnreadSummary` and emit the existing `notification-unread-changed` event.
- Do not call chat read-position APIs from notification preview.
- Browser fallback must mirror command behavior for Vitest and local web preview.
- Keep raw Tauri imports in `src/shared/api/*` only.

### Architecture Compliance

- New IPC payloads must live under `src-tauri/src/contracts` and generated TS contracts.
- New Tauri commands belong in `src-tauri/src/gateway`; app state remains under `src-tauri/src/app/notification`.
- Events remain state notifications, not request/response operations.
- Contract fixtures must stay honest about no durable OS notification behavior in this story.

### UX Requirements

- Notification preview footer should include "忽略全部" alongside existing view-all and per-row actions.
- Disable ignore-all when there are no visible unread notifications.
- On failure, keep the visible unread list and show an actionable recoverable error.
- Empty state remains "暂无未读会话" after successful ignore-all.

### Previous Story Intelligence

- Story 5.2 added `NotificationNavigationAction` and proved notification preview can call injected API facades in tests.
- Story 5.1 and 5.2 fixtures are already grouped under `fixtures/contracts/notification`.
- IPC boundary scans allow raw Tauri imports in shared API wrappers, not in pages/components.

### Relevant Files To Read Before Coding

- `src/App.tsx`
- `src/App.test.tsx`
- `src/shared/api/notification-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src-tauri/src/app/notification/mod.rs`
- `src-tauri/src/contracts/notification.rs`
- `src-tauri/src/gateway/notification_commands.rs`
- `src-tauri/src/lib.rs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 5.3 acceptance criteria and Epic 5 context.
- `_bmad-output/planning-artifacts/prd.md` - FR54 and NFR6.
- `_bmad-output/planning-artifacts/architecture.md` - typed IPC/event facade and notification domain ownership.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - notification preview ignore-all action and empty/error states.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: Story 5.3 created from sprint backlog, Epic 5 spec and Story 5.1/5.2 notification implementation.
- 2026-05-13: Added ignore-all contracts, runtime suppression markers, gateway command, generated bindings and shared API/browser fallback.
- 2026-05-13: Wired notification preview "忽略全部" to clear only after success and keep unread visible on recoverable failure.
- 2026-05-13: Added tests for successful clear, failure state and newer unread activity reappearing after ignore markers.
- 2026-05-13: Verified with `pnpm test:frontend -- src/App.test.tsx`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt --manifest-path src-tauri/Cargo.toml`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Added current-session ignore markers keyed by workspace/conversation and conversation `updatedAtMs`, so ignored notifications stay hidden until newer activity arrives.
- Notification preview now exposes "忽略全部", clears summary/tray only on successful command response and preserves the visible unread list with an error on failure.
- Ignore-all does not call chat read-position APIs or mutate message history; read state remains owned by the existing conversation/message observation flow.
- Contract fixtures now cover ignore-all request, result, recoverable error and emitted unread-summary event.

### File List

- `_bmad-output/implementation-artifacts/5-3-ignore-all-unread-notifications.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/notification/notification-ignore-all.error.json`
- `fixtures/contracts/notification/notification-ignore-all.event.json`
- `fixtures/contracts/notification/notification-ignore-all.request.json`
- `fixtures/contracts/notification/notification-ignore-all.result.json`
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
- `src/shared/api/notification-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 5.3 context for ignore-all unread notifications.
- 2026-05-13: Completed Story 5.3 ignore-all unread notification implementation, tests and verification.
