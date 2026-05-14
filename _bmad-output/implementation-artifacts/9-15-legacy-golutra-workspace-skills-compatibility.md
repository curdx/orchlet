# Story 9.15: Legacy Golutra workspace skills compatibility

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a current Golutra user,
I want the React/Tauri rebuild to read my existing workspace `.golutra/skills` symlinks,
So that project-linked local skills remain visible and removable after opening the same workspace in orchlet.

## Acceptance Criteria

1. Given a workspace has legacy `.golutra/skills` directory symlinks and no current `.orchlet/skills/skill-links.json`, when orchlet lists workspace skill links, then it returns mapped entries with the legacy link name, resolved source path, manifest path and symlink mode.
2. Given both current `.orchlet/skills/skill-links.json` and legacy `.golutra/skills` exist, when orchlet lists workspace skill links, then the current schema remains authoritative.
3. Given a legacy workspace skill symlink points to a missing target or missing `SKILL.md`, when orchlet lists workspace skill links, then it still returns a manifest-fallback record with an unavailable reason instead of failing the whole list.
4. Given a legacy workspace skill link is listed, when the user unlinks it through orchlet, then the legacy symlink is removed and the remaining links are persisted into the current `.orchlet/skills/skill-links.json` document.
5. Given the story is ready for review, when validation runs, then targeted skill/data-integrity tests, `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness validation and `git diff --check` pass structurally. Release readiness may remain blocked for `chat.redb`, avatars/contacts and packaged smoke evidence.

## Tasks / Subtasks

- [x] Task 1: Add legacy workspace skills reader (AC: 1, 2, 3)
  - [x] Keep current `.orchlet/skills/skill-links.json` authoritative when present.
  - [x] Scan legacy `.golutra/skills` entries only when current skill links are absent.
  - [x] Map legacy symlinks into current `WorkspaceSkillLinksDocument` entries.
  - [x] Preserve broken/missing legacy targets as manifest fallback records with actionable reasons.

- [x] Task 2: Preserve unlink behavior for legacy links (AC: 4)
  - [x] Generate stable current-compatible skill ids for legacy symlink records.
  - [x] Remove the legacy symlink safely when unlinking a legacy record.
  - [x] Persist remaining links through the current `.orchlet/skills/skill-links.json` store.

- [x] Task 3: Add focused tests and evidence (AC: 1, 2, 3, 4, 5)
  - [x] Add Rust tests for legacy symlink import, current-store precedence and broken legacy links.
  - [x] Add unlink coverage for removing a legacy symlink and writing the current store.
  - [x] Add data-integrity coverage showing legacy workspace skills validate.
  - [x] Update release gate/checklists/capability registry to say `.golutra/skills` compatibility is resolved while remaining blockers stay honest.

## Dev Notes

- Golutra reference:
  - `/Users/wdx/opc/golutra/src-tauri/src/ui_gateway/project_skills.rs`
  - `/Users/wdx/opc/golutra/src/features/skills/skillsBridge.ts`
  - `/Users/wdx/opc/golutra/src/features/chat/modals/SkillManagementModal.vue`
- Legacy Golutra stores project skill links as directory symlinks under workspace `.golutra/skills`.
- This story intentionally does not claim old `chat.redb`, avatar/contact migration or packaged OS smoke evidence.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cargo test --manifest-path src-tauri/Cargo.toml workspace_skill_link_store` — passed; 4 focused legacy/current workspace skill link tests.
- `cargo test --manifest-path src-tauri/Cargo.toml app::skills` — passed; 13 skill app tests including legacy symlink unlink and broken legacy symlink cleanup.
- `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` — passed; 13 data-integrity tests including legacy workspace skill symlink validation.
- `pnpm test:contracts` — passed; 80 contract fixture groups and 12 Rust contract fixture tests passed.
- `pnpm test:data-integrity` — passed; schema/data fixtures validated and 21 Rust fixture tests passed.
- `pnpm exec tsc --noEmit` — passed.
- `pnpm test` — passed; frontend 7 files / 133 tests, contract/data-integrity/capability/smoke/release validators passed; release readiness reported `blocked`.
- `pnpm build` — passed; Vite emitted the existing >500 kB chunk warning.
- `node scripts/validate-release-readiness.mjs` — passed structurally; reported `validated MVP release readiness: blocked`.
- `node scripts/validate-capability-status.mjs` — passed; 85 MVP capability status entries.
- `git diff --check` — passed.

### Completion Notes List

- Added legacy `.golutra/skills` symlink scanning when the current `.orchlet/skills/skill-links.json` store is absent.
- Mapped legacy symlinks into current `WorkspaceSkillLinkEntry` records with stable ULID-compatible ids, legacy link names, resolved source paths and manifest paths.
- Preserved current skill-link schema precedence when both current and legacy stores exist.
- Represented missing targets or missing `SKILL.md` as manifest fallback records with unavailable reasons instead of failing the list.
- Updated unlink cleanup so symlink paths are removed safely even when a legacy broken symlink was listed as a manifest fallback.
- Updated Story 9.10 release evidence, rebuild checklist, release notes and capability status while keeping `chat.redb`, avatars, contacts and packaged smoke blocked.

### File List

- `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`
- `_bmad-output/implementation-artifacts/9-15-legacy-golutra-workspace-skills-compatibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/rebuild/feature-inventory.md`
- `docs/rebuild/parity-checklist.md`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/capabilities/mvp-capability-status.json`
- `fixtures/release/mvp-release-readiness.json`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/skills/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_skill_link_store.rs`

## Change Log

- 2026-05-14: Created Story 9.15 from remaining Story 9.10 `.golutra/skills` blocker.
- 2026-05-14: Implemented and validated legacy workspace skill symlink compatibility; moved story to review while release remains blocked for remaining legacy data and packaged smoke evidence.
