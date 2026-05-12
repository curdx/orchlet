# Story 1.6: Storage manifest、schema version 与 validation 报告

Status: done

## Story

As a maintainer and power user,
I want orchlet data locations and schema health to be explicit,
so that data problems can be found without silent corruption.

## Acceptance Criteria

1. Given workspace storage foundation is initialized, when the app creates or reads app settings, recent workspaces, workspace registry and `.orchlet/workspace.json`, then each implemented storage category has a manifest entry, owner, path policy and schema/version marker.
2. Given a later story introduces a new persisted domain such as contacts, chat, avatar library, skills, roadmap, terminal snapshots or diagnostics, when that story is implemented, then it must add its own manifest entry, migration or file schema marker, fixture and validation check instead of relying on upfront placeholder tables.
3. Given the user or system runs schema validation, when validation completes, then the app produces a data integrity report for currently implemented storage categories with passed checks, failed checks and affected data paths.
4. Given validation is long-running, when the user navigates or cancels, then validation is interruptible or batched and does not freeze the main interface.

## Tasks / Subtasks

- [x] Task 1: Add typed storage manifest and data-integrity contracts (AC: 1-4)
  - [x] Add DTOs in `src-tauri/src/contracts`, preferably a focused `data_integrity.rs`, and export them from `contracts/mod.rs`.
  - [x] Include types for storage manifest entries, path policies, storage formats, privacy classes, validation status/severity, validation checks, data integrity report and validation request/result.
  - [x] Include `schemaVersion`, report id, generated timestamp, checked storage categories, pass/fail/skip counts and affected paths.
  - [x] Keep IPC field casing `camelCase` through serde/`ts-rs`; regenerate TypeScript bindings with `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`.
  - [x] Do not hand-edit generated TypeScript files.

- [x] Task 2: Implement a source-of-truth storage manifest for current persisted data only (AC: 1-2)
  - [x] Add `src-tauri/src/infrastructure/persistence/storage_manifest.rs`.
  - [x] Add manifest entries for currently implemented storage:
    - workspace-local `.orchlet/workspace.json`, owner `workspace`, format `json`, schema version `WORKSPACE_SCHEMA_VERSION`.
    - app-data `workspace-registry.json`, owner `workspace`, format `json`, schema version `WORKSPACE_REGISTRY_SCHEMA_VERSION`; note that recent workspaces are derived from this file, not a separate store.
    - app-data `workspace-fallbacks.json`, owner `workspace`, format `json`, schema version `WORKSPACE_FALLBACK_SCHEMA_VERSION`.
  - [x] Record path policy for each entry: workspace-local relative path vs app-data file name; do not persist absolute paths inside the manifest itself unless the report resolves them at runtime.
  - [x] Explicitly do not add placeholder entries/tables for chat, contacts, avatar library, skills, roadmap, terminal snapshots or diagnostics; those future stories must add their own manifest entries and validation checks.
  - [x] Do not implement full persisted app settings from Story 7.3. Story 1.5 theme/language preferences are runtime-only; if no settings file exists yet, document that as not implemented rather than faking a store.

- [x] Task 3: Add Rust data-integrity validation use case (AC: 1-4)
  - [x] Add `src-tauri/src/app/data_integrity/mod.rs` and expose it from `src-tauri/src/app/mod.rs`.
  - [x] Validate manifest completeness for the current stores by checking that each implemented JSON store has exactly one manifest entry.
  - [x] Validate app-data stores by reusing existing store loaders/validators:
    - `workspace_registry_store::load_workspace_registry`.
    - `workspace_fallback_store::load_workspace_fallbacks`.
  - [x] Validate workspace metadata only when a workspace root is provided or can be derived from current runtime context; do not scan arbitrary project folders.
  - [x] Treat missing optional app-data files as pass/empty state when the corresponding loader currently returns defaults; treat invalid JSON/fields/schema as failed checks with the existing `AppError` details.
  - [x] Each check must be independent so one failed category does not prevent the report from returning the remaining category results.
  - [x] Keep the initial check set small and synchronous-safe, but model the report as batched/check-based so future long-running domains can split work without changing the contract. Do not add a fake background worker unless the implementation actually needs it.

- [x] Task 4: Add gateway command and frontend API boundary (AC: 3-4)
  - [x] Add a typed command such as `data_integrity_validate` in `src-tauri/src/gateway`, registered in `src-tauri/src/lib.rs`.
  - [x] Add `src/shared/api/data-integrity-api.ts` and export it from `src/shared/api/index.ts`.
  - [x] Keep raw Tauri `invoke` isolated to `src/shared/api/client.ts`; feature/page code must call the typed API facade.
  - [x] If the command uses active workspace context, compose with `WindowContextRuntimeState` rather than duplicating workspace identity in frontend state.
  - [x] Do not add broad filesystem, shell, opener or SQLite/plugin permissions to make validation pass.

- [x] Task 5: Surface a minimal validation report UI without creating a diagnostics product area (AC: 3-4)
  - [x] Add a compact data integrity action in the existing workspace surface, likely `WorkspaceSelectionPage`, using the same toast/error style already established.
  - [x] Show report summary: total checks, passed, failed, skipped and generated time.
  - [x] Show failed checks with storage category, affected path and user action. Keep path text selectable/breakable and avoid hiding the actionable part.
  - [x] While validation is pending, disable only the validation action; do not freeze workspace open, recent list, window mode controls or theme/language controls.
  - [x] Do not implement diagnostics history, export, repair, backup/apply flows, settings pages or long-term report persistence; later diagnostics/settings stories own those scopes.

- [x] Task 6: Add fixtures/tests for manifest and validation report behavior (AC: 1-4)
  - [x] Add Rust tests for manifest entries, manifest completeness, valid registry/fallback/default-empty pass checks, invalid registry failure checks and valid/invalid workspace metadata checks.
  - [x] Add frontend tests for running validation, displaying pass/fail summary, failed affected paths and keeping existing workspace open/recent/read-only/file-manager behavior intact.
  - [x] If fixture directories are introduced, use architecture paths: `fixtures/schema/<case-name>/` or `fixtures/data-integrity/<case-name>/`; keep them minimal and focused on current JSON stores.
  - [x] Do not create contract/data fixtures for future domains that do not exist yet.

- [x] Task 7: Verification and completion evidence (AC: 1-4)
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `cargo fmt --check` and `cargo check` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.
  - [x] Record that validation currently covers implemented JSON stores only; do not claim SQLite/chat/diagnostics validation until those domains exist.

### Review Findings

- [x] [Review][Patch] Manifest completeness check was reported under `workspaceRegistry` instead of its own storage manifest category [src-tauri/src/app/data_integrity/mod.rs:101] — fixed by adding `storageManifest` to the typed `StorageCategory` contract and assigning manifest checks to it.
- [x] [Review][Patch] Read-only fallback skip could apply to an unrelated requested workspace root [src-tauri/src/app/data_integrity/mod.rs:39] — fixed by only treating missing workspace metadata as an expected read-only fallback when the requested/derived root matches the active read-only workspace, with regression tests for both matching and unrelated roots.

## Dev Notes

### Scope Boundary

Story 1.6 creates storage manifest and validation/report foundations for storage that actually exists today. It must not pre-create future domain storage. The important output is a reliable manifest/check/report pattern that later stories must extend when they add durable data.

Do not implement:

- chat/member/contact/unread/notification business data or SQLite chat schema.
- terminal PTY/session/tabs/snapshots.
- skills, roadmap, avatar library or diagnostics export.
- persisted full settings/profile/theme-language preferences from Epic 7.
- old `.golutra`, old redb or old app-data import/read compatibility.
- repair/apply/backup flows beyond reporting what failed.

### Current Implementation State

- Existing JSON stores:
  - `src-tauri/src/infrastructure/persistence/json_store/workspace_metadata_store.rs` owns `.orchlet/workspace.json` reads/writes and validates via `domain::workspace::validate_workspace_metadata`.
  - `src-tauri/src/infrastructure/persistence/json_store/workspace_registry_store.rs` owns app-data `workspace-registry.json`, schema version `WORKSPACE_REGISTRY_SCHEMA_VERSION`, recent list derivation and registry validation.
  - `src-tauri/src/infrastructure/persistence/json_store/workspace_fallback_store.rs` owns app-data `workspace-fallbacks.json`, schema version `WORKSPACE_FALLBACK_SCHEMA_VERSION` and fallback validation.
- Existing workspace open flow already rejects invalid workspace metadata and registry/fallback JSON with typed recoverable `AppError`.
- Story 1.5 added Rust-owned `WindowContextRuntimeState` and frontend `windowContextApi`; validation can use active workspace context but must preserve local window identity semantics from the Story 1.5 review patch.
- Raw Tauri frontend access is allowed only under `src/shared/api`.

### Technical Requirements

- Manifest entry fields should be explicit enough for future release review: stable id, owner/domain, storage category, path policy, relative path/file name, format, schema version, reader/writer modules, privacy class, backup/validation notes and fixture requirement.
- Validation report should be data, not prose-only. Prefer machine-readable fields such as `status: passed | failed | skipped`, `severity`, `category`, `checkId`, `message`, `affectedPaths`, `userAction`, and optional `details`.
- Use existing `AppError` values as evidence inside failed checks; do not collapse them into string-only errors.
- Missing `workspace-registry.json` and `workspace-fallbacks.json` currently mean default empty documents; validation should reflect that as pass or skipped with a clear reason, not as corruption.
- Workspace metadata validation should never call refresh/write code. Use read/validate only.
- Reports may include absolute affected paths because AC asks for affected data paths; keep them local-only and do not add export/upload behavior.
- If adding fixture files, keep path contents synthetic and avoid real user paths.

### Architecture Compliance

- Rust command handlers live in `src-tauri/src/gateway`; business logic lives in `src-tauri/src/app`; storage adapters live in `src-tauri/src/infrastructure`.
- Data integrity service owns schema validation/report foundations. Do not put validation business logic in React components or gateway handlers.
- Use current architecture naming: Rust files `snake_case`, TS modules `kebab-case`, command names `snake_case`, DTO fields `camelCase`, event topics kebab-case if any events are added.
- No new Tauri plugin/capability should be necessary for current JSON validation.
- SQLite/rusqlite is the future structured storage path, but this story should not add `rusqlite` unless the implementation actually creates a real SQLite-backed current store. Do not add placeholder migrations.

### UX Requirements

- Keep the app a working tool, not a diagnostics dashboard.
- The validation action should be visible but compact, likely near workspace context/opened workspace status.
- Error copy must state what happened, impact scope and next action, matching previous toast conventions.
- Validation pending state must not block opening workspaces, recent workspace refresh/search, file-manager opening, theme/language sync or window mode controls.

### Previous Story Intelligence

- Story 1.4 established app-data fallback identity in `workspace-fallbacks.json`; preserve the rule that fallback identities are reused when a workspace later becomes writable.
- Story 1.4 code review tightened opener registration to `open_js_links_on_click(false)` and narrow `opener:allow-open-path`; do not regress opener/capability scope.
- Story 1.5 code review fixed global context events so broadcast snapshots update workspace/preferences without changing the receiving window's local mode. Do not overwrite local `currentWindow` when adding validation UI/state.
- Story 1.5 validation baseline: `pnpm test`, `pnpm build`, `cargo fmt --check`, `cargo check`, `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`, IPC boundary scan and `pnpm tauri build`.

### Project Structure Notes

- Expected new Rust modules:
  - `src-tauri/src/contracts/data_integrity.rs`
  - `src-tauri/src/app/data_integrity/mod.rs`
  - `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
  - possibly `src-tauri/src/gateway/data_integrity_commands.rs`
- Expected frontend API module:
  - `src/shared/api/data-integrity-api.ts`
- Expected frontend UI touch point:
  - `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- Generated files:
  - `src/contracts/generated/index.ts`
  - `src/contracts/generated/data_integrity.ts` if `ts-rs` exports a new file.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 1.6 ACs and Epic 1 scope.
- `_bmad-output/planning-artifacts/prd.md` - FR72, FR74, FR75; NFR7, NFR8, NFR9, NFR10, NFR27, NFR31, NFR36, NFR40.
- `_bmad-output/planning-artifacts/architecture.md` - storage layout decision, storage manifest fields, data validation flow, project structure and data-integrity ownership.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - workspace entry preservation and error/disabled-state expectations.
- `_bmad-output/implementation-artifacts/1-4-read-only-workspace-fallback-file-manager.md` - fallback JSON and opener/capability lessons.
- `_bmad-output/implementation-artifacts/1-5-multi-window-context-sync.md` - window context sync and review patch lessons.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-11: `pnpm test` passed (15 tests across 2 files).
- 2026-05-11: `pnpm build` passed.
- 2026-05-11: `cargo fmt --check` passed in `src-tauri` after applying `cargo fmt`.
- 2026-05-11: `cargo check` passed in `src-tauri`.
- 2026-05-11: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed in `src-tauri` (63 tests).
- 2026-05-11: IPC boundary scan found raw Tauri access only under `src/shared/api` boundary files/tests.
- 2026-05-11: `pnpm tauri build` passed and produced macOS app/dmg bundles; existing `com.orchlet.app` identifier warning remains.
- 2026-05-11: Code review patch validation `pnpm test` passed (15 tests across 2 files).
- 2026-05-11: Code review patch validation `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed in `src-tauri` (65 tests).
- 2026-05-11: Code review patch validation `cargo fmt --check`, `cargo check`, `pnpm build`, IPC boundary scan, and `pnpm tauri build` passed; existing `com.orchlet.app` identifier warning remains.

### Completion Notes List

- Ultimate context engine analysis completed on 2026-05-11.
- Implemented typed data-integrity/storage manifest contracts and exported TypeScript bindings.
- Added static storage manifest entries for current JSON stores only: workspace metadata, workspace registry/recent source and workspace fallback identities.
- Added Rust data-integrity validation report use case with independent checks for manifest completeness, app-data registry, app-data fallbacks and active/requested workspace metadata.
- Added `data_integrity_validate` gateway command and typed frontend `dataIntegrityApi` facade without broad new capabilities or raw Tauri usage outside `src/shared/api`.
- Added compact data integrity UI/report rendering in Workspace Selection with pass/fail/skip counts, affected paths, and toast feedback.
- Added Rust and frontend tests covering manifest completeness, valid/default stores, invalid registry failure reporting and UI failed-path rendering.
- Code review fixed manifest check categorization and constrained read-only fallback skip behavior to the matching active workspace root.
- Validation currently covers implemented JSON stores only; no SQLite/chat/diagnostics/settings persistence was added or claimed.

### File List

- `_bmad-output/implementation-artifacts/1-6-storage-manifest-schema-validation-report.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/data-integrity-api.ts`
- `src/shared/api/index.ts`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/app/window_context/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/gateway/data_integrity_commands.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/workspace_registry_store.rs`
- `src-tauri/src/infrastructure/persistence/mod.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`

## Change Log

- 2026-05-11: Created Story 1.6 context and marked ready for development.
- 2026-05-11: Implemented storage manifest, current JSON-store validation report, minimal UI, tests and validation evidence; marked ready for review.
- 2026-05-11: Completed code review patches, reran validation, and marked story done.
