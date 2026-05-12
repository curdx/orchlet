# Story 6.2: 管理技能库与工作区链接

Status: done

## Story

As a workspace owner,
I want to link and unlink skills for the current workspace,
So that only relevant local capabilities are available in each project.

## Acceptance Criteria

1. Given skills exist in the app library, when the user links a skill to the current workspace, then the workspace shows the linked skill in its skill list.
2. Given a linked skill exists, when the user unlinks it, then the workspace no longer lists it and the app library record remains intact.
3. Given the platform cannot create symlinks or lacks permission, when link or unlink runs, then the app uses the defined fallback or shows a clear unavailable state.

## Tasks / Subtasks

- [x] Task 1: Add typed workspace skill link contracts and persistence (AC: 1-3)
  - [x] Add DTOs for list/link/unlink commands, linked skill records and link mode/status.
  - [x] Add workspace-local skill link JSON persistence under `.orchlet/skills`.
  - [x] Validate workspace roots, skill IDs, duplicate links and schema-versioned link records.
  - [x] Preserve app skill library records when workspace links are removed.

- [x] Task 2: Add link/unlink app logic and filesystem fallback (AC: 1-3)
  - [x] Resolve skill records from the app library before linking.
  - [x] Attempt directory symlink creation into `.orchlet/skills` for linked local skills.
  - [x] Fall back to a persisted manifest link record when symlink creation is unavailable or denied.
  - [x] Remove symlink/fallback artifacts on unlink while keeping the global library entry intact.

- [x] Task 3: Add Tauri gateway commands and contract fixture coverage (AC: 1-3)
  - [x] Add `workspace_skill_links_list`, `workspace_skill_link` and `workspace_skill_unlink` commands.
  - [x] Register commands in the Tauri invoke handler.
  - [x] Add request/result/error contract fixtures and generated TS bindings.
  - [x] Keep raw Tauri imports inside `src/shared/api/*`.

- [x] Task 4: Add shared API and workspace UI controls (AC: 1-3)
  - [x] Extend `skillsApi` with linked skill list/link/unlink operations.
  - [x] Show current workspace linked skills in the "我的技能库" area.
  - [x] Let users link an unlinked library skill and unlink an existing workspace skill.
  - [x] Show symlink fallback/unavailable state clearly and use recoverable toast feedback for failures.

- [x] Task 5: Add data-integrity coverage for workspace skill links (AC: 1-3)
  - [x] Add storage manifest category and validation check for workspace skill links.
  - [x] Add schema/data fixtures for valid workspace skill link JSON.
  - [x] Update data-integrity tests and fixture validators to include workspace skill link storage.

- [x] Task 6: Add focused tests (AC: 1-3)
  - [x] Test the UI links a library skill and shows it in current workspace skills.
  - [x] Test unlink removes the workspace row while the library skill remains available.
  - [x] Test fallback link mode is surfaced when symlink creation is unavailable.
  - [x] Test Rust persistence rejects duplicate/invalid workspace skill link records and preserves library records on unlink.

- [x] Task 7: Verification and completion evidence (AC: 1-3)
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

Story 6.2 owns linking and unlinking skills from the app skill library to the currently opened workspace. It does not implement deleting skills from the global library, opening skill folders in the system file manager, skill detail editing, enable/disable execution semantics, remote Skill Store, plugin marketplace, roadmap features or execution of skill contents.

### Product Policy

- App skill library records from Story 6.1 remain the source for available local skills.
- Workspace linked skills are workspace-local state under `.orchlet/skills` and must not delete or mutate the app library record on unlink.
- Link identity is the global `skillId`; linking the same skill twice updates or reports the existing workspace link instead of duplicating it.
- The preferred link artifact is a directory symlink from `.orchlet/skills/<safe-name>-<skillId>` to the local skill folder.
- If symlink creation fails because the platform, filesystem or permissions do not allow it, persist the workspace link record with `linkMode: "manifest"` and a clear `unavailableReason`; the UI must surface this as a fallback state.
- Import/link records store metadata and local paths only; skill contents are not copied, uploaded or executed.

### Current Implementation State

- Story 6.1 added app-data skill library import/list, `skills_library_list`, `skills_import_folder`, `src/shared/api/skills-api.ts`, contract fixtures and skill library data-integrity coverage.
- The current UI exposes a compact "我的技能库" panel inside `WorkspaceSelectionPage` after a workspace is opened.
- Raw Tauri APIs are isolated to `src/shared/api/*`; pages/components must call typed shared API wrappers only.
- Workspace metadata lives under `.orchlet/workspace.json`; app-data skill library lives under `skills/skill-library.json`.

### Technical Requirements

- Extend `src-tauri/src/contracts/skill.rs` and generated `src/contracts/generated/skill.ts`.
- Extend `src-tauri/src/app/skills/mod.rs` and `src-tauri/src/domain/skill/mod.rs`.
- Add workspace-local JSON persistence under `src-tauri/src/infrastructure/persistence/json_store`.
- Add Tauri gateway commands in `src-tauri/src/gateway/skills_commands.rs` and register them in `src-tauri/src/lib.rs`.
- Add shared frontend methods in `src/shared/api/skills-api.ts` and browser/test fallback behavior in `src/shared/api/client.ts`.
- Keep UI implementation compact inside the existing `WorkspaceSelectionPage` skill panel until dedicated skill feature slices are introduced.

### Architecture Compliance

- IPC payload fields must be camelCase via serde/ts-rs.
- Workspace-local writes must use schema-versioned JSON and recoverable `AppError` failures.
- Frontend caches are not authoritative; the Rust workspace link store is authoritative for desktop runtime.
- Browser fallback is only for local web preview/tests and must not claim real desktop symlink behavior.
- Contract fixtures must include request, success and error examples and stay referenced in `fixtures/contracts/contract-fixtures.manifest.json`.

### UX Requirements

- Current workspace linked skill list must be visible from the existing "我的技能库" area.
- Empty linked state should distinguish "no workspace skills linked yet" from an empty app library.
- Link/unlink buttons must be disabled during pending operations.
- Symlink fallback state must be visible with concise text such as `清单链接` or `需要手动同步`.
- Validation, permission or persistence failures show recoverable toast feedback and leave the visible lists consistent with the last successful data.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/6-1-import-local-skill-folder.md`
- `src-tauri/src/app/skills/mod.rs`
- `src-tauri/src/domain/skill/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/skill_library_store.rs`
- `src-tauri/src/gateway/skills_commands.rs`
- `src-tauri/src/contracts/skill.rs`
- `src/shared/api/skills-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 6.2 acceptance criteria and Epic 6 context.
- `_bmad-output/planning-artifacts/prd.md` - FR57, FR58, FR59, FR72, FR73, NFR8, NFR14, NFR17, NFR27, NFR28.
- `_bmad-output/planning-artifacts/architecture.md` - skills module ownership, typed IPC, workspace-local persistence and storage manifest rules.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - current skills tab, project skill picker, link/unlink and empty/error states.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Story 6.2 created from sprint backlog, Epic 6 spec, Story 6.1 implementation state, PRD/UX/architecture skill link requirements and existing workspace/API/storage patterns.
- 2026-05-13: Implemented workspace skill link/list/unlink contracts, app logic, workspace-local JSON store and symlink-to-manifest fallback behavior.
- 2026-05-13: Added current workspace skill UI with link/unlink controls and visible manifest fallback state.
- 2026-05-13: Added contract fixtures, generated bindings, data-integrity fixtures and Rust/frontend tests for workspace skill links.
- 2026-05-13: Verification passed: `pnpm test:frontend -- src/App.test.tsx`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt`, `cargo fmt --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Added workspace-local `.orchlet/skills/skill-links.json` persistence with schema validation and duplicate skill/link path rejection.
- Added link/unlink commands that keep the app skill library record intact and remove only safe symlink artifacts on unlink.
- Added symlink creation with manifest fallback when the target path is unavailable or symlink creation fails.
- Added UI controls to link library skills, unlink workspace skills and surface `清单链接` fallback status.

### File List

- `_bmad-output/implementation-artifacts/6-2-manage-skill-library-workspace-links.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/skill/skill-import-folder.result.json`
- `fixtures/contracts/skill/skill-library-list.result.json`
- `fixtures/contracts/skill/workspace-skill-link.error.json`
- `fixtures/contracts/skill/workspace-skill-link.request.json`
- `fixtures/contracts/skill/workspace-skill-link.result.json`
- `fixtures/contracts/skill/workspace-skill-links-list.error.json`
- `fixtures/contracts/skill/workspace-skill-links-list.request.json`
- `fixtures/contracts/skill/workspace-skill-links-list.result.json`
- `fixtures/contracts/skill/workspace-skill-unlink.error.json`
- `fixtures/contracts/skill/workspace-skill-unlink.request.json`
- `fixtures/contracts/skill/workspace-skill-unlink.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/workspace/.orchlet/skills/skill-links.json`
- `fixtures/schema/skills-v1/workspace-skill-links.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/skill.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/skills/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/skill.rs`
- `src-tauri/src/domain/skill/mod.rs`
- `src-tauri/src/gateway/skills_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_skill_link_store.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/skill.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/skills-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 6.2 context for workspace skill link management.
- 2026-05-13: Completed workspace skill link/list/unlink implementation, symlink fallback, tests, contract fixtures, data-integrity coverage and release build verification.
