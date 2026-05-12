# Story 6.3: 删除、打开与能力分类

Status: done

## Story

As a user managing skills,
I want to delete, open and understand skill capabilities,
So that local skills, store placeholders and future plugins are not confused.

## Acceptance Criteria

1. Given a skill exists in the app library, when the user opens the skill folder, then the system file manager opens the stored folder path or shows an unavailable message.
2. Given a skill is deleted from the app library, when deletion completes, then app library and workspace link state are updated without deleting user source folders unless explicitly supported and confirmed.
3. Given skills and placeholders are listed, when the user views the skill area, then local skills, skill store placeholders and future remote plugin placeholders are visually and semantically distinct.

## Tasks / Subtasks

- [x] Task 1: Add typed delete/open contracts and app logic (AC: 1-2)
  - [x] Add DTOs for skill folder open and skill library delete commands.
  - [x] Resolve app library skill records by `skillId` before open/delete.
  - [x] Open the stored local folder path through the desktop opener adapter.
  - [x] Delete app library records without deleting the user source directory.

- [x] Task 2: Keep workspace link state consistent on delete (AC: 2)
  - [x] Remove the deleted skill from the current workspace link store when a workspace root is supplied.
  - [x] Safely remove only symlink artifacts owned by workspace links.
  - [x] Return updated library and workspace link lists for frontend cache consistency.
  - [x] Leave source folders and unrelated workspace links untouched.

- [x] Task 3: Add Tauri gateway commands and contract coverage (AC: 1-2)
  - [x] Add `skills_open_folder` and `skills_delete` commands.
  - [x] Register the commands in the Tauri invoke handler.
  - [x] Add request/result/error contract fixtures and generated TS bindings.
  - [x] Keep raw Tauri/opener imports out of pages/components.

- [x] Task 4: Add shared API and UI controls (AC: 1-3)
  - [x] Extend `skillsApi` with open/delete operations.
  - [x] Add open-folder and delete actions for local library skills.
  - [x] Show recoverable feedback for opener/delete failures.
  - [x] Add visible capability classification for local skills, Skill Store placeholder and future remote plugin placeholder.

- [x] Task 5: Add focused tests (AC: 1-3)
  - [x] Test opening a skill folder calls the shared API and reports success/failure.
  - [x] Test deleting a skill removes it from the library and current workspace links while preserving the source path semantics.
  - [x] Test local/store/plugin capability classes are visually and semantically distinct.
  - [x] Test Rust delete/open logic preserves source folders and removes workspace link records.

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

Story 6.3 owns opening local skill folders, deleting app library records and clarifying capability classes in the skill area. It does not implement remote Skill Store installation, plugin API execution, skill content editing, source folder deletion, workspace link creation/unlinking beyond cleanup after library delete, or roadmap features.

### Product Policy

- Delete removes the app library record only; it must not delete the user-owned source folder.
- If a current workspace root is supplied, delete also removes that skill from `.orchlet/skills/skill-links.json` and removes only safe symlink artifacts.
- Open folder uses the stored `sourcePath`; missing or opener failures return recoverable errors.
- Capability classification must distinguish:
  - local skills: installed/imported local folders;
  - Skill Store: MVP placeholder only;
  - remote plugins: future capability placeholder only.

### Current Implementation State

- Story 6.1 added app-data skill library import/list and `src/shared/api/skills-api.ts`.
- Story 6.2 added workspace skill link/list/unlink, `.orchlet/skills/skill-links.json`, symlink fallback and workspace skill UI.
- Current UI keeps the skill management surface compact inside `WorkspaceSelectionPage`.
- Raw Tauri APIs remain isolated to `src/shared/api/*` and Rust gateway modules.

### Technical Requirements

- Extend `src-tauri/src/contracts/skill.rs` and generated `src/contracts/generated/skill.ts`.
- Extend `src-tauri/src/app/skills/mod.rs` and `src-tauri/src/gateway/skills_commands.rs`.
- Reuse `workspace_skill_link_store` cleanup behavior for current workspace link removal.
- Add shared frontend methods in `src/shared/api/skills-api.ts`.
- Add contract fixtures under `fixtures/contracts/skill` and update manifest validators.

### Architecture Compliance

- IPC payload fields must be camelCase via serde/ts-rs.
- App data and workspace data remain authoritative; frontend query caches update only from command results.
- Opener failures must be recoverable `AppError`s.
- Source code, skill contents and plugin data are not uploaded or executed.

### UX Requirements

- Local skill rows should expose familiar icon buttons for open/delete/link actions.
- Delete must make clear that the source folder is not removed.
- Skill Store and remote plugin placeholders should be disabled/placeholder states, not implied working capabilities.
- Validation, opener or persistence failures show recoverable toast feedback and leave lists consistent with last successful data.

### Relevant Files To Read Before Coding

- `_bmad-output/implementation-artifacts/6-1-import-local-skill-folder.md`
- `_bmad-output/implementation-artifacts/6-2-manage-skill-library-workspace-links.md`
- `src-tauri/src/app/skills/mod.rs`
- `src-tauri/src/gateway/skills_commands.rs`
- `src-tauri/src/contracts/skill.rs`
- `src-tauri/src/infrastructure/persistence/json_store/skill_library_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_skill_link_store.rs`
- `src/shared/api/skills-api.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `scripts/validate-contract-fixtures.mjs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 6.3 acceptance criteria and Epic 6 context.
- `_bmad-output/planning-artifacts/prd.md` - FR56, FR60, NFR8, NFR14, NFR17.
- `_bmad-output/planning-artifacts/architecture.md` - skills module ownership and typed IPC rules.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - My Skills tab open/delete and capability classification requirements.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Story 6.3 created from sprint backlog, Epic 6 spec, Story 6.1/6.2 implementation state and UX requirements for local/store/plugin capability classification.
- 2026-05-13: Implemented skill folder open and skill library delete commands, including current workspace link cleanup without deleting source folders.
- 2026-05-13: Added skill row open/delete UI and capability classification for local skills, Skill Store placeholder and future remote plugin placeholder.
- 2026-05-13: Added contract fixtures, generated bindings and Rust/frontend tests for open/delete/classification behavior.
- 2026-05-13: Verification passed: `pnpm test:frontend -- src/App.test.tsx`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt`, `cargo fmt --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Added desktop opener command for skill source folders with recoverable errors when the opener or path is unavailable.
- Added delete command that removes the app library record, cleans the current workspace link store when supplied, and preserves user source folders.
- Added local skill open/delete controls and visible capability source classification in the skill library panel.
- Added focused UI, contract and Rust coverage for open/delete/classification behavior.

### File List

- `_bmad-output/implementation-artifacts/6-3-delete-open-capability-classification.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/skill/skill-delete.error.json`
- `fixtures/contracts/skill/skill-delete.request.json`
- `fixtures/contracts/skill/skill-delete.result.json`
- `fixtures/contracts/skill/skill-open-folder.error.json`
- `fixtures/contracts/skill/skill-open-folder.request.json`
- `fixtures/contracts/skill/skill-open-folder.result.json`
- `scripts/validate-contract-fixtures.mjs`
- `src-tauri/bindings/skill.ts`
- `src-tauri/src/app/skills/mod.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/skill.rs`
- `src-tauri/src/gateway/skills_commands.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/skill.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/skills-api.ts`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 6.3 context for skill delete/open and capability classification.
- 2026-05-13: Completed skill open/delete commands, current workspace link cleanup, capability classification UI, tests, contract fixtures and release build verification.
