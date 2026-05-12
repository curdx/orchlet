# Story 2.3: 全局联系人与私聊入口

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to manage global contacts and start private conversations,
so that recurring collaborators are available across workspaces.

## Acceptance Criteria

1. Given the user opens the contacts area, when they create, edit or delete a contact, then the contact list persists the change in global application data.
2. Given a member or contact exists, when the user starts a private chat from that entry, then the app creates or reuses the private conversation for that participant.
3. Given an invite flow is shown, when the user chooses project member invite versus administrator/contact invite, then the UI labels and stored records distinguish the two invitation types.

## Tasks / Subtasks

- [x] Task 1: Add contact and private-conversation contracts/API facades (AC: 1-3)
  - [x] Add Rust DTOs for contacts and private conversation start/reuse under `src-tauri/src/contracts`, export generated TypeScript into `src/contracts/generated`, and do not hand-edit generated files.
  - [x] Use explicit command names unless a conflict is discovered: `contacts_list`, `contact_create`, `contact_update`, `contact_delete`, and `chat_private_conversation_start`.
  - [x] Add typed frontend facades `src/shared/api/contact-api.ts` and `src/shared/api/chat-api.ts` with methods `listContacts`, `createContact`, `updateContact`, `deleteContact`, and `startPrivateConversation`; feature/page code must not call raw Tauri `invoke`.
  - [x] Add command fixtures under `fixtures/contracts/contact/` and `fixtures/contracts/chat/`, update `fixtures/contracts/contract-fixtures.manifest.json`, `scripts/validate-contract-fixtures.mjs`, `tests/contract`, and `src-tauri/tests/contract_fixtures.rs`.
  - [x] Use `camelCase` IPC fields and structured `AppError`; no string-prefix error contracts.

- [x] Task 2: Persist global contacts in app data (AC: 1, 3)
  - [x] Add a global app-data SQLite repository, e.g. `src-tauri/src/infrastructure/persistence/sqlite/global_database.rs`, using a stable app-data path such as `global/orchlet.sqlite`.
  - [x] Add `src-tauri/migrations/global/<timestamp>__contacts.sql` with `schema_migrations` and `contacts` tables.
  - [x] Contact records must include a ULID `contactId`, `displayName`, `contactKind` (`contact` or `administrator`), `inviteSource` (`adminContactInvite`), optional `notes`/`sourceLabel`, and `createdAtMs`/`updatedAtMs`.
  - [x] Validate display names consistently with member display names: trim whitespace, reject empty names, and cap length at 80 characters unless a narrower domain reason is added.
  - [x] Add list/create/update/delete use cases; delete must be explicit and recoverable on missing ids.

- [x] Task 3: Start or reuse private conversations from members and contacts (AC: 2)
  - [x] Add a workspace SQLite migration such as `<timestamp>__private_conversations.sql` for the first real chat-domain table.
  - [x] Store private conversations in `conversations` with at least: `id`, `workspace_id`, `kind='private'`, `title`, `participant_kind` (`member` or `contact`), `participant_id`, `created_at_ms`, `updated_at_ms`, and `last_activity_at_ms`.
  - [x] Add a unique index that reuses one private conversation per `workspace_id + participant_kind + participant_id`.
  - [x] Starting from a member must validate the member exists in that workspace. Starting from a contact must validate the contact exists in global app data.
  - [x] Do not add messages, default channels, group chats, unread counts, read positions, outbox, terminal dispatch, or notification behavior in this story.

- [x] Task 4: Extend member/admin/contact UI entry points without building full chat (AC: 1-3)
  - [x] Extend the current member action menu with `发送消息` for non-owner members; it should call the private-conversation API and surface the returned conversation id/title.
  - [x] Add a compact contacts area to the existing workspace surface or a small `Friends`/contacts panel, with create/edit/delete and `发送消息` actions.
  - [x] Keep existing project member invite on `member_invite`; represent administrator/contact invite through contact records with `inviteSource='adminContactInvite'`.
  - [x] Add local admin display support if the `以管理员身份邀请` UI is visible: extend `MemberRole` with `admin`, member sorting, UI grouping, fixtures, and tests. Admin must be local workspace metadata only and must not imply elevated OS or server authority.
  - [x] Distinguish the UI labels clearly: project invite labels create workspace assistant/member records; administrator/contact labels create global contact records and, if admin is selected, a local admin member record. No remote account, billing, server permissions, invite links, or team authentication.
  - [x] Use `lucide-react` icons and ensure icon-only controls have `aria-label` and tooltip support.

- [x] Task 5: Extend storage manifest, schema/data fixtures and validation (AC: 1-2)
  - [x] Add storage manifest entries for implemented contact and conversation stores only.
  - [x] Extend `StorageOwner`/`StorageCategory` as needed for contacts and chat/conversations.
  - [x] Add validation checks for contacts and private conversations; checks must be independent so one failed category does not hide other results.
  - [x] Update schema fixtures, data-integrity report fixtures, `scripts/validate-data-fixtures.mjs`, and `src-tauri/tests/schema_data_fixtures.rs`.
  - [x] Preserve the Story 1.6 rule: do not add placeholder storage entries/tables for future message, unread, notification, terminal, skill, roadmap, avatar, or diagnostics domains.

- [x] Task 6: Verification and completion evidence (AC: 1-3)
  - [x] Run `pnpm test`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `pnpm build`.
  - [x] Run `cargo fmt --check`, `cargo check`, and `cargo test` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

### Review Findings

- [x] [Review][Patch] Administrator/contact invite did not create the required local admin member record — fixed by adding optional `workspaceId` to `contact_create`, returning `adminMember`, creating a local `MemberRole::Admin` record for administrator contact creation, refreshing the members panel, and extending fixtures/tests.

## Dev Notes

### Scope Boundary

Story 2.3 introduces global contacts and the first private-conversation entry point. It must not become a full chat implementation.

Do not implement:

- default channel creation, group chat membership, conversation list ordering, pin/mute/rename/clear/delete actions;
- message send, history pagination, read positions, unread counts, mentions inside the composer, emoji, attachments, quick prompts or `@all`;
- terminal opening, terminal sessions, terminal dispatch, outbox, notifications, tray updates or diagnostics export;
- remote accounts, team membership, billing/server permissions, remote invite links or authentication;
- old `.golutra`, old `contacts.json`, old redb, or old app-data compatibility.

### Current Implementation State

- Story 2.1 and Story 2.2 implemented member foundations:
  - `members_list`, `member_invite`, and `member_remove` commands.
  - `src/shared/api/member-api.ts` as the only frontend member IPC facade.
  - Workspace SQLite at `app_data/workspaces/<workspaceId>/orchlet.sqlite`.
  - Member migrations `202605112300__members.sql` and `202605120930__member_permissions.sql`.
  - `MemberProfile` currently has `owner`, `assistant`, and `member` roles with runtime, permissions and isolation metadata.
- `WorkspaceSelectionPage` is still the active UI surface. It already opens workspaces, shows members, invites assistant/member instances, mentions via a toast placeholder, and removes members.
- There is no contact domain, chat domain, conversation repository, chat API facade, contacts UI, admin role, message table, or conversation list yet.
- Data-integrity validation currently covers workspace metadata, workspace registry, workspace fallbacks, member profiles and storage manifest completeness.

### Technical Requirements

- Use ULID strings for `contactId` and `conversationId`; keep timestamps as integer milliseconds.
- Use `rusqlite` behind repository/use-case boundaries. Do not perform durable writes from React or gateway handlers.
- Global contacts should live in global app data, not in a workspace directory, so the same contact can be used across workspaces.
- Private conversations are workspace-scoped. The same contact can produce one private conversation per workspace.
- Conversation reuse must be deterministic; repeated "send message" actions for the same member/contact in the same workspace return the existing private conversation.
- The private conversation start request should accept `participantKind: "member" | "contact"` and `participantId`; the result should include `conversationId`, `workspaceId`, `participantKind`, `participantId`, `title`, `createdAtMs`, `updatedAtMs`, and a boolean such as `created` to distinguish create versus reuse.
- Contact deletion should not silently delete existing workspace private conversation records unless a task explicitly implements that cascade. Prefer preserving conversations and returning a clear UI note.
- If admin/contact invite creates a local admin member, treat it as local workspace metadata only. It must not grant desktop, OS, server, billing or account privileges.

### Architecture Compliance

- Rust command handlers live in `src-tauri/src/gateway`; use cases live in `src-tauri/src/app`; validation/domain rules live in `src-tauri/src/domain`; SQLite adapters live under `src-tauri/src/infrastructure/persistence/sqlite`.
- Generated contract files live in `src/contracts/generated` and must be regenerated by `ts-rs`, not edited manually.
- Frontend code calls only `src/shared/api` facades for IPC.
- SQLite tables use plural `snake_case`; migration files use `YYYYMMDDHHMM__short_description.sql`; indexes use `idx_...` or `uq_...`.
- Contract fixtures live under `fixtures/contracts/<domain>/`; schema/data fixtures live under `fixtures/schema/<case-name>/` and `fixtures/data-integrity/<case-name>/`.
- No new Tauri plugin or broad capability permission should be necessary for local SQLite/contact/conversation operations.

### UX Requirements

- Follow the UX spec's Members Sidebar, Invite Menu, Invite Admin Modal, Invite Friends Modal and Friends Page behavior where relevant.
- Contacts area should support visible create/edit/delete and private-chat entry states without a marketing or explanatory landing section.
- Member rows should show `发送消息` as a real action once the private-conversation API exists; mention/remove behavior from Story 2.2 must remain intact.
- Destructive contact deletion needs explicit confirmation at the UI boundary.
- Error copy should state what happened, impact scope and next action via the existing toast pattern.

### Previous Story Intelligence

- Story 2.2 established deterministic multi-instance member labels, permission/isolation defaults, owner non-removal and explicit UI confirmation for removal. Preserve these behaviors.
- Story 2.2 deliberately avoided contacts, private chat, real mention insertion, terminal opening and chat/terminal cascade behavior; 2.3 should add only contacts and private conversation entry.
- Story 1.6 requires every newly persisted domain to add its own manifest entry, schema marker, fixture and validation check when introduced.
- Story 1.7 requires contract/schema fixture checks and smoke matrix honesty; do not mark unsupported chat/message flows as passing.

### Relevant UPDATE Files To Read Before Coding

- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`: current workspace/member surface, invite form, member action menu and toast patterns. Preserve workspace open, recent workspace, data integrity, window context and member behavior.
- `src/App.test.tsx`: current frontend coverage for member invite, action menu, data integrity and workspace flows. Extend focused tests here before adding a new UI harness.
- `src/shared/api/index.ts`, `src/shared/api/member-api.ts`, `src/shared/api/client.ts`: typed IPC facade pattern and raw invoke boundary.
- `src-tauri/src/contracts/member.rs`, `src-tauri/src/contracts/data_integrity.rs`, `src-tauri/src/contracts/mod.rs`: DTO/export patterns and enum extension requirements.
- `src-tauri/src/gateway/member_commands.rs`, `src-tauri/src/gateway/mod.rs`, `src-tauri/src/lib.rs`: command registration pattern.
- `src-tauri/src/app/members/mod.rs`, `src-tauri/src/domain/member/mod.rs`, `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`: validation, repository and migration style to reuse.
- `src-tauri/src/infrastructure/persistence/sqlite/workspace_database.rs`: workspace database path/configuration pattern for private conversations.
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`, `src-tauri/src/app/data_integrity/mod.rs`: storage manifest and validation extension points.
- `scripts/validate-contract-fixtures.mjs`, `scripts/validate-data-fixtures.mjs`, `src-tauri/tests/contract_fixtures.rs`, `src-tauri/tests/schema_data_fixtures.rs`: fixture enforcement that must be extended with new domains.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 2.3 ACs and Epic 2 scope.
- `_bmad-output/planning-artifacts/prd.md` - FR14, FR15, FR18, FR21; NFR10, NFR14, NFR26, NFR27, NFR31, NFR35, NFR36, NFR39.
- `_bmad-output/planning-artifacts/architecture.md` - SQLite/rusqlite data architecture, typed IPC contracts, storage manifest rule, feature boundaries and naming patterns.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Members Sidebar, Invite Menu, Invite Admin Modal, Invite Friends Modal and Friends Page private-message behavior.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-11.md` - admin/contact invite MVP scope boundary: local role/contact only, no server/account/billing semantics.
- `_bmad-output/implementation-artifacts/1-6-storage-manifest-schema-validation-report.md` - future persisted domains must add their own manifest/schema/fixture checks.
- `_bmad-output/implementation-artifacts/1-7-test-contract-fixture-desktop-smoke-scaffolding.md` - contract/schema fixture and smoke scaffold expectations.
- `_bmad-output/implementation-artifacts/2-1-default-owner-member-invitation.md` - member foundation patterns.
- `_bmad-output/implementation-artifacts/2-2-multi-instance-invite-permissions-member-actions.md` - current member implementation, testing evidence and review scope boundaries.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm test:frontend` - passed: 2 frontend test files, 18 tests.
- `pnpm test:contracts` - passed: 10 contract fixture groups and Rust contract fixture tests.
- `pnpm test:data-integrity` - passed: schema/data fixture validation and Rust schema fixture tests.
- `cargo fmt` - applied Rust formatting.
- `cargo test` - passed: 104 lib tests, 5 contract fixture tests, 8 schema fixture tests, 1 smoke test.
- `cargo fmt --check` - passed.
- `cargo check` - passed.
- `pnpm build` - passed.
- `pnpm test` - passed full frontend/contracts/data-integrity/smoke suite.
- `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` - passed and regenerated TypeScript contracts.
- `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src` - passed with raw IPC usage limited to shared API boundary/test coverage.
- `pnpm tauri build` - passed; existing warning remains that bundle identifier `com.orchlet.app` ends with `.app`.
- Review patch verification: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`, `cargo test`, `pnpm test:frontend`, `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm build`, `cargo fmt --check`, `cargo check`, `pnpm test`, IPC boundary scan, and `pnpm tauri build` passed after adding local admin member creation.

### Completion Notes List

- Implemented global contacts with typed Rust contracts, TypeScript API facades, global SQLite storage at `global/orchlet.sqlite`, validation rules, and list/create/update/delete command coverage.
- Implemented private conversation start/reuse for workspace members and global contacts with deterministic reuse by `workspace_id + participant_kind + participant_id`.
- Extended workspace UI with contact management, member/contact `发送消息` entry points, invite-type labeling, local admin display support, confirmation/error handling, and icon accessibility.
- Resolved code review finding by making administrator contact creation also create a current-workspace local admin member when a workspace id is provided.
- Extended storage manifest, data-integrity validation, schema/data fixtures, and contract fixtures for contacts and private conversations without adding future chat/message placeholder domains.
- Preserved story scope: no messages, default channels, group chats, unread/read state, terminal dispatch, notifications, remote accounts, billing, invite links, or team authentication.

### File List

- `_bmad-output/implementation-artifacts/2-3-global-contacts-private-chat-entry.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/chat/chat-private-conversation-start.error.json`
- `fixtures/contracts/chat/chat-private-conversation-start.request.json`
- `fixtures/contracts/chat/chat-private-conversation-start.result.json`
- `fixtures/contracts/contact/contact-create.error.json`
- `fixtures/contracts/contact/contact-create.request.json`
- `fixtures/contracts/contact/contact-create.result.json`
- `fixtures/contracts/contact/contact-delete.error.json`
- `fixtures/contracts/contact/contact-delete.request.json`
- `fixtures/contracts/contact/contact-delete.result.json`
- `fixtures/contracts/contact/contact-update.error.json`
- `fixtures/contracts/contact/contact-update.request.json`
- `fixtures/contracts/contact/contact-update.result.json`
- `fixtures/contracts/contact/contacts-list.error.json`
- `fixtures/contracts/contact/contacts-list.request.json`
- `fixtures/contracts/contact/contacts-list.result.json`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/schema/contacts-v1/contact-profiles.json`
- `fixtures/schema/members-v1/member-profiles.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `src/App.test.tsx`
- `src/contracts/generated/chat.ts`
- `src/contracts/generated/contact.ts`
- `src/contracts/generated/data_integrity.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/member.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/chat-api.ts`
- `src/shared/api/client.ts`
- `src/shared/api/contact-api.ts`
- `src/shared/api/index.ts`
- `src-tauri/migrations/global/202605121200__contacts.sql`
- `src-tauri/migrations/workspace/202605121210__private_conversations.sql`
- `src-tauri/bindings/contact.ts`
- `src-tauri/src/app/chat/mod.rs`
- `src-tauri/src/app/contacts/mod.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/mod.rs`
- `src-tauri/src/contracts/chat.rs`
- `src-tauri/src/contracts/contact.rs`
- `src-tauri/src/contracts/data_integrity.rs`
- `src-tauri/src/contracts/member.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/domain/chat/mod.rs`
- `src-tauri/src/domain/contact/mod.rs`
- `src-tauri/src/domain/mod.rs`
- `src-tauri/src/gateway/chat_commands.rs`
- `src-tauri/src/gateway/contact_commands.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/contact_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/conversation_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/global_database.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/mod.rs`
- `src-tauri/src/infrastructure/persistence/storage_manifest.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`
- `tests/data-integrity/data-integrity-fixture-types.ts`

## Change Log

- 2026-05-12: Created Story 2.3 context and marked ready for development.
- 2026-05-12: Implemented global contacts, private conversation start/reuse, contact/member UI entry points, fixtures, storage manifest validation, and completion verification; marked ready for review.
- 2026-05-12: Code review found administrator contact invite missing local admin member creation; fixed the flow, regenerated contracts, reran verification, and marked story done.
