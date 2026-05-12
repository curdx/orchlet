# Story 2.1: 默认 owner 与成员邀请

Status: done

## Story

As a workspace owner,
I want each workspace to have a default owner and inviteable members,
So that AI and human collaborators can be represented consistently.

## Acceptance Criteria

1. Given a workspace is opened for the first time, when member data is initialized, then a default owner member is created or backfilled exactly once.
2. Given the owner invites collaborators, when they choose assistant or member type, then the invite flow stores member type, display name and baseline status.
3. Given the owner selects a runtime for an invited member, when they choose built-in AI CLI, custom CLI or shell, then the member profile stores the selected runtime without starting a terminal until explicitly requested.

## Tasks / Subtasks

- [x] Task 1: Add member contracts and IPC facade (AC: 1-3)
  - [x] Add Rust DTOs in `src-tauri/src/contracts/member.rs` and export generated TypeScript bindings.
  - [x] Include member profile, member type/role, baseline status, runtime selection/profile, list/init request/result and invite request/result.
  - [x] Add gateway commands under `src-tauri/src/gateway/member_commands.rs`.
  - [x] Add frontend API boundary `src/shared/api/member-api.ts`; keep raw Tauri access inside `src/shared/api`.

- [x] Task 2: Add member domain/use case and SQLite persistence (AC: 1-3)
  - [x] Add domain validation in `src-tauri/src/domain/member`.
  - [x] Add app use cases in `src-tauri/src/app/members`.
  - [x] Add SQLite repository/infrastructure under `src-tauri/src/infrastructure/persistence/sqlite`.
  - [x] Add migration file for member profiles only; do not create chat/conversation/message/terminal tables.
  - [x] Ensure default owner is inserted exactly once per workspace id and subsequent init/list calls do not duplicate it.
  - [x] Store invited assistant/member display name, status and runtime profile without starting terminal sessions.

- [x] Task 3: Extend storage manifest, data-integrity and fixtures for member storage (AC: 1-3)
  - [x] Add a storage manifest entry for workspace member profiles with owner/path/format/schema/fixture metadata.
  - [x] Extend validation report with a member storage check for active/requested workspace context.
  - [x] Add schema/data fixtures for members SQLite schema metadata and member profile examples.
  - [x] Add contract fixtures for member list/init and invite commands.
  - [x] Keep Story 1.7 smoke/fixture checks green after adding the new domain.

- [x] Task 4: Add minimal UI for owner/member invite in existing workspace surface (AC: 1-3)
  - [x] Load members after workspace open or from active window context.
  - [x] Show default owner and invited members grouped by role/status in a compact member panel.
  - [x] Provide invite controls for assistant/member type, display name and runtime selection.
  - [x] Confirm runtime is saved but terminal launch remains a future action.
  - [x] Preserve existing workspace open, recent, data-integrity and window mode behavior.

- [x] Task 5: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `pnpm build`.
  - [x] Run `cargo fmt --check`, `cargo check` and `cargo test` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run IPC boundary scan.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 2.1 starts the member domain. It must not implement chat conversations, private chat, member actions, permissions/isolation, multiple-instance invite, terminal opening, CLI detection, terminal session lifecycle, message dispatch, unread, notification jump or settings-managed CLI paths.

### Current Implementation State

- Story 1.7 created contract/schema/smoke fixture scaffolding.
- Story 1.6 added storage manifest and data-integrity checks for current JSON stores.
- No member domain, member API, member UI, SQLite repository or migrations currently exist.
- Current UI surface is `WorkspaceSelectionPage`; it already tracks opened workspace state, window context, data-integrity report and toasts.

### Technical Requirements

- Member storage should follow architecture: SQLite behind repository/app boundaries, explicit migration file, camelCase IPC DTOs, snake_case DB columns.
- Workspace id for member records is the workspace metadata `projectId`.
- Default owner should be deterministic/idempotent per workspace, not a new owner on every app open.
- Invited members should have distinct ULID ids, role/type `assistant` or `member`, display name, baseline status and runtime selection.
- Runtime selection must be data only. Do not start PTY, shell, terminal session, tabs or xterm.
- Add storage manifest, fixtures and validation checks when adding the persisted member DB.

### Architecture Compliance

- Rust command handlers live in `gateway`; use cases live in `app`; validation/domain types live in `domain`; SQLite lives in `infrastructure`.
- Frontend feature/page code must call `src/shared/api/member-api.ts`; no raw Tauri calls outside `src/shared/api`.
- No Tauri capabilities should be required for this story.
- The database must not include future chat/contact/conversation/message/terminal tables.

### Previous Story Intelligence

- Story 1.4 tightened opener/capability scope; do not regress it.
- Story 1.5 fixed window context sync so remote snapshots do not overwrite local window identity.
- Story 1.6 requires every new persisted domain to add its own manifest entry, schema marker/fixture and validation check.
- Story 1.7 requires contract fixtures and schema/data fixtures to stay automated.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 2.1 ACs and Epic 2 scope.
- `_bmad-output/planning-artifacts/prd.md` - FR10, FR11, FR12; NFR26, NFR27, NFR31, NFR35, NFR36, NFR37.
- `_bmad-output/planning-artifacts/architecture.md` - SQLite decision, repository boundaries, naming conventions and member mapping.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Chat workbench member sidebar and invite modal expectations.
- `_bmad-output/implementation-artifacts/1-6-storage-manifest-schema-validation-report.md` - manifest/data-integrity extension requirement.
- `_bmad-output/implementation-artifacts/1-7-test-contract-fixture-desktop-smoke-scaffolding.md` - fixture/test scaffold requirements.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: `cargo check` passed after adding `rusqlite` SQLite persistence and member IPC/app layers.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --lib contracts:: -- --nocapture` passed during contract generation and exported member/data-integrity bindings.
- 2026-05-12: `pnpm test:frontend` passed with 16 frontend tests after adding owner/member invite UI coverage.
- 2026-05-12: `cargo test app::members --lib` passed with default owner idempotency plus built-in/custom CLI/shell runtime persistence tests.
- 2026-05-12: `cargo test app::data_integrity --lib` passed after fixing requested-vs-active workspace member validation semantics.
- 2026-05-12: `cargo fmt --check` and `cargo check` passed in `src-tauri`.
- 2026-05-12: `cargo test` passed: 79 unit tests, 3 contract fixture tests, 7 schema/data fixture tests and 1 smoke scaffold test.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed with the full Rust test set and regenerated bindings.
- 2026-05-12: `pnpm test` passed: frontend, contract fixtures, data-integrity/schema fixtures and smoke scaffold checks.
- 2026-05-12: `pnpm build` passed.
- 2026-05-12: IPC boundary scan found raw Tauri usage only in `src/shared/api` files and their tests.
- 2026-05-12: `pnpm tauri build` passed and produced macOS `.app` and `.dmg`; existing `com.orchlet.app` identifier warning remains non-blocking.

### Completion Notes List

- Added the member contract surface, Rust gateway commands and frontend member API boundary while keeping raw Tauri access inside `src/shared/api`.
- Added member domain validation, app use cases and SQLite-backed repository/migration for member profiles only.
- Workspace open and member list now initialize/backfill exactly one default owner per workspace id.
- Inviting assistant/member profiles stores role/type, display name, offline baseline status and runtime selection data without terminal startup/session behavior.
- Extended storage manifest, data-integrity validation and fixtures for `member.profiles`, including active/requested workspace edge cases.
- Added compact member UI in the existing workspace surface with owner/assistant/member grouping and invite controls for built-in AI CLI, custom CLI and shell runtime profiles.
- Added frontend, Rust unit, contract fixture and schema/data fixture coverage for the new member domain.
- Review scan found no broad Tauri capability expansion, no raw frontend IPC outside `src/shared/api`, and no chat/conversation/message/terminal persistence tables.

### File List

- `_bmad-output/implementation-artifacts/2-1-default-owner-member-invitation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/data-integrity/data-integrity-validate.result.json`
- `fixtures/contracts/member/member-invite.error.json`
- `fixtures/contracts/member/member-invite.request.json`
- `fixtures/contracts/member/member-invite.result.json`
- `fixtures/contracts/member/members-list.error.json`
- `fixtures/contracts/member/members-list.request.json`
- `fixtures/contracts/member/members-list.result.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/schema/members-v1/member-profiles.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src/App.test.tsx`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/member.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/index.ts`
- `src/shared/api/member-api.ts`
- `src-tauri/Cargo.lock`
- `src-tauri/Cargo.toml`
- `src-tauri/bindings/data_integrity.ts`
- `src-tauri/bindings/member.ts`
- `src-tauri/migrations/workspace/202605112300__members.sql`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/members/mod.rs`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/member.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/domain/member/mod.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/gateway/member_commands.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/infrastructure/persistence/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/workspace_database.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-11: Created Story 2.1 context and marked ready for development.
- 2026-05-11: Started implementation.
- 2026-05-12: Implemented member contracts, SQLite persistence, manifest/data-integrity fixtures, invite UI and verification coverage.
- 2026-05-12: Completed review with no required follow-up patches and marked story done.

## Senior Developer Review (AI)

Review Date: 2026-05-12

Outcome: Approve

Findings: None.

Review Notes:

- Default owner creation is idempotent and backed by both repository logic and a unique partial index on `(workspace_id)` for owner rows.
- Member invites persist role/type, display name, offline baseline status and built-in/custom/shell runtime profile data only; no terminal startup, PTY, tabs or session state was added.
- Storage manifest and data-integrity checks now include `member.profiles`; requested workspace roots do not accidentally validate unrelated active workspace member databases, while matching read-only fallback roots can still use active workspace identity.
- Frontend member UI calls only `src/shared/api/member-api.ts`; IPC scan shows raw Tauri usage remains inside `src/shared/api` and tests.
- SQLite migration creates only `schema_migrations` and `members`; no chat, conversation, message, contact, terminal or notification persistence was introduced.
