# Story 4.3: 免打扰、忙碌队列与用户可见状态

Status: done

<!-- Note: Created after Story 4.2 completion to continue Epic 4 in sprint order. -->

## Story

As a user coordinating multiple members,
I want DND and busy members handled safely,
so that tasks are not lost or spammed.

## Acceptance Criteria

1. Given a target member is in do-not-disturb mode, when a task is dispatched, then dispatch is skipped and the message shows a visible skipped state.
2. Given a target member is busy, when a task is dispatched, then the task is queued and the user can see its queued status.
3. Given a busy member becomes available, when queued work resumes, then the next queued dispatch runs once and the message state updates.

## Tasks / Subtasks

- [x] Task 1: Add member status and queue/resume contracts (AC: 1-3)
  - [x] Add member status update request/result DTOs and Tauri command/API wrapper.
  - [x] Extend dispatch status contracts to include `queued` and `skipped`.
  - [x] Add queue resume request/result DTOs and Tauri command/API wrapper.
  - [x] Update contract fixtures and validators for new/changed IPC payloads.

- [x] Task 2: Implement DND skip and busy queue persistence (AC: 1-2)
  - [x] Persist skipped dispatches when target member status is `doNotDisturb` without opening a terminal.
  - [x] Persist queued dispatches when target member status is `working` without opening a terminal.
  - [x] Preserve existing dispatched/failed behavior for available members.

- [x] Task 3: Implement single queued dispatch resume (AC: 3)
  - [x] Add repository query for the oldest queued dispatch per workspace/member.
  - [x] Add orchestration app use case that resumes at most one queued dispatch for an available member.
  - [x] Mark resumed dispatch as dispatched or failed and report remaining queue count.

- [x] Task 4: Surface DND, queued and resume behavior in UI (AC: 1-3)
  - [x] Add member action menu controls to set online, working, do-not-disturb and offline status.
  - [x] Show skipped and queued dispatch states inline on the message.
  - [x] Trigger queue resume when a busy member is set back to online and update the message state.

- [x] Task 5: Add focused tests and contract fixtures (AC: 1-3)
  - [x] Add Rust tests for DND skipped dispatch, busy queued dispatch and single resume behavior.
  - [x] Add frontend tests for skipped state, queued state and online status resume update.
  - [x] Add/refresh contract fixtures for member status update and queue resume payloads.

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

Story 4.3 owns member DND/working dispatch decisions, visible skipped/queued message states, member status update controls and resuming exactly one queued dispatch when a member becomes available. Do not implement Story 4.4 dedupe/batching, Story 4.5 terminal output回写/chat stream, Epic 5 notifications, cancellation, queue reordering or background workers.

### Current Implementation State

- Story 4.2 is complete at commit `fd44232 Complete story 4.2 dispatch target resolution`.
- `MemberStatus` already supports `online`, `offline`, `working` and `doNotDisturb`, but there is no status update command or frontend control yet.
- `dispatch_chat_message` now resolves target member/reason before opening a terminal, and dispatch rows persist target source/reason.
- `DispatchRequestStatus` currently supports `pending`, `dispatched` and `failed`; queued/skipped need to be added.
- `WorkspaceSelectionPage` already stores per-message dispatch state locally and can render dispatching/dispatched/failed/selecting states.

### Technical Requirements

- Keep member status persistence in `member_repository`; expose it through `app/members`, `gateway/member_commands.rs` and `src/shared/api/member-api.ts`.
- Keep queue/resume orchestration in `app/orchestration` and `dispatch_repository`; gateway remains thin.
- DND skip and busy queue must create traceable dispatch rows linked to workspace, conversation, message and member ids.
- Queued resume must process the oldest queued dispatch for the member only once. Do not process the whole queue in this story.
- Resume must reuse the Story 4.1 terminal open/reuse and payload write path, including recoverable failure recording.
- Frontend must continue to use shared API wrappers only.

### Architecture Compliance

- No raw Tauri imports inside pages/components.
- Terminal runtime state remains Rust-owned; queued/resumed dispatch UI must not store terminal output chunks in React state.
- New IPC payloads require contract fixtures and TypeScript fixture checks.
- Queue behavior must avoid infinite duplicate dispatch attempts.

### UX Requirements

- Member status controls should live in the existing member action menu and use concise status labels.
- Skipped state should clearly say the target is in do-not-disturb and that no terminal dispatch occurred.
- Queued state should clearly say the target is busy/working and the task is waiting.
- When setting a member online resumes one queued dispatch, the related message should update to dispatched or failed.

### Previous Story Intelligence

- Story 4.2 established `targetResolution` as the backend-owned reason source for dispatch rows.
- Story 4.2 UI sends `memberId` only for explicit user target choice; automatic target resolution remains backend-owned.
- Story 4.1 terminal launch failures are persisted as failed dispatch results rather than thrown after dispatch creation.

### Relevant Files To Read Before Coding

- `src-tauri/src/contracts/member.rs`
- `src-tauri/src/contracts/orchestration.rs`
- `src-tauri/src/app/members/mod.rs`
- `src-tauri/src/app/orchestration/mod.rs`
- `src-tauri/src/gateway/member_commands.rs`
- `src-tauri/src/gateway/orchestration_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- `src/shared/api/member-api.ts`
- `src/shared/api/terminal-dispatch-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `src-tauri/tests/contract_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `fixtures/contracts/contract-fixtures.manifest.json`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 4.3 acceptance criteria and FR47/FR48.
- `_bmad-output/planning-artifacts/prd.md` - FR16, FR47, FR48, NFR11, NFR12, NFR26, NFR31 and NFR39.
- `_bmad-output/planning-artifacts/architecture.md` - orchestration service ownership, durable outbox and dispatch queue guidance.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - member status menu, DND/working labels and visible error/status states.
- `_bmad-output/implementation-artifacts/4-2-dispatch-target-resolution-context-selection.md` - current target resolution baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: Story 4.3 created from Epic 4 spec, Story 4.2 implementation and current member/orchestration code context.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` passed.
- 2026-05-12: `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` passed.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml app::orchestration -- --nocapture` passed.
- 2026-05-12: `pnpm test:frontend -- src/App.test.tsx` passed.
- 2026-05-12: `pnpm test:contracts` passed.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml` completed.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml --check` passed.
- 2026-05-12: `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-12: `pnpm test:data-integrity` passed.
- 2026-05-12: `pnpm build` passed with the existing Vite chunk size warning.
- 2026-05-12: `pnpm test` passed.
- 2026-05-12: IPC boundary scan showed Tauri imports confined to shared API modules plus expected test/enum-name matches.
- 2026-05-12: `pnpm tauri build` passed with the existing bundle identifier warning and Vite chunk size warning.

### Completion Notes List

- Added member status update DTOs, Rust command gateway, app use case and shared TypeScript API wrapper.
- Added queued/skipped dispatch statuses plus queue resume DTOs, command gateway and shared TypeScript API wrapper.
- DND targets now persist skipped dispatches without terminal launch; working targets persist queued dispatches without terminal launch.
- Queue resume now runs at most the oldest queued dispatch for an available member and reports remaining queue count.
- Member action menu can set online, working, do-not-disturb and offline; setting online resumes one queued dispatch and updates message state.
- Message UI now renders visible queued and skipped dispatch badges with user-facing explanations.
- Added Rust, frontend and contract fixture coverage for DND skip, busy queue and single queue resume.

### File List

- `_bmad-output/implementation-artifacts/4-3-dnd-busy-queue-visible-status.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/member/member-status-update.error.json`
- `fixtures/contracts/member/member-status-update.request.json`
- `fixtures/contracts/member/member-status-update.result.json`
- `fixtures/contracts/orchestration/dispatch-queue-resume.error.json`
- `fixtures/contracts/orchestration/dispatch-queue-resume.request.json`
- `fixtures/contracts/orchestration/dispatch-queue-resume.result.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/member.ts`
- `src-tauri/bindings/orchestration.ts`
- `src-tauri/src/app/members/mod.rs`
- `src-tauri/src/app/orchestration/mod.rs`
- `src-tauri/src/contracts/member.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/orchestration.rs`
- `src-tauri/src/gateway/member_commands.rs`
- `src-tauri/src/gateway/orchestration_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/member.ts`
- `src/contracts/generated/orchestration.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/member-api.ts`
- `src/shared/api/terminal-dispatch-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 4.3 context for DND skip, busy queue and visible dispatch status.
- 2026-05-12: Completed Story 4.3 DND skip, busy queue, single queue resume, UI status controls, tests and contract fixtures.
