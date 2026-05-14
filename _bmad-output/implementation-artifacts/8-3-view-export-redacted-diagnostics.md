# Story 8.3: 查看和导出脱敏诊断信息

Status: done

<!-- Note: Created after Story 8.2 completion. This story owns diagnostics viewing/export/redaction only; Story 8.4 owns capability labels and Story 8.5 owns release checklist/smoke evidence. -->

## Story

As a support-facing user,
I want to view and export diagnostic information safely,
so that problems can be shared without leaking private project data.

## Acceptance Criteria

1. Given diagnostic information exists, when the user opens diagnostics, then they can view runs, key events, validation reports and consistency summaries.
2. Given the user exports diagnostics, when the package is generated, then sensitive paths, tokens, environment variables and private source snippets are removed or the user is warned before export.
3. Given export is long-running, when the user cancels or navigates, then the export is interruptible or batched and does not freeze the app.

## Tasks / Subtasks

- [x] Task 1: Add typed diagnostics view/export contracts and API surface (AC: 1-3)
  - [x] Extend `src-tauri/src/contracts/diagnostics.rs` with DTOs for diagnostics overview/listing, export request/result, export sections, redaction summaries, warnings and batched/cancel-safe cursors.
  - [x] Add IPC commands in `src-tauri/src/gateway/diagnostics_commands.rs` for diagnostics overview and redacted export generation; register them in `src-tauri/src/lib.rs`.
  - [x] Add app-level use cases in `src-tauri/src/app/diagnostics/mod.rs`; keep privacy/redaction logic under `src-tauri/src/domain/diagnostics/mod.rs` or a focused child module.
  - [x] Export generated TypeScript bindings to both `src/contracts/generated/diagnostics.ts` and `src-tauri/bindings/diagnostics.ts`; do not hand-edit generated binding output.
  - [x] Extend `src/shared/api/diagnostics-api.ts` and tests so frontend callers use typed APIs, not raw Tauri calls.
  - [x] Add contract fixtures and manifest entries for overview/export success and error cases.

- [x] Task 2: Provide diagnostics viewing data without exposing private content (AC: 1)
  - [x] Add repository/app queries that list diagnostic runs and key diagnostic events from Story 8.1 with paging or explicit limits.
  - [x] Include consistency summary information derived from Story 8.2 issue events and any directly supplied consistency report summaries; do not rerun consistency diagnostics implicitly.
  - [x] Include data-integrity validation report summary data if available from existing fixtures/use cases, or return an explicit `notAvailable`/empty summary without fabricating validation results.
  - [x] Ensure returned records include safe IDs, status, timestamps, scopes, severity, event names, counts and recommended actions, not terminal text, chat bodies, source snippets or raw paths.

- [x] Task 3: Implement redacted diagnostics export package generation (AC: 2-3)
  - [x] Generate a structured local export payload that contains diagnostics runs, key events, validation summaries, consistency summaries, app/schema metadata and redaction metadata.
  - [x] Redact obvious tokens/secrets/passwords/API keys, environment-variable-like values, home/private absolute paths and source-snippet-like text before returning/exporting.
  - [x] Attach warnings for content that cannot be confidently redacted, omitted sections, truncated batches and any caller-supplied unsafe snippets.
  - [x] Keep export local-only; do not upload, phone home, or create telemetry.
  - [x] Enforce bounded section sizes and pagination/batching so large workspaces do not freeze the UI.

- [x] Task 4: Add a minimal diagnostics UI entry/view consistent with the current app shell (AC: 1-3)
  - [x] Add a diagnostics view or panel in the existing React app structure that can call the typed overview/export APIs.
  - [x] Display runs, key events, validation summaries and consistency summaries in compact work-focused UI states.
  - [x] Provide export action with progress/cancel or batched request handling, and show redaction warnings before the package is used.
  - [x] Add focused UI/API tests using existing Vitest patterns; keep raw Tauri calls inside `src/shared/api/*`.

- [x] Task 5: Preserve privacy, workflow boundaries and fixture honesty (AC: 1-3)
  - [x] Do not persist or export raw terminal chunks, chat message bodies, full private source snippets, secrets, environment values or unredacted absolute user paths.
  - [x] Do not implement capability status labels, MVP checklist, release smoke evidence, cloud logging or automatic background diagnostics scans.
  - [x] Update contract fixture type coverage and manifests only for implemented 8.3 APIs.
  - [x] Update schema/data-integrity fixtures only if new persisted fields/tables are added; prefer no new persistence for this story.

- [x] Task 6: Add focused tests and completion evidence (AC: 1-3)
  - [x] Add Rust tests for overview list contents, redaction behavior, export section limits/batching and warning generation.
  - [x] Add frontend/API tests for the new typed diagnostics API methods and diagnostics view/export UI state.
  - [x] Add contract fixture tests for new diagnostics DTOs and commands.
  - [x] Run binding export tests for diagnostics DTO changes: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib` and `TS_RS_EXPORT_DIR=bindings cargo test --manifest-path src-tauri/Cargo.toml contracts::diagnostics::export_bindings --lib`.
  - [x] Run `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build` and the IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.

## Dev Notes

### Scope Boundary

Story 8.3 owns diagnostics viewing, redacted export packaging and minimal UI/API access. It does not implement capability status labeling, release checklist/smoke evidence, remote upload, telemetry, automatic background diagnostics scans, terminal replay, chat repair, data repair execution, schema migrations unless strictly necessary, or any provider-specific secret management.

The implementation may return a structured JSON export result rather than writing a file if the app does not yet have a file-save adapter. The important requirement is safe local generation with redaction metadata, warnings and bounded/batched behavior.

### Product Policy

- Diagnostics remain local-first and explicit. Export must not upload source, terminal output, chat, paths, avatars, skills or diagnostics.
- Exported data must be useful for support while remaining metadata-first: IDs, statuses, event names, scopes, severities, counts, timestamps, summaries and recommendations are preferred.
- Raw terminal output, chat bodies, private source snippets, tokens, secrets, API keys, env values and full user paths must be redacted, omitted or explicitly warned before export.
- Long-running export must be bounded, pageable, batched or cancel-safe. A synchronous command may satisfy this only if it has hard limits and cursor/batch semantics that let the frontend stop requesting more.

### Current Implementation State

- Story 8.1 added `diagnostics_runs` and `diagnostic_events`, DTOs, commands, app use cases, SQLite repository and frontend API/helper.
- Story 8.2 added terminal/chat consistency diagnostics and records each issue as a safe diagnostic event when an active run exists or a valid active `runId` is supplied.
- `diagnostic_events.metadata_json` is intentionally small and allowlisted; use it as metadata, not content replay.
- There is no `src/features` directory in the current app despite architecture placeholders. Existing frontend structure is `src/App.tsx`, `src/pages/*`, `src/shared/api/*`, `src/shared/ui/*` and tests.
- Data-integrity validation/reporting already exists under `src-tauri/src/app/data_integrity`, `src-tauri/src/contracts/data_integrity.rs` and `src/shared/api/data-integrity-api.ts`; reuse summaries where practical but do not claim unavailable report data.

### Required Viewing Semantics

- Overview/listing should support a workspace-scoped request and return:
  - recent diagnostic runs with `runId`, `workspaceId`, status, reason/label, started/completed timestamps, outcome and safe summary;
  - key events ordered predictably by timestamp/event id, with scope, severity, event name, correlation ids and safe metadata;
  - consistency summaries derived from issue event names/metadata where available, including counts by scope/severity and recommended next action samples;
  - validation report summary if available, otherwise an explicit unavailable/empty state.
- Do not implicitly start a run or rerun terminal/chat diagnostics just because the user opens diagnostics.

### Required Export/Redaction Semantics

- Export package should include a schema/version, generated timestamp, workspace id or redacted workspace reference, sections, warnings and redaction summary.
- Redaction must cover at least:
  - common secret keys: token, secret, password, passwd, api_key, apikey, access_key, auth, bearer, private_key;
  - env-like assignments or metadata values containing secret key names;
  - home/private absolute paths on macOS/Linux/Windows, replacing user-specific parts with stable placeholders;
  - source-snippet-like text or multiline/raw content by omitting or replacing with a warning.
- Export should expose counts for items included, omitted, redacted and truncated. Warnings should be structured enough for UI display and tests.
- Batching can be implemented with `limit`, `cursor`, `maxEvents`, `includeSections` and `hasMore` fields rather than a long-lived worker if that matches current app patterns.

### Architecture Compliance

- Contracts stay in `src-tauri/src/contracts/diagnostics.rs` and generated TS output under `src/contracts/generated`.
- Gateway commands stay in `src-tauri/src/gateway/diagnostics_commands.rs`.
- App use cases stay in `src-tauri/src/app/diagnostics/mod.rs`.
- Domain redaction/classification stays in `src-tauri/src/domain/diagnostics/mod.rs` or a child module.
- SQLite read queries stay in `src-tauri/src/infrastructure/persistence/sqlite/diagnostics_repository.rs`.
- Frontend access goes through `src/shared/api/diagnostics-api.ts`.
- UI should follow existing app shell patterns in `src/App.tsx`; no marketing page or decorative hero UI.
- IPC fields use camelCase via serde/ts-rs.
- Do not add npm or crate dependencies unless a HALT condition is reached and the user approves.

### Previous Story Intelligence

- Story 8.2 established metadata-only issue summaries. Preserve that boundary and avoid adding raw terminal/chat payloads to export.
- Story 8.2 fixed explicit `runId` validation even when a diagnostics command yields zero issues. Reuse existing validation helpers for any new run-aware commands.
- Story 8.1 made diagnostics disabled by default and active-run lookup workspace-scoped. Opening diagnostics or exporting should not create an active run silently.
- Story 7.8 and Story 8.1 reinforced fixture honesty: manifests must only claim implemented behavior.
- Story 1.6/1.7 fixture rules still apply: contract fixtures and schema/data reports must remain machine-valid and privacy-safe.

### Relevant Files To Read Before Coding

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/8-1-diagnostics-run-core-event-recording.md`
- `_bmad-output/implementation-artifacts/8-2-terminal-snapshot-chat-consistency-diagnostics.md`
- `_bmad-output/implementation-artifacts/7-8-chat-data-repair-clear-maintenance.md`
- `src-tauri/src/contracts/diagnostics.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/app/diagnostics/mod.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/domain/diagnostics/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/diagnostics_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/gateway/diagnostics_commands.rs`
- `src-tauri/src/lib.rs`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/shared/api/diagnostics-api.ts`
- `src/shared/api/diagnostics-api.test.ts`
- `src/shared/api/data-integrity-api.ts`
- `fixtures/contracts/diagnostics/`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `tests/contract/contract-fixture-types.ts`

### Testing Requirements

- Rust tests should use actual workspace SQLite state for runs/events and verify overview/export results do not contain private raw values.
- Redaction tests must include representative macOS/Linux/Windows paths, token/env key names and multiline/source-snippet-like values.
- Export tests must verify warning generation, truncation/has-more behavior and stable section counts.
- Frontend tests should mock typed diagnostics APIs, not raw Tauri calls.
- Contract fixture tests must cover serialization for overview/export request/result/error DTOs.
- Generated TypeScript bindings must be regenerated through cargo tests, not edited by hand.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 8 and Story 8.3 acceptance criteria.
- `_bmad-output/planning-artifacts/prd.md` - FR78, NFR7, NFR14, NFR18 and NFR42.
- `_bmad-output/planning-artifacts/architecture.md` - local-first diagnostics, typed IPC/channel split and diagnostics export redaction requirements.
- `_bmad-output/implementation-artifacts/8-1-diagnostics-run-core-event-recording.md` - diagnostics run/event semantics and privacy defaults.
- `_bmad-output/implementation-artifacts/8-2-terminal-snapshot-chat-consistency-diagnostics.md` - consistency issue event shape and metadata-only constraints.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Created Story 8.3 context from Epic 8, PRD, architecture, Story 8.1 and Story 8.2. Status set to ready-for-dev.
- 2026-05-13: Started dev-story implementation. Status set to in-progress.
- 2026-05-13: Added diagnostics overview/export DTOs, commands, app use cases, repository paging, redaction helpers, generated bindings and contract fixtures.
- 2026-05-13: Added diagnostics panel UI with overview loading, redacted export generation, next-batch handling and stop-export behavior.
- 2026-05-13: Strengthened overview privacy by applying the same metadata/run redaction path used by export before returning view data.
- 2026-05-13: Validation passed: diagnostics binding export to `../src/contracts/generated` and `bindings`; focused diagnostics Rust tests; diagnostics API/App Vitest tests; `pnpm test:contracts`; `pnpm test:data-integrity`; `cargo fmt --check`; `cargo check`; full `cargo test`; full `pnpm test`; `pnpm build`; IPC boundary scan.
- 2026-05-13: Code review fixed diagnostics event listing redaction, consistency-only export summaries and stale export batch handling after Stop.
- 2026-05-13: Post-review validation passed: `cargo fmt --check`, `cargo check`, `cargo test`, `pnpm test`, `pnpm build` and IPC boundary scan.

### Completion Notes List

- Implemented typed diagnostics overview and export IPC surface with generated Rust/TypeScript contracts and fixture coverage.
- Overview lists recent runs and key events with explicit paging, derives consistency counts from recorded safe issue events, and returns an explicit `notAvailable` validation summary instead of fabricating persisted validation reports.
- Export returns a local structured JSON payload with bounded batches, cursors, redaction metadata and warnings for private paths, token/env-like values, sensitive keys, source-like snippets and truncated sections.
- Diagnostics view panel was added to the workspace selection shell, using typed API calls for overview refresh, export generation, next batch and cancel/stop handling.
- Privacy boundary preserved: no raw terminal chunks, chat bodies, private source snippets, full private paths, cloud upload, telemetry, capability labeling or release checklist work was added.
- Code review follow-up tightened all event-listing/view/export result paths through redaction and made stopped export batches ignore stale async completions.

### File List

- `_bmad-output/implementation-artifacts/8-3-view-export-redacted-diagnostics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/diagnostics/diagnostics-overview-get.request.json`
- `fixtures/contracts/diagnostics/diagnostics-overview-get.result.json`
- `fixtures/contracts/diagnostics/diagnostics-overview-get.error.json`
- `fixtures/contracts/diagnostics/diagnostics-export-generate.request.json`
- `fixtures/contracts/diagnostics/diagnostics-export-generate.result.json`
- `fixtures/contracts/diagnostics/diagnostics-export-generate.error.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/diagnostics.ts`
- `src-tauri/src/app/diagnostics/mod.rs`
- `src-tauri/src/contracts/diagnostics.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/domain/diagnostics/mod.rs`
- `src-tauri/src/gateway/diagnostics_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/diagnostics_repository.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/diagnostics.ts`
- `src/contracts/generated/index.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/diagnostics-api.ts`
- `src/shared/api/diagnostics-api.test.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 8.3 context for diagnostics viewing and redacted export.
- 2026-05-13: Started implementation of diagnostics viewing and redacted export.
- 2026-05-13: Implemented diagnostics overview and redacted batched export; added UI/API/contract/Rust coverage and moved story to review.
- 2026-05-13: Completed code review fixes for privacy and export batching; story moved to done.

## Senior Developer Review (AI)

Review Date: 2026-05-13

Outcome: Approve

Findings: 3 patch findings fixed.

Review Notes:

- Fixed diagnostics event listing so returned run/event payloads are redacted before leaving the app layer, not only during overview/export.
- Fixed consistency-only exports so `consistencySummaries` can be requested independently of the `events` section without producing an empty summary.
- Fixed diagnostics export UI stop handling so an in-flight next-batch request cannot reinsert a stale export result after the user stops export or switches workspace.
- Confirmed diagnostics overview/export remains metadata-first and does not implement capability labels, release checklist/smoke evidence, telemetry, cloud upload or background diagnostics scans.
- Validation after review passed: `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml app::diagnostics -- --nocapture`, `pnpm vitest run src/App.test.tsx`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build`, and the IPC boundary scan.
