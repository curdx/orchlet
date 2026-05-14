# Story 9.12: Legacy Golutra workspace metadata compatibility

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a current Golutra workspace user,
I want the React/Tauri rebuild to recognize existing `.golutra` workspace metadata,
So that opening an existing Golutra workspace preserves the stable project identity instead of silently creating an unrelated `.orchlet` identity.

## Acceptance Criteria

1. Given a workspace contains `.golutra/workspace.json` with a non-empty Golutra `projectId`, when orchlet opens the workspace without an existing `.orchlet/workspace.json`, then orchlet creates `.orchlet/workspace.json` using the same project id and does not replace it with a new ULID.
2. Given the existing Golutra project id is a legacy SHA-256 hex id rather than a ULID, when workspace metadata, registry and fallback validation run, then the id is accepted as a valid legacy project id.
3. Given a writable workspace opens successfully, when orchlet refreshes workspace metadata, then `.golutra/workspace.json` is mirrored with the active project id without deleting unknown Golutra fields.
4. Given a writable workspace opens successfully, when local workspace state is refreshed, then `.golutra/local.json` exists with `localMachineId` and `lastOpenedAt` semantics compatible with Golutra.
5. Given the story is ready for review, when validation runs, then targeted workspace/data-integrity Rust tests, contract/data fixtures affected by project id validation, `pnpm test`, `pnpm build`, release readiness validation and `git diff --check` pass structurally. Release readiness may remain blocked for global settings/chat redb migration and packaged smoke evidence.

## Tasks / Subtasks

- [x] Task 1: Read and mirror legacy workspace metadata (AC: 1, 3)
  - [x] Add `.golutra/workspace.json` read support before creating new `.orchlet` metadata.
  - [x] Preserve unknown Golutra fields when mirroring the active project id.
  - [x] Keep existing `.orchlet` metadata precedence when both files exist.

- [x] Task 2: Preserve Golutra local state semantics (AC: 4)
  - [x] Write `.golutra/local.json` on writable opens.
  - [x] Preserve existing `localMachineId` and only refresh `lastOpenedAt`.
  - [x] Treat local-state write failures as compatibility refresh failures, not hard open failures.

- [x] Task 3: Broaden project id validation for legacy ids (AC: 2)
  - [x] Accept current ULIDs and legacy 64-character SHA-256 hex ids in workspace metadata.
  - [x] Apply the same validation to workspace registry and fallback stores.
  - [x] Update failure messages/fixtures so invalid ids are still rejected.

- [x] Task 4: Add focused tests and evidence (AC: 1, 2, 3, 4, 5)
  - [x] Add Rust tests for opening a `.golutra` workspace without `.orchlet` metadata.
  - [x] Add Rust tests for preserving unknown legacy fields and `localMachineId`.
  - [x] Add/update data-integrity tests or fixtures for legacy project id acceptance and invalid id rejection.

- [x] Task 5: Run validation and update release evidence (AC: 5)
  - [x] Run targeted workspace/data-integrity Rust tests.
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `node scripts/validate-release-readiness.mjs`.
  - [x] Run `git diff --check`.
  - [x] Update Story 9.10 release gate/checklists to say workspace metadata compatibility is resolved, while global settings/chat redb remain blocked.

## Dev Notes

- `/Users/wdx/opc/golutra` remains the product master for this compatibility slice. Relevant reference code:
  - `/Users/wdx/opc/golutra/src-tauri/src/ui_gateway/app.rs`
  - `/Users/wdx/opc/golutra/src-tauri/src/message_service/project_data.rs`
  - `/Users/wdx/opc/golutra/src/features/workspace/projectStore.ts`
- Golutra's project id is not guaranteed to be a ULID; the reference generates SHA-256 hex ids for workspace paths and local machine ids.
- This story intentionally does not claim global `global-settings.json`, old `chat.redb`, avatar library or contacts migration. Those remain separate release blockers unless direct evidence is produced.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cargo test --manifest-path src-tauri/Cargo.toml app::workspace` — passed; 19 workspace tests.
- `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` — passed; 10 data-integrity tests.
- `pnpm test:data-integrity` — passed; schema/data fixtures validated and 21 Rust fixture tests passed.
- `pnpm test:contracts` — passed; 80 contract fixture groups and 12 Rust contract fixture tests passed.
- `pnpm exec tsc --noEmit` — passed.
- `pnpm test` — passed; frontend 7 files / 133 tests, contract/data-integrity/capability/smoke/release validators passed; release readiness reported `blocked`.
- `pnpm build` — passed; Vite emitted the existing >500 kB chunk warning.
- `node scripts/validate-release-readiness.mjs` — passed structurally; reported `validated MVP release readiness: blocked`.
- `git diff --check` — passed.

### Completion Notes List

- Added compatibility reads for legacy `.golutra/workspace.json` before creating new `.orchlet/workspace.json`, preserving legacy project identity including 64-character SHA-256 ids.
- Mirrored active workspace metadata back to `.golutra/workspace.json` without deleting unknown Golutra fields, while keeping `.orchlet/workspace.json` authoritative when both files exist.
- Added `.golutra/local.json` refresh with `localMachineId` preservation and `lastOpenedAt` update semantics.
- Broadened project id validation across workspace metadata, members, registry and fallback stores while keeping invalid ids rejected through updated fixtures.
- Updated Story 9.10 release evidence to mark workspace/local legacy metadata compatibility as resolved and keep `global-settings.json`, `chat.redb`, avatars, contacts and packaged smoke as release blockers.

### File List

- `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`
- `_bmad-output/implementation-artifacts/9-12-legacy-golutra-workspace-metadata-compatibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/rebuild/feature-inventory.md`
- `docs/rebuild/parity-checklist.md`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/contracts/chat/chat-conversations-list.error.json`
- `fixtures/contracts/member/members-list.error.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/release/mvp-release-readiness.json`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/workspace/mod.rs`
- `src-tauri/src/domain/member/mod.rs`
- `src-tauri/src/domain/workspace/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_fallback_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_metadata_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_registry_store.rs`

## Change Log

- 2026-05-14: Created Story 9.12 from Story 9.10 legacy `.golutra` workspace metadata blocker.
- 2026-05-14: Implemented and validated legacy workspace/local metadata compatibility; moved story to review while release remains blocked for remaining legacy data and packaged smoke evidence.
