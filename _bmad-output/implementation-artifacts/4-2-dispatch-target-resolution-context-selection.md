# Story 4.2: 派发目标解析与上下文选择

Status: done

<!-- Note: Created after Story 4.1 completion to continue Epic 4 in sprint order. -->

## Story

As a chat user,
I want the app to choose the correct dispatch target,
so that tasks do not go to the wrong assistant or shell.

## Acceptance Criteria

1. Given a message contains one or more member mentions, when dispatch target resolution runs, then the app chooses explicit mentions before fallback context.
2. Given no explicit mention exists, when conversation context identifies a private member or default target, then the app selects that target and records the reason.
3. Given target resolution is ambiguous, when the user dispatches, then the UI asks for target selection instead of guessing silently.

## Tasks / Subtasks

- [x] Task 1: Add target resolution contract and persistence metadata (AC: 1-3)
  - [x] Add typed target resolution source/profile DTOs to orchestration contracts and regenerate TypeScript bindings.
  - [x] Extend dispatch persistence with target source and human-readable reason fields without breaking existing dispatch rows.
  - [x] Update dispatch contract fixtures and fixture validators for the new target resolution profile.

- [x] Task 2: Implement backend target resolution rules (AC: 1-3)
  - [x] Resolve explicit `memberId` selection first and validate it is terminal-capable.
  - [x] Resolve exactly one explicit mentioned terminal-capable member before any fallback context.
  - [x] Resolve no-mention private member conversations and single terminal-capable default candidates with recorded reasons.
  - [x] Return recoverable ambiguous/target-required errors instead of silently guessing when multiple candidates or no terminal-capable candidate exists.

- [x] Task 3: Wire dispatch use case to record resolution reason (AC: 1-2)
  - [x] Load conversation and member context inside the orchestration app layer.
  - [x] Create pending dispatch rows with the resolved member id, target source and reason.
  - [x] Preserve Story 4.1 terminal open/reuse, payload write and recoverable failure behavior.

- [x] Task 4: Add UI target selection behavior (AC: 1-3)
  - [x] Show dispatch controls for auto-resolvable mentioned, private-conversation or default targets.
  - [x] When resolution is ambiguous, show compact per-message target choices instead of dispatching to the first candidate.
  - [x] Send `memberId` only for explicit user target selection; let backend record mention/private/default fallback reasons for automatic resolution.

- [x] Task 5: Add focused tests and contract fixtures (AC: 1-3)
  - [x] Add Rust tests for explicit mention priority, private/default fallback reason recording and ambiguous target errors.
  - [x] Add frontend tests for private/default dispatch and ambiguous target selection UI.
  - [x] Update TypeScript contract fixture checks for target resolution fields.

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

Story 4.2 owns target resolution only: explicit member selection, explicit mention priority, no-mention private/default context fallback, reason recording and ambiguous target selection UI. Do not implement Story 4.3 DND or busy queue, Story 4.4 dedupe/batching, Story 4.5 terminal output回写/chat stream, Epic 5 notifications or Epic 7 default-target settings UI.

### Current Implementation State

- Story 4.1 is complete at commit `a9bcbeb Complete story 4.1 chat terminal dispatch`.
- `src-tauri/src/app/orchestration/mod.rs` currently dispatches by explicit `memberId` or a single mentioned member only.
- `src-tauri/src/domain/orchestration/mod.rs` currently returns `dispatch.target.required` when there is no explicit single target.
- Dispatch rows persist workspace, conversation, message, member, status, terminal session and recoverable failure details, but not target resolution source/reason yet.
- `WorkspaceSelectionPage` currently renders dispatch buttons only for persisted messages with exactly one terminal-capable mentioned member.
- Conversation profiles already expose `kind`, `participantKind`, `participantId` and group `members`; member profiles expose runtime kind/command, which is enough to determine terminal-capable candidates.

### Technical Requirements

- Keep orchestration target resolution in `src-tauri/src/domain/orchestration` and app coordination in `src-tauri/src/app/orchestration`.
- Add target resolution DTOs to `src-tauri/src/contracts/orchestration.rs`, export them to `src/contracts/generated/orchestration.ts` and `src-tauri/bindings/orchestration.ts`.
- Persist resolution metadata in `dispatch_requests` with nullable/default-safe migration behavior so Story 4.1 rows remain readable.
- Terminal-capable means runtime kind is not `none` and command is non-empty; apply this in backend resolution, not only in React helpers.
- Resolution order for automatic dispatch:
  1. user-selected `memberId` from an ambiguous UI choice,
  2. exactly one explicit mentioned terminal-capable member,
  3. private conversation whose participant is a terminal-capable workspace member,
  4. exactly one terminal-capable member in the conversation group,
  5. exactly one terminal-capable member in the workspace as the MVP default target fallback.
- If multiple terminal-capable mentioned members or fallback candidates remain, return a recoverable ambiguous-target error with candidate ids in details. Do not dispatch to the first candidate.
- If no terminal-capable target exists, return a recoverable target-required error.

### Architecture Compliance

- `src/shared/api` remains the only frontend Tauri boundary. Components must not import `invoke`, `listen`, `Channel`, Tauri window APIs or plugin APIs directly.
- Gateway code stays thin; target resolution logic belongs in domain/app orchestration.
- SQLite access stays inside infrastructure repository modules.
- Terminal runtime state remains Rust-owned; dispatch UI must not store terminal output chunks in React state.
- New IPC payload fields must have JSON fixtures and TS fixture checks.

### UX Requirements

- Per-message controls remain compact and attached to the message.
- For auto-resolved targets, button text should name the target and state the context clearly enough for the user to trust it.
- For ambiguous targets, show a small inline selector with terminal-capable member choices and a neutral cancel/dismiss path if needed; do not toast-only the ambiguity.
- Failed dispatch state continues to show backend recoverable action and keeps the message visible.

### Previous Story Intelligence

- Story 4.1 established `terminal-dispatch-api.ts` as the frontend IPC wrapper and `orchestration_dispatch_chat_message` as the gateway command.
- Story 4.1 kept failure persistence recoverable and returned failed dispatch results instead of throwing when terminal startup/input fails.
- Story 4.1 tests use `App.test.tsx` workspace integration coverage and app-layer Rust tests with `TerminalRuntimeState::with_launcher`.
- Story 3.6 confirms terminal output must remain outside React state and launch errors must include actionable `userAction`.

### Relevant Files To Read Before Coding

- `src-tauri/src/contracts/orchestration.rs`
- `src-tauri/src/app/orchestration/mod.rs`
- `src-tauri/src/domain/orchestration/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`
- `src/shared/api/terminal-dispatch-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `src-tauri/tests/contract_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/orchestration/*`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 4.2 acceptance criteria and FR46.
- `_bmad-output/planning-artifacts/prd.md` - FR46, NFR3, NFR4, NFR11, NFR12, NFR26, NFR31, NFR35 and NFR39.
- `_bmad-output/planning-artifacts/architecture.md` - orchestration service ownership, durable outbox target resolution flow and IPC boundary rules.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - chat member mention, member terminal, ambiguity/error state and terminal output state guidance.
- `_bmad-output/implementation-artifacts/4-1-dispatch-chat-message-to-member-terminal.md` - current dispatch vertical slice and verification baseline.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: Story 4.2 created from Epic 4 spec, Story 4.1 implementation and current orchestration/chat code context.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml app::orchestration -- --nocapture` - pass.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` - pass and regenerated frontend orchestration TypeScript contracts.
- 2026-05-12: `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts:: -- --nocapture` - pass and regenerated Tauri-side orchestration bindings.
- 2026-05-12: `pnpm test:frontend -- src/App.test.tsx` - pass.
- 2026-05-12: `pnpm test:contracts` - pass.
- 2026-05-12: `pnpm test:data-integrity` - pass.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `cargo fmt --manifest-path src-tauri/Cargo.toml --check` - pass.
- 2026-05-12: `cargo check --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `cargo test --manifest-path src-tauri/Cargo.toml` - pass.
- 2026-05-12: `pnpm build` - pass; Vite reported existing chunk-size warning.
- 2026-05-12: `pnpm test` - pass.
- 2026-05-12: IPC boundary scan - reviewed expected shared API/Tauri boundary references and Rust `ConversationKind::Channel` enum usage only.
- 2026-05-12: `pnpm tauri build` - pass; Tauri reported existing bundle identifier warning and Vite reported existing chunk-size warning.

### Completion Notes List

- Added target resolution source/profile contracts, generated bindings and contract fixtures for orchestration dispatch results.
- Persisted dispatch target source and reason in `dispatch_requests`, with compatibility handling for existing dispatch tables.
- Implemented backend target resolution for explicit user selection, explicit mention priority, private conversation fallback, conversation default fallback and workspace default fallback.
- Added recoverable ambiguous/target-required errors so backend does not silently guess when multiple target candidates exist.
- Updated chat UI to auto-dispatch resolvable messages, inline-select ambiguous target candidates and send `memberId` only for explicit user choices.
- Added Rust and frontend coverage for explicit mention priority, private/default fallback reason recording and ambiguous target selection.

### File List

- `_bmad-output/implementation-artifacts/4-2-dispatch-target-resolution-context-selection.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/orchestration/dispatch-chat-message.error.json`
- `fixtures/contracts/orchestration/dispatch-chat-message.request.json`
- `fixtures/contracts/orchestration/dispatch-chat-message.result.json`
- `src-tauri/bindings/orchestration.ts`
- `src-tauri/migrations/workspace/202605122000__dispatch_requests.sql`
- `src-tauri/src/app/orchestration/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/orchestration.rs`
- `src-tauri/src/domain/orchestration/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/dispatch_repository.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/orchestration.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 4.2 context for dispatch target resolution and ambiguous target selection.
- 2026-05-12: Implemented dispatch target resolution contracts, persistence metadata, backend resolver rules, UI target selection and verification coverage.
