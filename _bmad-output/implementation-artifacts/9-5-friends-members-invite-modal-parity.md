# Story 9.5: Friends, members and invite modal parity

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a user,
I want the Friends/Members surface and invite flow to match Golutra,
So that member management remains recognizable and usable after the Vue-to-React rewrite.

## Acceptance Criteria

1. Given a workspace is open, when the Friends tab is selected from SidebarNav, then the React shell shows a Golutra-style Friends surface instead of the chat bridge.
2. Given members are loaded, when the Friends surface renders, then members are grouped by project/admin/assistant/member sections with avatar, status, role, direct chat, terminal, mention, delete and status controls.
3. Given Add is clicked, when invite menu and invite modal render, then Admin/Assistant/Member menu and assistant/member runtime/access/instance modal match the Golutra visual direction and use existing React member APIs where supported.
4. Given browser preview is used outside Tauri, when assistant/member invite, status update or remove is triggered, then the flow can be exercised with persisted fallback data.

## Tasks / Subtasks

- [x] Task 1: Route SidebarNav tabs to parity surfaces (AC: 1)
  - [x] Pass active tab from `App` into the workspace parity bridge.
  - [x] Render Friends parity surface when the Friends tab is active.
  - [x] Add non-chat placeholder surfaces for store/plugins/settings so the app no longer silently shows Chat for every tab.

- [x] Task 2: Implement Friends/Members parity surface (AC: 2)
  - [x] Add Golutra-style header, member count, section headings and member cards.
  - [x] Wire direct chat, terminal, mention, remove and status update controls to existing handlers.

- [x] Task 3: Implement invite menu and first invite modal slice (AC: 3)
  - [x] Add Golutra-style Add menu with Admin, Assistant and Member choices.
  - [x] Add Admin visual modal with current unsupported-command handling.
  - [x] Add Assistant/Member modal with display name, runtime cards, instance stepper and access toggles.
  - [x] Wire assistant/member submit to existing `member_invite` contract.

- [x] Task 4: Add browser fallback for member management smoke testing (AC: 4)
  - [x] Persist browser preview members in localStorage.
  - [x] Add fallback handling for `member_invite`, `member_remove` and `member_status_update`.
  - [x] Manually verified browser assistant invite changes member count from 3 to 4.
  - [x] Add persisted browser fallback contacts for Global Friends smoke testing.

- [x] Task 5: Complete full Golutra Friends parity (AC: 2, 3)
  - [x] Replace status select with Golutra floating status/action menu placement.
  - [x] Port ManageMemberModal rename/edit behavior for workspace members and global contacts.
  - [x] Align FriendsView action menu with Golutra status-only menu.
  - [x] Add global contact status/avatar contract fields and status persistence.
  - [x] Align new administrator contact/member ids for Project vs Global Friends distinction.
  - [x] Capture Golutra reference screenshots for desktop, action menu and ManageMemberModal comparison.
  - [x] Complete remaining pixel audit against Golutra invite modals and real avatar asset loading.

## Dev Notes

This story remains in progress pending the final invite-modal pixel audit. The Friends tab is now a real, usable Golutra-style surface with invite smoke flow, Golutra-style more/status menu placement, working Manage Member rename, CSS AvatarBadge-style Friends avatars, and persisted global-contact status/id parity.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Read Golutra `App.vue`, `FriendsView.vue`, `InviteMenu.vue`, `InviteAssistantModal.vue` and `InviteAdminModal.vue`.
- 2026-05-13: Added active-tab parity routing from React `App` into `WorkspaceSelectionPage`.
- 2026-05-13: Added `FriendsMembersParity`, invite menu, admin visual modal and assistant/member invite modal.
- 2026-05-13: Added browser fallback member persistence and verified assistant invite in Chrome preview.
- 2026-05-13: Replaced direct status select with Golutra-style floating action/status menu.
- 2026-05-13: Added `member_profile_update` contract and wired Manage Member rename for project members.
- 2026-05-13: Added Global Friends visual section from React contacts and contact rename/delete/chat handlers.
- 2026-05-13: Captured Golutra Friends reference screenshots for default, action menu and ManageMemberModal.
- 2026-05-13: Removed non-Golutra Friends card/menu mention actions from the parity surface and aligned assistant role display to Member.
- 2026-05-13: Extended contact profile contract/storage with avatar and status, persisted global contact status changes, and aligned administrator contact/member ids.
- 2026-05-13: Replaced initials-only Friends avatars with Golutra-style CSS AvatarBadge visuals.
- 2026-05-14: Added persisted member avatar contract/storage, migration and browser fallback avatar hydration for real AvatarBadge parity.
- 2026-05-14: Captured Golutra invite menu, assistant modal and admin modal reference screenshots and generated React-vs-Golutra comparison images.
- 2026-05-14: Aligned React invite runtime order, labels, default selection, access toggle defaults and runtime icon gradients with Golutra `InviteAssistantModal`.
- 2026-05-14: Verified browser invite smoke after final alignment; localStorage persisted the new Gemini CLI member with `css:*` avatar and Golutra default access flags.

### Completion Notes List

- `pnpm build` passed.
- `pnpm test:frontend src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` passed with 107 tests.
- `git diff --check` passed.
- Friends preview captured at `_bmad-output/implementation-artifacts/9-5-friends-members-browser-preview.png`.
- Invite menu preview captured at `_bmad-output/implementation-artifacts/9-5-friends-members-invite-menu-preview.png`.
- Invite modal preview captured at `_bmad-output/implementation-artifacts/9-5-friends-members-invite-modal-preview.png`.
- Action/status menu preview captured at `_bmad-output/implementation-artifacts/9-5-friends-members-action-menu-preview.png`.
- Manage Member modal preview captured at `_bmad-output/implementation-artifacts/9-5-friends-members-manage-modal-preview.png`.
- Mobile Friends preview captured at `_bmad-output/implementation-artifacts/9-5-friends-members-mobile-preview.png`.
- Global Friends preview captured at `_bmad-output/implementation-artifacts/9-5-friends-members-global-friends-preview.png`.
- Golutra reference Friends preview captured at `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-browser.png`.
- Golutra reference action menu preview captured at `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-action-menu.png`.
- Golutra reference ManageMemberModal preview captured at `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-manage-modal.png`.
- `pnpm exec tsc --noEmit` passed after the action menu and rename changes.
- `pnpm exec tsc --noEmit` passed after global contact status/avatar and AvatarBadge parity changes.
- `cargo test --manifest-path src-tauri/Cargo.toml app::members::tests::updates_member_display_name_and_instance_label` passed.
- `cargo test --manifest-path src-tauri/Cargo.toml app::contacts::tests::contacts_can_be_created_updated_listed_and_deleted` passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` passed with 444 lib tests, 12 contract fixture tests, 21 schema/data fixture tests and 1 smoke scaffold test.
- `pnpm test:frontend src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` passed with 107 tests after the final Friends avatar/status changes.
- `pnpm build` passed after the final Friends avatar/status changes; Vite still reports the existing >500 kB chunk warning.
- `git diff --check` passed after the final Friends avatar/status changes.
- Golutra reference invite menu captured at `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-invite-menu.png`.
- Golutra reference assistant invite modal captured at `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-invite-modal.png`.
- Golutra reference admin invite modal captured at `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-admin-invite-modal.png`.
- React/Golutra invite menu comparison captured at `_bmad-output/implementation-artifacts/9-5-invite-menu-comparison.png`.
- React/Golutra assistant modal comparison captured at `_bmad-output/implementation-artifacts/9-5-invite-assistant-comparison.png`.
- React/Golutra admin modal comparison captured at `_bmad-output/implementation-artifacts/9-5-invite-admin-comparison.png`.
- Browser smoke after final invite alignment changed Friends count from 5 to 6; persisted last browser member as `Gemini CLI`, `runtimeId=gemini-cli`, `avatar=css:mint`, `sandboxed=false`, `unlimitedAccess=true`.
- `pnpm exec tsc --noEmit` passed after the final invite runtime alignment.
- `pnpm test:frontend src/App.test.tsx src/pages/terminal/TerminalPage.test.tsx` passed with 107 tests after updating invite access defaults to match Golutra.
- `pnpm test:contracts` passed: 80 contract fixture groups validated and 12 Rust contract fixture tests passed.
- `pnpm test:data-integrity` passed: schema/data/terminal fixtures validated and 21 Rust schema/data fixture tests passed.
- `pnpm build` passed after final invite runtime alignment; Vite still reports the existing >500 kB chunk warning.
- `cargo fmt --check --manifest-path src-tauri/Cargo.toml` passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` passed with 444 lib tests, 12 contract fixture tests, 21 schema/data fixture tests and 1 smoke scaffold test.
- `git diff --check` passed after final invite runtime alignment.

### File List

- `_bmad-output/implementation-artifacts/9-5-friends-members-invite-modal-parity.md`
- `_bmad-output/implementation-artifacts/9-5-friends-members-browser-preview.png`
- `_bmad-output/implementation-artifacts/9-5-friends-members-action-menu-preview.png`
- `_bmad-output/implementation-artifacts/9-5-friends-members-invite-menu-preview.png`
- `_bmad-output/implementation-artifacts/9-5-friends-members-invite-modal-preview.png`
- `_bmad-output/implementation-artifacts/9-5-friends-members-admin-invite-modal-preview.png`
- `_bmad-output/implementation-artifacts/9-5-friends-members-manage-modal-preview.png`
- `_bmad-output/implementation-artifacts/9-5-friends-members-mobile-preview.png`
- `_bmad-output/implementation-artifacts/9-5-friends-members-global-friends-preview.png`
- `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-browser.png`
- `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-action-menu.png`
- `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-manage-modal.png`
- `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-invite-menu.png`
- `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-invite-modal.png`
- `_bmad-output/implementation-artifacts/9-5-golutra-reference-friends-admin-invite-modal.png`
- `_bmad-output/implementation-artifacts/9-5-invite-menu-comparison.png`
- `_bmad-output/implementation-artifacts/9-5-invite-assistant-comparison.png`
- `_bmad-output/implementation-artifacts/9-5-invite-admin-comparison.png`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contact/contact-create.result.json`
- `fixtures/contracts/contact/contact-update.request.json`
- `fixtures/contracts/contact/contact-update.result.json`
- `fixtures/contracts/contact/contacts-list.result.json`
- `fixtures/contracts/member/member-invite.result.json`
- `fixtures/contracts/member/member-remove.result.json`
- `fixtures/contracts/member/member-status-update.result.json`
- `fixtures/contracts/member/members-list.result.json`
- `fixtures/schema/contacts-v1/contact-profiles.json`
- `fixtures/schema/members-v1/member-profiles.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/app/styles.css`
- `src/contracts/generated/contact.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src-tauri/bindings/contact.ts`
- `src/shared/api/member-api.ts`
- `src/contracts/generated/member.ts`
- `src/contracts/generated/index.ts`
- `src-tauri/bindings/member.ts`
- `src-tauri/migrations/workspace/202605130930__member_avatar.sql`
- `src-tauri/src/contracts/contact.rs`
- `src-tauri/src/contracts/member.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/app/contacts/mod.rs`
- `src-tauri/src/gateway/member_commands.rs`
- `src-tauri/src/app/members/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/contact_repository.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/member_repository.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `tests/contract/contract-fixture-types.ts`

## Change Log

- 2026-05-13: Started Story 9.5 and completed the first Friends/Members/invite parity slice.
- 2026-05-13: Added Friends action/status menu and Manage Member rename parity slice.
- 2026-05-13: Added Golutra-style Global Friends contact status/id parity and CSS AvatarBadge-style Friends avatars.
- 2026-05-14: Completed invite modal pixel audit, Golutra runtime/default-access alignment and persisted member avatar loading; story moved to review.
