# Story 4.5: 终端输出回写聊天流与状态同步

Status: done

<!-- Note: Created after Story 4.4 completion to finish Epic 4 in sprint order. -->

## Story

As a collaborator,
I want terminal output and task state to return to chat,
so that I can follow assistant work without staying in the terminal.

## Acceptance Criteria

1. Given a dispatched terminal emits output, when output events arrive, then the app renders them as configured chat messages or chat stream entries in sequence order.
2. Given terminal status changes, when a session starts, exits or fails, then chat message status and member status update consistently.
3. Given terminal output volume is high, when the UI receives stream events, then output remains observable without blocking chat input, window switching or terminal input.

## Tasks / Subtasks

- [x] Task 1: Subscribe workspace chat surface to terminal output/status events (AC: 1-3)
  - [x] Extend the workspace page terminal API contract to use shared `subscribeOutput` and `subscribeStatus`.
  - [x] Ignore events outside the active workspace.
  - [x] Clean up subscriptions when the workspace page unmounts or workspace changes.

- [x] Task 2: Render ordered chat stream entries without high-frequency React churn (AC: 1, 3)
  - [x] Buffer terminal output events outside React state and flush in batches.
  - [x] Sort buffered chunks by sequence before appending.
  - [x] Keep rendered stream text bounded while preserving latest observable output.
  - [x] Display source member/session metadata with the stream entry.

- [x] Task 3: Surface terminal status in chat/member views (AC: 2)
  - [x] Track terminal status events by session and member.
  - [x] Show terminal running/exited status near the chat stream entry.
  - [x] Show member terminal status in the member list without overwriting manual member status.

- [x] Task 4: Add focused frontend tests (AC: 1-3)
  - [x] Test ordered chat stream rendering from output events.
  - [x] Test terminal status event updates member terminal status.
  - [x] Test batched output remains bounded and visible.

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

Story 4.5 owns current-session terminal output visibility in chat and terminal status reflection in chat/member views. It does not implement durable terminal-output-to-message persistence, semantic output parsing, unread/notification aggregation, cancellation or notification preview routing; those belong to later epics.

### Current Implementation State

- Story 4.4 is complete at commit `da5b613 Complete story 4.4 dispatch dedupe merge`.
- Terminal events already exist as shared API subscriptions: `terminalApi.subscribeOutput` and `terminalApi.subscribeStatus`.
- `TerminalPage` writes output chunks directly to renderer adapters and avoids React array state for high-frequency terminal output.
- `WorkspaceSelectionPage` already receives `terminalApi` but currently only uses `openTerminal`.
- Dispatch message status already updates from dispatch command results; terminal status events should add runtime visibility without mutating manual member status.

### Technical Requirements

- Keep raw Tauri event listeners inside `src/shared/api/terminal-api.ts`; page code must use the shared API wrapper.
- Buffer output events in refs/maps and flush batched updates into React state.
- Sort chunks by `seq` within a flush and ignore duplicate/out-of-order chunks already rendered for a session.
- Limit retained chat stream text per terminal session to prevent unbounded memory growth.
- Filter events by active workspace id.
- Display terminal session status separately from `MemberStatus` so manual online/working/DND/offline status remains authoritative.

### Architecture Compliance

- No raw Tauri imports inside pages/components.
- High-frequency terminal output must not be stored chunk-by-chunk in React state.
- Terminal runtime state remains Rust-owned; frontend renders event snapshots only.
- New behavior should not require IPC contract changes.

### UX Requirements

- Chat stream entries should be compact, readable and visually distinct from user chat messages.
- Member list should show terminal runtime status with text, not only color.
- Output text must preserve whitespace and stay bounded inside the chat panel.

### Previous Story Intelligence

- Story 4.4 dispatches may merge multiple source messages into one terminal payload; chat stream entries are session/member scoped rather than per-source-message persistent records.
- Story 4.3 added visible queued/skipped/dispatched/failed states; 4.5 should not regress those badges.
- TerminalPage already demonstrates the correct shared subscription API and cleanup pattern.

### Relevant Files To Read Before Coding

- `src/shared/api/terminal-api.ts`
- `src/pages/terminal/TerminalPage.tsx`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 4.5 acceptance criteria and FR32/FR51.
- `_bmad-output/planning-artifacts/prd.md` - FR32, FR51, NFR4 and NFR5.
- `_bmad-output/planning-artifacts/architecture.md` - terminal stream/backpressure and API boundary guidance.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - chat/terminal output visibility and high-frequency output guidance.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: Story 4.5 created from Epic 4 spec, Story 4.4 implementation and existing terminal subscription code.
- 2026-05-12: Implemented workspace chat terminal stream subscriptions with active-workspace filtering, batched output flushing, ordered sequence append and bounded retained text.
- 2026-05-12: Added member/session terminal runtime status display without mutating manual `MemberStatus`.
- 2026-05-12: Verification passed: `pnpm test:frontend -- src/App.test.tsx`; `pnpm test:contracts`; `pnpm test:data-integrity`; `cargo fmt --manifest-path src-tauri/Cargo.toml`; `cargo fmt --manifest-path src-tauri/Cargo.toml --check`; `cargo check --manifest-path src-tauri/Cargo.toml`; `cargo test --manifest-path src-tauri/Cargo.toml`; `pnpm build`; `pnpm test`; IPC boundary scan; `pnpm tauri build`.

### Completion Notes List

- Workspace chat now subscribes through shared terminal API wrappers, filters events by active workspace and cleans subscriptions/timers/buffers on workspace change or unmount.
- Terminal output is buffered outside React state, flushed every 100 ms, sorted by sequence per session, bounded to the latest 4000 characters and rendered as compact chat stream entries with member/session metadata.
- Terminal status events update chat stream status and member terminal activity separately from manual member status, including exited reason text when available.
- Added focused frontend coverage for ordered output rendering, member terminal status sync and high-volume bounded output while preserving chat input usability.

### File List

- `_bmad-output/implementation-artifacts/4-5-terminal-output-chat-stream-status-sync.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/App.test.tsx`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`

## Change Log

- 2026-05-12: Created Story 4.5 context for terminal output chat stream and status synchronization.
- 2026-05-12: Completed terminal output chat stream rendering, status synchronization, focused frontend tests and full verification.
