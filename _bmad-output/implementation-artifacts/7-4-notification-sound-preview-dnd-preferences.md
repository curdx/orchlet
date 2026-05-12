# Story 7.4: 通知、声音、预览与免打扰偏好

Status: done

## Story

As a user managing interruptions,
I want detailed notification preferences,
So that orchlet only interrupts me in the ways I choose.

## Acceptance Criteria

1. Given notification settings are open, when the user configures desktop notifications, sound, mentions-only, preview or DND windows, then the preferences are saved and applied to notification behavior.
2. Given DND time is active, when new notifications occur, then notification behavior follows the configured DND policy.
3. Given notification permissions are unavailable on a platform, when the user views settings, then the app shows the unavailable state and next action.

## Tasks / Subtasks

- [x] Task 1: Add persisted notification preferences storage and contracts (AC: 1-3)
  - [x] Add schema-versioned notification preference DTOs for desktop notifications, sound, mentions-only, message preview and DND time window.
  - [x] Persist notification preferences under app-data settings.
  - [x] Validate unsupported DND times and invalid persisted JSON with recoverable errors.
  - [x] Represent platform notification permission availability in the settings snapshot.

- [x] Task 2: Apply notification preferences in notification behavior (AC: 1-2)
  - [x] Load preferences before unread summary get/update command results.
  - [x] Suppress tray notification state while DND is active.
  - [x] Hide message previews when preview preference is disabled.
  - [x] Apply mentions-only filtering to notification unread conversations.

- [x] Task 3: Add notification settings UI (AC: 1, 3)
  - [x] Add controls for desktop notifications, sound, mentions-only and message preview.
  - [x] Add DND enable/start/end controls.
  - [x] Show unavailable notification permission state and next action.
  - [x] Save preferences through typed API methods.

- [x] Task 4: Add fixtures and tests (AC: 1-3)
  - [x] Add generated TypeScript bindings and contract/data-integrity fixtures.
  - [x] Add Rust tests for persistence, DND suppression, preview hiding and mentions-only filtering.
  - [x] Add frontend tests for settings controls, saved state and unavailable permission copy.
  - [x] Add data-integrity validation for notification preference storage.

- [x] Task 5: Verification and completion evidence (AC: 1-3)
  - [x] Run focused frontend tests for notification preferences.
  - [x] Run focused Rust notification/settings tests.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 7.4 owns local notification preferences and their current notification-preview/tray behavior. It does not implement OS-level notification delivery, notification scheduling daemons, shortcut configuration, CLI path configuration, chat terminal output preferences, or data repair operations.

### Product Policy

- Notification preferences are local app settings, not remote account preferences.
- No new network or account capability is introduced.
- If OS notification permission/adapter is unavailable, the settings UI must say so and keep other local notification preferences usable.
- DND suppresses notification interruption behavior but does not delete unread chat state.

### Current Implementation State

- `NotificationRuntimeState` stores unread summary, ignored conversations and pending navigation in memory.
- Notification unread updates are published from `WorkspaceSelectionPage` by mapping conversations with unread counts.
- `NotificationPreviewPage` renders unread summaries and notification navigation actions.
- There is no persisted notification preference store yet.
- Settings currently use the Profile settings modal; Story 7.4 can extend that existing settings surface instead of creating a new page.

### Technical Requirements

- Store notification preferences in app data, for example `settings/notifications.json`.
- Keep raw Tauri calls in `src/shared/api/*` and Rust gateway modules.
- Add typed commands for notification preference get/update.
- Keep storage schema versioned and covered by storage manifest/data-integrity fixtures.
- Apply message preview and DND behavior in Rust notification app/gateway logic so all windows receive consistent summaries.
- Browser fallback may keep in-memory notification preferences for UI tests only.

### Architecture Compliance

- Rust app-data storage remains authoritative.
- IPC payload fields use camelCase via serde/ts-rs.
- Notification runtime owns unread aggregation/tray/preview behavior.
- React pages consume typed notification API methods and should not import raw Tauri APIs.

### UX Requirements

- Desktop notifications, sound, mentions-only and message preview are binary toggles.
- DND enable reveals start/end time controls.
- Permission unavailable state must include a next action.
- Invalid save errors should preserve editable input.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/7-3-theme-language-switching.md`
- `src-tauri/src/app/notification/mod.rs`
- `src-tauri/src/contracts/notification.rs`
- `src-tauri/src/gateway/notification_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/app_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src/shared/api/notification-api.ts`
- `src/App.tsx`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`

### Previous Story Intelligence

- Story 7.3 established a reusable pattern for app-data settings JSON stores, storage manifest entries, data-integrity fixtures and browser preview cache separation.
- Story 7.3 also localized supported window shell labels; keep notification UI copy consistent with that style.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 7.4 acceptance criteria.
- `_bmad-output/planning-artifacts/prd.md` - FR66, NFR12, NFR31.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Settings Page "通知" controls and Notification Preview behavior.
- `_bmad-output/planning-artifacts/architecture.md` - notification service ownership and typed IPC boundary.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Story 7.4 created from sprint backlog, Epic 7 notification preference requirements, Settings UX notification controls and current notification runtime implementation.
- 2026-05-13: Implemented app-data `settings/notifications.json`, typed notification preference IPC, preference-aware unread summaries and settings UI controls.
- 2026-05-13: Validation passed: `pnpm test:frontend -- src/App.test.tsx`, notification Rust tests, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt --check`, `cargo check`, `cargo test`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Added schema-versioned local notification preferences with unavailable permission snapshot and recoverable validation for invalid JSON/DND times.
- Applied desktop notification, DND, message preview and mentions-only preferences inside the Rust notification runtime before emitting unread summaries.
- Extended the settings modal with notification controls and saved-state/permission unavailable feedback through typed API methods.
- Added contract fixtures, data-integrity fixtures, generated bindings, Rust coverage and frontend coverage for notification preference behavior.

### File List

- `_bmad-output/implementation-artifacts/7-4-notification-sound-preview-dnd-preferences.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/notification/notification-preferences-get.error.json`
- `fixtures/contracts/notification/notification-preferences-get.request.json`
- `fixtures/contracts/notification/notification-preferences-get.result.json`
- `fixtures/contracts/notification/notification-preferences-update.error.json`
- `fixtures/contracts/notification/notification-preferences-update.request.json`
- `fixtures/contracts/notification/notification-preferences-update.result.json`
- `fixtures/contracts/notification/notification-preferences.event.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/app-data/settings/notifications.json`
- `fixtures/schema/settings-v1/notification-preferences.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/notification.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/notification/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/notification.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/domain/notification/mod.rs`
- `src-tauri/src/gateway/notification_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/notification_preferences_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/notification.ts`
- `src/contracts/generated/settings.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/notification-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 7.4 context for notification, sound, preview and DND preferences.
- 2026-05-13: Completed notification preference persistence, runtime application, settings UI, fixtures and validation.
