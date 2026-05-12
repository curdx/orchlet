# Story 4.4: 重复派发识别与连续派发合并

Status: done

<!-- Note: Created after Story 4.3 completion to continue Epic 4 in sprint order. -->

## Story

As a user sending several related instructions,
I want orchlet to avoid duplicate or fragmented dispatches,
so that member terminals receive coherent work.

## Acceptance Criteria

1. Given the same message is submitted for dispatch more than once, when deduplication runs, then the app avoids creating duplicate active dispatches and reports the existing dispatch state.
2. Given several consecutive dispatchable messages share the same conversation, target and context window, when batching rules apply, then the app merges them into a single dispatch payload with traceable source message ids.
3. Given a merge would cross a target or context boundary, when batching rules evaluate it, then the app keeps dispatches separate.

## Tasks / Subtasks

- [x] Task 1: Add source-message traceability to dispatch contracts and persistence (AC: 1-3)
  - [x] Add `sourceMessageIds` to `DispatchRequestProfile` and regenerate TS bindings.
  - [x] Persist source message ids in `dispatch_requests` with a migration-safe default for existing rows.
  - [x] Update contract fixtures and validators for changed dispatch payloads.

- [x] Task 2: Implement duplicate active dispatch detection (AC: 1)
  - [x] Query active dispatches by source message id and target member before creating a new dispatch.
  - [x] Return the existing dispatch state without opening or writing to a terminal.
  - [x] Preserve failed/skipped retry behavior by excluding inactive statuses from dedupe.

- [x] Task 3: Implement consecutive message merge planning (AC: 2-3)
  - [x] Load the consecutive conversation window ending at the requested message.
  - [x] Include only source messages that resolve to the same target and have no active dispatch.
  - [x] Stop merging across target, conversation or context-window boundaries.
  - [x] Build a merged terminal payload that includes traceable source message ids.

- [x] Task 4: Apply merge payloads to immediate and queued dispatch paths (AC: 2-3)
  - [x] Store all merged source ids on pending, queued and skipped dispatch rows.
  - [x] Resume queued merged dispatches using the full stored source-message payload.
  - [x] Preserve existing DND skip, busy queue and available dispatch behavior.

- [x] Task 5: Add focused tests and contract fixture updates (AC: 1-3)
  - [x] Add Rust tests for duplicate dispatch reuse, same-target merge and target-boundary separation.
  - [x] Update contract fixture Rust and TypeScript checks for `sourceMessageIds`.
  - [x] Run existing frontend dispatch tests to verify UI compatibility with the new contract field.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture`.
  - [x] Run `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture`.
  - [x] Run `cargo test --manifest-path src-tauri/Cargo.toml app::orchestration -- --nocapture`.
  - [x] Run `pnpm test:frontend -- src/App.test.tsx`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `cargo fmt`, `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `pnpm build`.
  - [x] Run `pnpm test`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 4.4 owns duplicate active dispatch detection, source-message traceability and merge payload construction for consecutive same-target messages. Do not implement Story 4.5 terminal output-to-chat synchronization, background outbox workers, user-configurable batching windows, cancellation, queue reordering or notifications.

### Current Implementation State

- Story 4.3 is complete at commit `21e73bd Complete story 4.3 dispatch queue status`.
- `dispatch_chat_message` resolves the target before opening terminals and handles DND skipped, working queued and available dispatched/failed paths.
- `DispatchRequestProfile` currently points at one `messageId`; 4.4 needs a traceable list of source message ids while preserving the primary `messageId` for existing UI compatibility.
- `resume_member_dispatch_queue` currently reloads only `dispatch.message_id`; merged queued dispatches must reload all stored source messages.
- `WorkspaceSelectionPage` consumes `DispatchRequestProfile` status and does not need raw Tauri access.

### Technical Requirements

- Treat active duplicate statuses as `pending`, `queued` and `dispatched`; allow retry after `failed` and allow a new attempt after `skipped`.
- Store `sourceMessageIds` on every dispatch. For non-merged dispatches it must contain the primary `messageId`.
- Keep old rows migration-safe by deriving `[message_id]` when the stored JSON list is absent or empty.
- Define the merge context window conservatively as consecutive prior messages in the same conversation within five minutes of the requested message, stopping at the first target/context boundary.
- Resolve each candidate source message through the same backend target-resolution rules. Do not merge ambiguous or non-dispatchable messages.
- Merged payloads must preserve chronological order and include each source message id before its body.
- DND and working paths must persist the same source-message traceability as immediate dispatches.

### Architecture Compliance

- No raw Tauri imports inside pages/components.
- Gateway remains thin; orchestration app use case coordinates repository/domain behavior.
- Domain validation and target resolution stay backend-owned.
- SQLite migration changes stay inside dispatch repository migration handling.
- New/changed IPC payloads require regenerated TS bindings and contract fixture updates.

### UX Requirements

- Existing message dispatch states should continue to render from returned dispatch status without a frontend contract break.
- When a duplicate dispatch is submitted, returning the existing dispatch should keep the visible message state aligned with backend state.
- No new batching controls are required in this story.

### Previous Story Intelligence

- Story 4.3 established `queued` and `skipped` statuses and a single-dispatch resume path.
- Story 4.3 UI already maps backend dispatch profiles into local message state and can handle returned queued/skipped/dispatched/failed states.
- Story 4.1 terminal launch and input failures are persisted as failed dispatches instead of throwing after dispatch creation.

### Relevant Files To Read Before Coding

- `src-tauri/src/contracts/orchestration.rs`
- `src-tauri/src/app/orchestration/mod.rs`
- `src-tauri/src/domain/orchestration/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `src-tauri/tests/contract_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `fixtures/contracts/orchestration/dispatch-chat-message.result.json`
- `fixtures/contracts/orchestration/dispatch-queue-resume.result.json`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 4.4 acceptance criteria and FR49/FR50.
- `_bmad-output/planning-artifacts/prd.md` - FR49 and FR50.
- `_bmad-output/planning-artifacts/architecture.md` - orchestration service ownership, durable outbox, API boundary and SQLite repository guidance.
- `_bmad-output/implementation-artifacts/4-3-dnd-busy-queue-visible-status.md` - current queue/status baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: Story 4.4 created from Epic 4 spec, Story 4.3 implementation and current dispatch repository/orchestration code context.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml app::orchestration -- --nocapture` passed with duplicate, merge and boundary tests.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` passed.
- 2026-05-12: `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` passed.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml` completed.
- 2026-05-12: `pnpm test:contracts` passed.
- 2026-05-12: `pnpm test:frontend -- src/App.test.tsx` passed.
- 2026-05-12: `pnpm test:data-integrity` passed.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml --check` passed.
- 2026-05-12: `cargo check --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml` passed.
- 2026-05-12: `pnpm build` passed with the existing Vite chunk size warning.
- 2026-05-12: `pnpm test` passed.
- 2026-05-12: IPC boundary scan showed Tauri imports confined to shared API modules plus expected test/enum-name matches.
- 2026-05-12: `pnpm tauri build` passed with the existing bundle identifier warning and Vite chunk size warning.

### Completion Notes List

- Added `sourceMessageIds` to dispatch contracts, generated TypeScript bindings and orchestration fixtures.
- Persisted source-message id lists on dispatch rows with migration-safe fallback to `[message_id]` for old rows.
- Added active dispatch dedupe for `pending`, `queued` and `dispatched` statuses so repeated submissions return the existing dispatch without terminal writes.
- Added conservative consecutive-message merge planning for same conversation, same target and five-minute context window.
- Merged dispatch payloads preserve chronological order and include each source message id before the corresponding body.
- Queued merged dispatches resume using all stored source messages, while DND/working/available behavior from Story 4.3 remains intact.
- Added focused Rust coverage for duplicate reuse, same-target merge and target-boundary separation; existing frontend tests pass with the expanded contract.

### File List

- `_bmad-output/implementation-artifacts/4-4-deduplicate-dispatches-merge-consecutive-dispatches.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/orchestration/dispatch-chat-message.result.json`
- `fixtures/contracts/orchestration/dispatch-queue-resume.result.json`
- `src-tauri/bindings/orchestration.ts`
- `src-tauri/migrations/workspace/202605122000__dispatch_requests.sql`
- `src-tauri/src/app/orchestration/mod.rs`
- `src-tauri/src/contracts/orchestration.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/orchestration.ts`

## Change Log

- 2026-05-12: Created Story 4.4 context for dispatch dedupe, consecutive merge and source-message traceability.
- 2026-05-12: Completed Story 4.4 dispatch dedupe, same-target merge payloads, source-message persistence, tests and contract fixtures.
