# Story 9.11: Native tray lifecycle parity

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a desktop user,
I want the React/Tauri rebuild to use Golutra's native tray lifecycle,
So that unread notifications behave like the reference app instead of only updating an in-page preview.

## Acceptance Criteria

1. Given unread notifications are published from the main window, when the unread count is greater than zero and notification preferences allow interruption, then the native tray state switches to an unread visual state instead of only carrying an in-memory `NotificationTrayState`.
2. Given a sender avatar PNG is provided, when unread tray state is updated, then the tray uses the avatar image as the active unread icon and falls back to the Golutra unread icon when no avatar image is available.
3. Given the pointer enters or moves over the tray icon, when unread preview items exist, then a `notification-preview` window is shown near the tray with the existing Golutra-style React preview surface.
4. Given the pointer leaves the tray and the preview card is not hovered, when the Golutra hide delay elapses, then the preview window hides; hovering the preview cancels that hide until the pointer leaves it.
5. Given preview actions run, when users view all unread, open a conversation, open a member terminal or ignore all, then the preview hides first and existing navigation/ignore behavior remains wired.
6. Given the story is ready for review, when validation runs, then frontend tests, Rust contract/domain tests, `pnpm build`, release readiness validation and `git diff --check` pass structurally; release readiness may remain blocked for unrelated legacy data and packaged smoke evidence.

## Tasks / Subtasks

- [x] Task 1: Add native tray lifecycle surface (AC: 1, 2, 3, 4)
  - [x] Enable Tauri tray/image support and register a main tray icon during app setup.
  - [x] Add a Rust tray lifecycle adapter that can apply default, unread fallback, avatar and hidden/transparent icon states.
  - [x] Add hover/move/leave handling that opens or schedules hiding of the `notification-preview` window.

- [x] Task 2: Extend notification preview state contract (AC: 2, 3, 5)
  - [x] Extend notification update payloads with Golutra preview item metadata where the React app can provide it.
  - [x] Add optional sender/avatar/member-count fields without breaking existing unread-summary fixtures.
  - [x] Keep existing notification navigation and ignore-all API names stable unless a compatibility wrapper is required.

- [x] Task 3: Wire React preview hover and avatar publishing (AC: 2, 4, 5)
  - [x] Generate or forward avatar PNG bytes for the latest unread sender where available.
  - [x] Call dedicated preview hover/hide APIs from the React notification preview card.
  - [x] Hide the preview before view/open/ignore actions.

- [x] Task 4: Add focused tests and fixture coverage (AC: 1, 2, 4, 5, 6)
  - [x] Add Rust tests for tray-state decisions that do not require a live OS tray.
  - [x] Update contract fixtures/types for any payload additions.
  - [x] Add/adjust frontend tests for preview hover/hide calls and hidden-before-action behavior.

- [x] Task 5: Run validation and update release evidence (AC: 6)
  - [x] Run `pnpm test`.
  - [x] Run targeted Rust tests for notification lifecycle logic.
  - [x] Run `pnpm build`.
  - [x] Run `node scripts/validate-release-readiness.mjs`.
  - [x] Run `git diff --check`.
  - [x] Update Story 9.10 release gate/report/checklist status for native tray lifecycle if direct evidence supports it.

## Dev Notes

- `/Users/wdx/opc/golutra` remains the product master. The relevant reference files are:
  - `/Users/wdx/opc/golutra/src-tauri/src/ui_gateway/notification.rs`
  - `/Users/wdx/opc/golutra/src-tauri/src/ui_gateway/app.rs`
  - `/Users/wdx/opc/golutra/src/shared/tauri/notifications.ts`
  - `/Users/wdx/opc/golutra/src/stores/notificationOrchestratorStore.ts`
  - `/Users/wdx/opc/golutra/src/features/notifications/NotificationPreview.vue`
- Story 9.9 aligned the React preview visuals but documented a contract boundary: React rows only carried title/unread/preview/terminal member, while Golutra carries sender name, member count, sender avatar and native hover/hide IPC.
- Story 9.10 release gate lists native tray icon flashing, sender-avatar tray icon generation and hover-hide lifecycle as release blockers. This story targets that blocker only.
- Keep notification icon/avatar generation outside React render loops where possible. If browser-side canvas rendering is used, memoize by avatar key and send bytes only when the source avatar changes.
- Do not mark legacy `.golutra` data compatibility or three-platform packaged smoke as complete in this story. Those remain separate blockers unless direct evidence is produced.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm exec tsc --noEmit` — passed.
- `cargo test --manifest-path src-tauri/Cargo.toml app::notification` — passed; 12 notification tests.
- `pnpm test:frontend src/App.test.tsx -- --runInBand` — passed; 99 tests.
- `pnpm test:contracts` — passed; validated 80 contract fixture groups and Rust contract fixtures.
- `pnpm test` — passed; frontend, contracts, data-integrity, capabilities, smoke and release validators ran; release readiness reported `blocked`.
- `pnpm build` — passed; Vite emitted the existing >500 kB chunk warning.
- `node scripts/validate-release-readiness.mjs` — passed structurally; reported `validated MVP release readiness: blocked`.
- `git diff --check` — passed.

### Completion Notes List

- Added native Tauri tray registration and lifecycle handling for default, unread fallback, avatar and transparent blink icon states.
- Added tray enter/move/leave handling to show and hide the `notification-preview` window, plus React preview hover and hide-before-action IPC calls.
- Extended unread notification contracts with optional Golutra metadata and avatar PNG bytes while preserving existing fixture compatibility.
- Added browser-side avatar PNG rendering for CSS/avatar image sources used by unread sender metadata.
- Updated Story 9.10 release evidence so native tray lifecycle is no longer listed as an unported code blocker. Release readiness remains blocked for legacy `.golutra` data compatibility and missing packaged OS smoke evidence.

### File List

- `_bmad-output/implementation-artifacts/9-10-parity-release-gate.md`
- `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`
- `_bmad-output/implementation-artifacts/9-11-native-tray-lifecycle-parity.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/rebuild/feature-inventory.md`
- `docs/rebuild/parity-checklist.md`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/release/mvp-release-readiness.json`
- `src-tauri/Cargo.lock`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/icons/Transparency.png`
- `src-tauri/icons/icon-unread.png`
- `src-tauri/bindings/notification.ts`
- `src-tauri/src/app/notification/mod.rs`
- `src-tauri/src/contracts/notification.rs`
- `src-tauri/src/gateway/notification_commands.rs`
- `src-tauri/src/lib.rs`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/contracts/generated/notification.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/notification-api.ts`

## Change Log

- 2026-05-14: Created Story 9.11 from Story 9.10 release gate native tray blocker.
- 2026-05-14: Implemented native tray lifecycle parity, avatar publishing, preview hover/hide IPC and validation evidence; moved story to review.
