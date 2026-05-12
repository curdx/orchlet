# Story 2.2: 多实例邀请、权限与成员操作入口

Status: done

## Story

As a workspace owner,
I want to invite multiple member instances with permissions and isolation flags,
So that I can model several assistants or collaborators in one workspace.

## Acceptance Criteria

1. Given the owner chooses to invite multiple member instances, when they submit the invite, then the requested number of member instances is created with distinct ids and visible labels.
2. Given permissions or isolation flags are set during invite, when the members are saved, then those attributes are persisted and visible in member details.
3. Given a member is shown in the UI, when the user opens the member action menu, then they can mention the member or remove the member according to available permissions.

## Tasks / Subtasks

- [x] Task 1: Extend member contracts and IPC facade (AC: 1-3)
  - [x] Add generated DTO fields for instance count, instance label/index, permissions and isolation flags.
  - [x] Add remove-member request/result contract and Tauri command.
  - [x] Keep existing `member_invite` command compatible as the invite entry point while supporting multi-instance creation.
  - [x] Update frontend `src/shared/api/member-api.ts`; keep raw Tauri access inside `src/shared/api`.

- [x] Task 2: Extend member domain/use case and SQLite schema (AC: 1-3)
  - [x] Add domain validation for instance count range 1-20 and member ids.
  - [x] Add a new workspace migration for member permissions/isolation/profile labels only.
  - [x] Persist multi-instance labels, permissions and isolation flags without adding chat/conversation/message/contact/terminal tables.
  - [x] Ensure owner remains non-removable and subsequent init/list calls do not duplicate owner.
  - [x] Implement remove-member use case for invited members only; do not cascade to future chat/terminal data.

- [x] Task 3: Extend manifest, data-integrity and fixtures (AC: 1-3)
  - [x] Update member schema fixture metadata for the new migration and fields.
  - [x] Update member profile fixture examples with permissions/isolation.
  - [x] Update member contract fixtures for multi-instance invite and removal.
  - [x] Keep Story 1.7 contract/schema/smoke checks green.

- [x] Task 4: Extend existing workspace member UI (AC: 1-3)
  - [x] Add instance count controls to the invite form.
  - [x] Add permission/isolation toggles and display persisted values on member rows.
  - [x] Show distinct visible labels for multiple invited instances.
  - [x] Add member action menu with mention and remove actions according to permissions.
  - [x] Confirm removal at the UI boundary and keep existing workspace/recent/data-integrity/window behavior intact.

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

Story 2.2 extends the member domain created in Story 2.1. It must not implement chat conversations, private chat creation, real mention insertion into a composer, terminal opening, terminal session lifecycle, permissions enforcement outside stored/displayed member metadata, multiple workspace isolation runtime behavior, unread state, notifications, contacts, admin/team accounts, CLI detection or settings-managed CLI paths.

### Current Implementation State

- Story 2.1 added `members_list` and `member_invite` IPC commands plus `src/shared/api/member-api.ts`.
- Member storage currently lives in `workspaces/<workspaceId>/orchlet.sqlite`, table `members`, migration `202605112300__members.sql`.
- Current member rows include owner/assistant/member role, display name, baseline status and runtime profile.
- `WorkspaceSelectionPage` is the active UI surface. It already loads members after workspace open or active window context and shows a compact member panel.
- Storage manifest/data-integrity now has `member.profiles` and one member schema validation check.

### Technical Requirements

- Multi-instance invite should reuse `member_invite` and add `instanceCount` to the request, defaulting to 1 from callers.
- Instance labels must be deterministic for the submitted invite: count 1 uses the normalized display name; count > 1 uses `${displayName} 1`, `${displayName} 2`, etc. Each instance still gets a distinct ULID member id.
- Add typed member metadata:
  - `instanceIndex: number`
  - `instanceLabel: string`
  - `permissions: { canMention: boolean; canRemove: boolean }`
  - `isolation: { sandboxed: boolean; unlimitedAccess: boolean }`
- Invited assistants/members default to `canMention=true`, `canRemove=true`, `sandboxed=true`, `unlimitedAccess=false` unless the invite request supplies values.
- Owner must remain exactly one per workspace, status `online`, runtime `none`, `canMention=false`, `canRemove=false`, `sandboxed=false`, `unlimitedAccess=true`.
- Removing a member must reject owner removal and remove only the member row in the requested workspace. Do not attempt to remove chat, private conversation, terminal sessions or notifications in this story.
- Schema change requires a new migration file and fixture updates. Do not edit capabilities or add broad permissions.

### Architecture Compliance

- Rust command handlers live in `gateway`; use cases live in `app`; validation/domain rules live in `domain`; SQLite stays under `infrastructure/persistence/sqlite`.
- IPC DTOs must be Rust `serde(rename_all = "camelCase")` and generated to `src/contracts/generated`.
- Frontend feature/page code must call `src/shared/api/member-api.ts`; no raw Tauri access outside `src/shared/api`.
- SQLite table/column names are plural table names and snake_case columns; migration file name pattern is `YYYYMMDDHHMM__short_description.sql`.
- Contract fixtures must be updated whenever DTOs change.
- Data-integrity fixtures and schema fixtures must stay in sync with the member DB schema.

### Previous Story Intelligence

- Story 2.1 completed default owner/member invitation and proved the SQLite repository boundary with `rusqlite`.
- Story 2.1 added active/requested workspace handling in data-integrity; do not regress requested root validation semantics.
- Story 2.1 added frontend tests for owner display and invite runtime payload; extend those tests instead of creating a separate UI harness.
- Story 2.1 review found no broad Tauri capability expansion, no raw frontend IPC outside `src/shared/api`, and no chat/conversation/message/terminal persistence tables.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 2.2 ACs and Epic 2 scope.
- `_bmad-output/planning-artifacts/prd.md` - FR13, FR16, FR17.
- `_bmad-output/planning-artifacts/architecture.md` - SQLite migration rules, IPC DTO casing, repository boundaries, contract/schema fixture enforcement.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Members Sidebar, Invite Assistant/Member Modal, Member Row, member action menu.
- `_bmad-output/implementation-artifacts/2-1-default-owner-member-invitation.md` - existing member contracts, persistence and UI patterns.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-12: `cargo test app::members --lib` passed with multi-instance invite, permission/isolation persistence, default owner and remove-member coverage.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test --lib contracts:: -- --nocapture` passed and exported updated member/remove DTOs.
- 2026-05-12: `pnpm test:frontend` passed with 17 frontend tests after adding multi-instance invite and member action menu coverage.
- 2026-05-12: `pnpm test:contracts` passed with 5 contract fixture groups including `member_remove`.
- 2026-05-12: `pnpm test:data-integrity` passed after updating member schema/data fixtures for the permissions migration.
- 2026-05-12: `cargo fmt --check`, `cargo check` and `cargo test` passed in `src-tauri`; `cargo test` passed 85 unit tests, 3 contract fixture tests, 7 schema/data fixture tests and 1 smoke scaffold test.
- 2026-05-12: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed with the full Rust test set.
- 2026-05-12: `pnpm test` passed: frontend, contract fixtures, data-integrity/schema fixtures and smoke scaffold checks.
- 2026-05-12: `pnpm build` passed.
- 2026-05-12: IPC boundary scan found raw Tauri usage only in `src/shared/api` files and tests.
- 2026-05-12: `pnpm tauri build` passed and produced macOS `.app` and `.dmg`; existing `com.orchlet.app` identifier warning remains non-blocking.

### Completion Notes List

- Extended member DTOs with `instanceIndex`, `instanceLabel`, `permissions` and `isolation`, plus remove-member request/result contracts.
- Extended `member_invite` to create 1-20 distinct member instances with deterministic visible labels and distinct ULID ids.
- Added migration `202605120930__member_permissions.sql` and repository migration handling for existing Story 2.1 databases.
- Persisted and displayed mention/remove permissions plus sandbox/unlimited access flags without adding chat, contact, conversation, message, notification or terminal tables.
- Added `member_remove` IPC/use case for invited members; owner and non-removable members are rejected.
- Extended the existing workspace member panel with instance count, permission/isolation toggles, visible labels and action menu entries for `@成员` and removal.
- Removal uses an explicit UI confirmation and does not cascade to future chat/terminal data.
- Updated contract fixtures, schema fixtures and fixture validators for multi-instance invite, permissions/isolation and removal.
- Review scan found no broad Tauri capability expansion and no raw frontend IPC outside `src/shared/api`.

### File List

- `_bmad-output/implementation-artifacts/2-2-multi-instance-invite-permissions-member-actions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/data-integrity/data-integrity-validate.result.json`
- `fixtures/contracts/member/member-invite.request.json`
- `fixtures/contracts/member/member-invite.result.json`
- `fixtures/contracts/member/member-remove.error.json`
- `fixtures/contracts/member/member-remove.request.json`
- `fixtures/contracts/member/member-remove.result.json`
- `fixtures/contracts/member/members-list.result.json`
- `fixtures/schema/members-v1/member-profiles.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src/App.test.tsx`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/member.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/member-api.ts`
- `src-tauri/bindings/member.ts`
- `src-tauri/migrations/workspace/202605120930__member_permissions.sql`
- `src-tauri/src/app/members/mod.rs`
- `src-tauri/src/contracts/member.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/domain/member/mod.rs`
- `src-tauri/src/gateway/member_commands.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 2.2 context and started implementation.
- 2026-05-12: Implemented multi-instance member invite, permissions/isolation persistence, member action menu and removal flow.
- 2026-05-12: Completed review with no required follow-up patches and marked story done.

## Senior Developer Review (AI)

Review Date: 2026-05-12

Outcome: Approve

Findings: None.

Review Notes:

- Multi-instance invite creates the requested number of rows with deterministic labels and distinct ULID ids; instance count validation is bounded to 1-20.
- Permissions/isolation fields are persisted through a new migration and visible in the member panel.
- `member_remove` rejects owner and non-removable members and only deletes the member row, avoiding premature chat/terminal cascade behavior.
- Member actions stay scoped to mention/remove UI entry points; no private chat, composer mention insertion, terminal opening, session lifecycle or capability expansion was introduced.
- Contract fixtures, schema fixtures and full validation suites cover the new DTOs, migration metadata and UI behavior.
