# Story 9.14: Legacy Golutra workspace registry compatibility

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a current Golutra user,
I want the React/Tauri rebuild to understand my existing `recent-workspaces.json` and legacy `workspace-registry.json`,
So that my recent workspace list and project-id/path conflict behavior survive the rebuild.

## Acceptance Criteria

1. Given app data contains legacy Golutra `workspace-registry.json` as a project-id map, when orchlet loads the workspace registry, then it maps entries into the current schema without rejecting the file as invalid.
2. Given app data contains legacy `recent-workspaces.json` and no current registry file, when orchlet lists recent workspaces, then it returns mapped entries sorted by last open time.
3. Given both legacy registry and recent list exist, when orchlet loads the registry, then names are recovered from the recent list and paths/timestamps are reconciled safely.
4. Given a current schema registry exists, when legacy files also exist, then the current registry remains authoritative.
5. Given the story is ready for review, when validation runs, then targeted workspace/data-integrity tests, `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness validation and `git diff --check` pass structurally. Release readiness may remain blocked for `chat.redb`, avatars/contacts, `.golutra/skills` and packaged smoke evidence.

## Tasks / Subtasks

- [x] Task 1: Add legacy registry/recent readers (AC: 1, 2, 3, 4)
  - [x] Detect current `workspace-registry.json` schema before falling back to legacy formats.
  - [x] Map legacy registry map entries into current `WorkspaceRegistryDocument`.
  - [x] Map legacy recent list entries when current registry is absent.
  - [x] Keep current schema registry authoritative when present.

- [x] Task 2: Add tests and evidence (AC: 1, 2, 3, 4, 5)
  - [x] Add Rust tests for legacy registry map loading.
  - [x] Add Rust tests for legacy recent list fallback and sorting.
  - [x] Add precedence tests proving current registry overrides legacy files.
  - [x] Add data-integrity coverage for legacy registry/recent compatibility.

- [x] Task 3: Run validation and update release evidence (AC: 5)
  - [x] Run targeted workspace/data-integrity Rust tests.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `pnpm exec tsc --noEmit`.
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `node scripts/validate-release-readiness.mjs`.
  - [x] Run `git diff --check`.
  - [x] Update Story 9.10 release gate/checklists/capability registry to say recent/registry compatibility is resolved while remaining blockers stay honest.

## Dev Notes

- Golutra reference:
  - `/Users/wdx/opc/golutra/src-tauri/src/ui_gateway/app.rs`
  - `/Users/wdx/opc/golutra/src/features/workspace/workspaceStore.ts`
- Golutra legacy formats:
  - `recent-workspaces.json`: array of `{ id, name, path, lastOpenedAt }`.
  - `workspace-registry.json`: object map of `projectId -> { lastKnownPath, lastAccessed }`.
- This story intentionally does not claim `chat.redb`, avatar/contact migration or `.golutra/skills` symlink compatibility.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cargo test --manifest-path src-tauri/Cargo.toml workspace_registry_store` — passed; 4 focused registry compatibility tests.
- `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` — passed; 12 data-integrity tests.
- `pnpm test:contracts` — passed.
- `pnpm test:data-integrity` — passed.
- `pnpm exec tsc --noEmit` — passed.
- `pnpm test` — passed; release readiness reported `blocked`.
- `pnpm build` — passed; Vite emitted the existing >500 kB chunk warning.
- `node scripts/validate-release-readiness.mjs` — passed structurally; reported `validated MVP release readiness: blocked`.
- `git diff --check` — passed.

### Completion Notes List

- Added legacy `workspace-registry.json` map reader for Golutra `projectId -> { lastKnownPath, lastAccessed }` files.
- Added legacy `recent-workspaces.json` array fallback when the current registry schema file is absent.
- Reconciled legacy registry paths with recent-workspace names/timestamps and kept current schema registry authoritative when present.
- Added focused Rust tests for registry map import, recent-list fallback/sorting, current schema precedence and data-integrity validation.
- Updated release gate/checklist/capability evidence while keeping `chat.redb`, avatars, contacts, `.golutra/skills` and packaged smoke blocked.

### File List

- `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`
- `_bmad-output/implementation-artifacts/9-14-legacy-golutra-workspace-registry-compatibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/rebuild/feature-inventory.md`
- `docs/rebuild/parity-checklist.md`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/capabilities/mvp-capability-status.json`
- `fixtures/release/mvp-release-readiness.json`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_registry_store.rs`

## Change Log

- 2026-05-14: Created Story 9.14 from remaining Story 9.10 legacy recent/registry blocker.
- 2026-05-14: Implemented and validated legacy recent/workspace registry compatibility; moved story to review while release remains blocked for remaining legacy data and packaged smoke evidence.
