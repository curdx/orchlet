# Story 6.1: 导入本地技能文件夹

Status: done

## Story

As a power user,
I want to import local skill folders into the app skill library,
So that reusable local capabilities can be managed from orchlet.

## Acceptance Criteria

1. Given the user selects a local skill folder, when import runs, then the app validates the folder, stores a skill library record and shows the imported skill.
2. Given the selected folder is missing, unreadable or invalid, when import runs, then the app explains the validation failure and does not create a broken skill record.
3. Given the same folder is imported again, when duplicate detection runs, then the app updates or reports the existing skill record according to product policy.

## Tasks / Subtasks

- [x] Task 1: Add typed skill import contracts and persistence (AC: 1-3)
  - [x] Add skill library DTOs for list and import commands.
  - [x] Add a skill domain validator for local folders and `SKILL.md` metadata.
  - [x] Add app-data skill library JSON persistence with schema validation.
  - [x] Implement duplicate detection by canonical folder path; re-import updates the existing record.

- [x] Task 2: Add Tauri gateway commands and generated contract coverage (AC: 1-3)
  - [x] Add `skills_library_list` and `skills_import_folder` commands.
  - [x] Register the commands in the Tauri invoke handler.
  - [x] Add contract fixtures and generated TS bindings for skill list/import success and errors.
  - [x] Keep raw Tauri imports inside `src/shared/api/*`.

- [x] Task 3: Add shared skills API and UI import flow (AC: 1-3)
  - [x] Add `skillsApi` with desktop folder picker and browser/test fallback behavior.
  - [x] Add a "我的技能库" panel in the opened workspace surface.
  - [x] Show imported skills with name, local path and import/update status.
  - [x] Show validation failures as recoverable toast feedback without adding a broken row.

- [x] Task 4: Add data-integrity coverage for skill library storage (AC: 1-3)
  - [x] Add skill library storage manifest category and validation check.
  - [x] Add schema/data fixtures for valid skill library JSON.
  - [x] Update data-integrity tests and fixture validators to include skill library storage.

- [x] Task 5: Add focused tests (AC: 1-3)
  - [x] Test the UI lists an imported skill after import succeeds.
  - [x] Test import validation failure keeps the empty library and shows recoverable feedback.
  - [x] Test duplicate import reports/updates the existing skill record.
  - [x] Test Rust skill library persistence rejects invalid folders and preserves valid records.

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

Story 6.1 owns importing a local folder into the app skill library only. It does not implement delete/open folder actions, workspace skill link/unlink, symlink fallback, skill detail editing, remote skill store install, plugin marketplace, permission grants or execution of skill contents.

### Product Policy

- A valid local skill folder must be an existing readable directory with a root `SKILL.md`.
- `SKILL.md` frontmatter may provide `name` and `description`; if `name` is absent, use the folder name.
- Duplicate detection is based on canonical folder path. Re-import updates the existing record metadata and returns `updatedExisting` instead of creating a second record.
- Import stores local metadata only; no source code, skill content or path is uploaded.

### Current Implementation State

- The app currently has workspace, chat, member/contact, terminal, orchestration, notification and data-integrity domains.
- No `skills` frontend API, Rust contracts, gateway command or app-data store exists yet.
- Raw Tauri APIs are isolated to `src/shared/api/*` and Rust gateway modules.
- Storage manifest currently covers workspace, members, contacts, chat and terminal tabs; skill storage is still future-owned.

### Technical Requirements

- Add skill contracts under `src-tauri/src/contracts/skill.rs` and re-export them through `contracts/mod.rs`.
- Add Rust domain/app modules under `src-tauri/src/domain/skill` and `src-tauri/src/app/skills`.
- Add JSON persistence under `src-tauri/src/infrastructure/persistence/json_store`.
- Add `src-tauri/src/gateway/skills_commands.rs` and register commands in `src-tauri/src/lib.rs`.
- Add shared frontend wrapper `src/shared/api/skills-api.ts`; use Tauri dialog only in this wrapper.
- Keep UI implementation compact inside the current `WorkspaceSelectionPage` pattern until dedicated feature slices are introduced.

### Architecture Compliance

- IPC payload fields must be camelCase via serde/ts-rs.
- App data writes must use schema-versioned JSON and recoverable `AppError` failures.
- Frontend caches are not authoritative; the Rust app-data store is authoritative for desktop runtime.
- Browser fallback is only for local web preview/tests and must not claim real desktop import.
- Contract fixtures must include request, success and error examples and stay referenced in `fixtures/contracts/contract-fixtures.manifest.json`.

### UX Requirements

- Opened workspace surface should expose "我的技能库".
- Empty library text must be `我的技能库里暂无可用技能`.
- Import action label should be `导入技能`.
- During import/refresh, disable relevant buttons.
- Validation or persistence failures show recoverable toast feedback and leave the library list unchanged.

### Relevant Files To Read Before Coding

- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `src/shared/api/workspace-api.ts`
- `src/shared/api/notification-api.ts`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 6.1 acceptance criteria and Epic 6 context.
- `_bmad-output/planning-artifacts/prd.md` - FR55, FR72, FR73, NFR8, NFR14, NFR17, NFR27.
- `_bmad-output/planning-artifacts/architecture.md` - skills module ownership, typed IPC and storage manifest rules.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - skill management and skill store empty/error/import states.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Story 6.1 created from sprint backlog, Epic 6 spec, PRD/UX/architecture skill requirements and existing workspace/API/storage patterns.
- 2026-05-13: Implemented local skill import contracts, domain validation, app-data JSON persistence, Tauri gateway commands and shared frontend API.
- 2026-05-13: Added "我的技能库" import panel with success, duplicate update and recoverable validation failure feedback.
- 2026-05-13: Added contract, data-integrity, frontend and Rust persistence coverage for skill library import/list behavior.
- 2026-05-13: Verification passed: `pnpm test:frontend -- src/App.test.tsx`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt`, `cargo fmt --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm build`, `pnpm test`, IPC boundary scan and `pnpm tauri build`.

### Completion Notes List

- Added local folder skill import with root `SKILL.md` validation, frontmatter metadata parsing, canonical-path duplicate detection and update-on-reimport behavior.
- Added schema-versioned skill library JSON storage and data-integrity validation for app-data skill records.
- Added typed Rust/TypeScript contracts, contract fixtures and frontend API wrappers while keeping raw Tauri imports isolated under `src/shared/api/*`.
- Added workspace skill library UI, including empty state, import action, imported/updated status and recoverable error toasts.

### File List

- `_bmad-output/implementation-artifacts/6-1-import-local-skill-folder.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/skill/skill-import-folder.error.json`
- `fixtures/contracts/skill/skill-import-folder.request.json`
- `fixtures/contracts/skill/skill-import-folder.result.json`
- `fixtures/contracts/skill/skill-library-list.error.json`
- `fixtures/contracts/skill/skill-library-list.request.json`
- `fixtures/contracts/skill/skill-library-list.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/app-data/skills/skill-library.json`
- `fixtures/schema/skills-v1/skill-library.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/skill.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/app/skills/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/skill.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/domain/skill/mod.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/gateway/skills_commands.rs`
- `src-tauri/src/infrastructure/persistence/json_store/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/skill_library_store.rs`
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
- `src/shared/api/index.ts`
- `src/shared/api/skills-api.ts`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-13: Created Story 6.1 context for local skill folder import.
- 2026-05-13: Completed local skill folder import implementation, tests, data-integrity coverage and release build verification.
