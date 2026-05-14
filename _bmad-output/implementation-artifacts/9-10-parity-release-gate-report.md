# Story 9.10 Parity Release Gate Report

Date: 2026-05-14

## Result

Overall release status: `blocked`

Reason: Epic 9 now has source review, React screenshots, Golutra reference screenshots and comparison artifacts for the main parity surfaces, but the release gate cannot honestly become `ready` while these blockers remain:

- Native tray lifecycle parity now has Story 9.11 code/test evidence for tray icon fallback/avatar/blink, hover preview lifecycle and hide-before-action behavior; packaged OS tray smoke is still missing.
- Legacy data/path compatibility now has structural code/test evidence for the known Golutra stores: Story 9.12 adds `.golutra/workspace.json` read/mirror support and `.golutra/local.json` refresh semantics, Story 9.13 adds root-level `global-settings.json` import for current settings stores, Story 9.14 adds legacy `recent-workspaces.json` / map-style `workspace-registry.json` import, Story 9.15 adds workspace `.golutra/skills` symlink compatibility, Story 9.16 adds legacy `contacts.json` import, Story 9.17 adds legacy local profile avatar-library support, and Story 9.18 imports legacy per-workspace `chat.redb` conversations/messages into the current SQLite chat store when current chat is empty.
- Three-platform packaged smoke evidence is missing for Windows, macOS and Linux, including restart recovery.
- Remote Skill Store and Plugin Marketplace remain placeholder-only because Golutra keeps the remote arrays empty behind TODOs.

## Evidence Map

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Baseline | pass | `_bmad-output/planning-artifacts/golutra-parity-baseline-2026-05-13.md`; Story 9.1 | Source inventory, visual tokens and screenshot matrix established. |
| Shell / titlebar / sidebar / global hosts | pass | Story 9.2; `9-2-shell-browser-preview.png`; `9-2-context-menu-comparison.png` | ToastStack and ContextMenuHost are implemented and tested. |
| Workspace selection | pass-with-exception | Story 9.3; `9-3-workspace-selection-comparison.png` | Registry-conflict modal is retained React compatibility because Golutra has no matching reference state. |
| Chat workbench | pass | Story 9.4; `9-4-chat-interface-comparison.png`; `9-4-chat-emoji-comparison.png`; `9-4-chat-conversation-menu-comparison.png` | Conversation menus, emoji and invite/member flows have screenshots and tests. |
| Friends / members / invite modals | pass | Story 9.5; `9-5-invite-menu-comparison.png`; `9-5-invite-assistant-comparison.png`; `9-5-invite-admin-comparison.png` | Runtime/default-access and avatar parity were aligned. |
| Terminal workspace / pane | pass | Story 9.6; `9-6-terminal-workspace-comparison.png`; `9-6-terminal-context-menu-comparison.png` | Terminal overlays and context menu are screenshot-reviewed. |
| Settings | pass | Story 9.7; `9-7-settings-full-comparison.png`; `9-7-settings-avatar-menu-comparison.png`; `9-7-settings-custom-forms-comparison.png` | Avatar, terminal config, keybind and data sections covered. |
| Skill Store / Plugin Marketplace | pass-with-boundary | Story 9.8; `9-8-skill-store-comparison.png`; `9-8-plugin-marketplace-comparison.png` | Remote data/API intentionally remains unavailable because Golutra arrays are TODO empty. |
| Notification Preview | pass-with-platform-smoke-gap | Story 9.9; Story 9.11; `9-9-notification-preview-empty-comparison.png`; `9-9-notification-preview-unread-comparison.png`; `9-9-notification-preview-unread-hover-comparison.png` | Visual preview parity is aligned; native tray icon fallback/avatar/blink and hover-hide lifecycle are ported structurally, but packaged OS tray smoke is still missing. |
| Data compatibility | pass-with-boundary | Stories 9.12, 9.13, 9.14, 9.15, 9.16, 9.17, 9.18; `docs/rebuild/parity-checklist.md`; release notes | `.golutra/workspace.json`, `.golutra/local.json`, `global-settings.json`, `recent-workspaces.json`, legacy `workspace-registry.json`, workspace `.golutra/skills` symlink compatibility, legacy `contacts.json` import, legacy local profile avatar-library support and legacy `chat.redb` text/system message import now have code/test evidence. Unsupported legacy chat attachments are skipped safely and current stores remain authoritative. |
| Three-platform packaged smoke | blocked | `fixtures/release/three-platform-smoke-results.json` | Windows/macOS/Linux packaged runs are not recorded. |

## Difference Classification

| Difference | Classification | Release impact |
| --- | --- | --- |
| Minor antialiasing and WebView/font rendering deltas across screenshots | rendering noise | Allowed by parity exception policy. |
| Workspace registry conflict UI has no Golutra equivalent | approved implementation exception | Does not block if documented as React compatibility behavior. |
| Skill Store and Plugin Marketplace remote cards/actions absent | approved scope boundary until Golutra implements data | Does not block current UI shell parity; blocks any remote-market release claim. |
| Notification preview row metadata now includes Golutra sender/member-count/avatar-capable fields | resolved in Story 9.11 | Contract was extended without breaking existing fixtures. |
| Native tray icon flashing, tray avatar generation and hover-hide lifecycle | resolved structurally in Story 9.11; pending packaged OS smoke | Do not use this as a remaining code blocker, but keep release blocked until packaged platform evidence exists. |
| `.golutra/workspace.json` read/mirror and `.golutra/local.json` refresh | resolved in Story 9.12 | Legacy workspace identity and localMachineId/lastOpenedAt compatibility have Rust and fixture validation evidence. |
| Root-level `global-settings.json` app preferences import | resolved in Story 9.13 | Theme, language, profile, notification, shortcut, chat-output and terminal settings load from legacy data when current stores are absent. |
| Legacy `recent-workspaces.json` and map-style `workspace-registry.json` import | resolved in Story 9.14 | Current registry loading accepts Golutra registry map/recent list formats when current schema is absent. |
| Workspace `.golutra/skills` symlink import | resolved in Story 9.15 | Current workspace skill link loading accepts legacy Golutra symlink directories when current skill-link schema is absent, including broken-target fallback records. |
| Legacy `contacts.json` import | resolved in Story 9.16 | Current contact listing imports Golutra root-level contacts when the SQLite contacts table is absent and keeps the current table authoritative once initialized. |
| Legacy local profile avatar library | resolved in Story 9.17 | Current profile settings read Golutra `account.avatar = local:<id>` through root-level `avatar-library.json` and `avatars/<filename>` when current `settings/profile.json` is absent; unsafe/missing assets fall back to placeholder. |
| Legacy `chat.redb` import | resolved in Story 9.18 | Current SQLite remains authoritative once initialized; when current chat is empty, legacy channel/DM conversations and text/system messages import from per-workspace `chat.redb`; corrupt legacy redb returns a recoverable error without importing corrupted data. |
| Windows/macOS/Linux packaged smoke and restart recovery not run | blocking | Keep release blocked. |

## Validation Commands

Latest commands run during Stories 9.9/9.10/9.11:

- `pnpm test:frontend src/App.test.tsx -- --runInBand`: passed, 99 tests.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm test`: passed; release readiness validator reported `blocked` while exiting successfully.
- `pnpm build`: passed; Vite reported the existing large chunk warning.
- `git diff --check`: passed.
- Story 9.11 validation: `pnpm test` passed; `cargo test --manifest-path src-tauri/Cargo.toml app::notification` passed 12 notification tests; `pnpm build` passed; release readiness remained structurally valid and `blocked`.
- Story 9.12 validation: `cargo test --manifest-path src-tauri/Cargo.toml app::workspace` passed 19 workspace tests; `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` passed 10 data-integrity tests; `pnpm test:data-integrity`, `pnpm test:contracts`, `pnpm exec tsc --noEmit`, `pnpm test` and `pnpm build` passed; release readiness remained structurally valid and `blocked`.
- Story 9.13 validation: `cargo test --manifest-path src-tauri/Cargo.toml app::settings` passed 17 settings tests; `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` passed 11 data-integrity tests; `cargo test --manifest-path src-tauri/Cargo.toml legacy_global_settings`, `pnpm test:data-integrity`, `pnpm test:contracts`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, `node scripts/validate-release-readiness.mjs` and `git diff --check` passed; release readiness remains structurally valid and `blocked`.
- Story 9.14 validation: `cargo test --manifest-path src-tauri/Cargo.toml workspace_registry_store` passed 4 registry compatibility tests; `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` passed 12 data-integrity tests; `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness/capability validators and `git diff --check` passed; release readiness remains structurally valid and `blocked`.
- Story 9.15 validation: `cargo test --manifest-path src-tauri/Cargo.toml workspace_skill_link_store` passed 4 workspace skill link compatibility tests; `cargo test --manifest-path src-tauri/Cargo.toml app::skills` passed 13 skill tests; `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` passed 13 data-integrity tests; `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness/capability validators and `git diff --check` passed; release readiness remains structurally valid and `blocked`.
- Story 9.16 validation: `cargo test --manifest-path src-tauri/Cargo.toml app::contacts` passed 3 contact tests; `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` passed 14 data-integrity tests; `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness/capability validators and `git diff --check` passed; release readiness remains structurally valid and `blocked`.
- Story 9.17 validation: `cargo test --manifest-path src-tauri/Cargo.toml app::settings` passed 20 settings tests; `cargo test --manifest-path src-tauri/Cargo.toml legacy_global_settings` passed 4 legacy settings tests; `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` passed 15 data-integrity tests; `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness/capability validators and `git diff --check` passed; release readiness remains structurally valid and `blocked`.
- Story 9.18 validation: `cargo test --manifest-path src-tauri/Cargo.toml app::chat` passed 24 chat tests; `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` passed 16 data-integrity tests; `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness/capability validators and `git diff --check` passed; release readiness remains structurally valid and `blocked`.

## Gate Decision

The parity evidence report is complete enough to prevent false completion claims. The correct release decision is `blocked`, not `ready`, until packaged Windows/macOS/Linux smoke, packaged restart recovery and packaged OS tray smoke evidence exist.
