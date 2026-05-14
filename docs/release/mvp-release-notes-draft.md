# Orchlet MVP Release Notes Draft

Release readiness source: `fixtures/release/mvp-release-readiness.json`
Three-platform smoke source: `fixtures/release/three-platform-smoke-results.json`
Capability status source: `fixtures/capabilities/mvp-capability-status.json`
Golutra parity baseline: `_bmad-output/planning-artifacts/golutra-parity-baseline-2026-05-13.md`

Release positioning: this build is a React/Tauri internal rebuild of Golutra, not a redesigned app. User-visible shell, screens, copy semantics and placeholder boundaries are evaluated against `/Users/wdx/opc/golutra`.

## Feature Changes

- Rebuilt the local-first workspace flow with `.orchlet` workspace metadata, `.golutra/workspace.json` compatibility mirroring, `.golutra/local.json` refresh, recent workspace registry, read-only fallback and file-manager opening.
- Added members, contacts, chat conversations, message history, mentions, emoji, quick prompts and message-to-terminal dispatch.
- Added terminal session lifecycle, tab management, pane layouts, text operations, CLI path diagnostics, terminal snapshots and terminal output backwrite to chat.
- Added notification unread aggregation, native tray fallback/avatar/blink lifecycle, hover preview lifecycle, notification preview navigation and ignore-all behavior.
- Added local skill library import/open/delete, workspace skill links, roadmap tasks/goals and explicit Skill Store / remote plugin placeholders.
- Added profile, avatar, theme/language, notification, shortcut, terminal configuration, chat output and chat maintenance settings.
- Added diagnostics run/event recording, terminal/chat consistency diagnostics and redacted diagnostics overview/export.
- Added Epic 9 Golutra parity evidence for shell, workspace selection, chat, friends/members, terminal, settings, skill/plugin marketplace shells and notification preview.

## Data And Schema Changes

- New MVP data uses `.orchlet` workspace metadata as the authoritative schema while reading/mirroring `.golutra/workspace.json` and refreshing `.golutra/local.json` for legacy workspace identity compatibility.
- Root-level Golutra `global-settings.json` can hydrate current settings stores for theme/language, profile, notification, shortcut, chat-output and terminal preferences when current `settings/*.json` files do not exist.
- Legacy `recent-workspaces.json` and map-style `workspace-registry.json` can hydrate the current workspace registry when the current schema registry is absent.
- Legacy per-workspace Golutra `chat.redb` can hydrate current SQLite chat conversations/messages when current chat is empty; current SQLite remains authoritative after initialization and corrupt legacy redb files return recoverable errors.
- Workspace `.golutra/skills` symlink compatibility, root-level `contacts.json` import and legacy local profile avatar-library references are structurally supported.
- Contract fixtures now cover workspace, chat, members, contacts, terminal, orchestration, notifications, settings, skills, roadmap, data integrity and diagnostics.
- Data integrity fixtures cover current JSON stores, SQLite schema manifest, terminal streams and validation report shapes.
- Capability status registry records implemented, alternative, placeholder and abandoned capability states separately from release readiness.
- Release readiness and three-platform smoke result fixtures live under `fixtures/release/` and are validated by `scripts/validate-release-readiness.mjs`.

## Breaking Changes

- The MVP still uses `.orchlet` paths and new schema fixtures as the authoritative data model; `.golutra/workspace.json`, `.golutra/local.json` and legacy `chat.redb` import are compatibility surfaces, not live legacy stores.
- Legacy `chat.redb` compatibility imports conversation metadata and text/system messages only when the current SQLite chat store has no conversations; unsupported legacy attachments are skipped and legacy avatar-library support is limited to the selected local profile avatar path when current `settings/profile.json` is absent.
- Remote Skill Store and Plugin Marketplace entries are visible placeholders only; they do not install or execute remote content.
- `@all` bulk dispatch is intentionally not implemented in MVP and must not be treated as a working command.

## Security And Privacy Changes

- Diagnostics export is local, metadata-first and redacts private paths, token-like values, env-like secrets and source-like raw content.
- Raw Tauri calls remain constrained to shared API wrappers; UI pages consume typed facades.
- Tauri capabilities remain window-scoped and narrow; no broad shell/plugin permissions are added for release validation.
- Local data, terminal output, chat history, avatars, skills and diagnostics are not uploaded by MVP release validation.

## Known Issues And Blockers

- MVP release remains blocked even after Epic 9 visual parity work because release readiness still lacks packaged platform smoke evidence.
- Current capability status entries describe backend/functional implementation status; Golutra visual/interaction parity is tracked separately in `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`.
- Native tray icon flashing, sender-avatar tray icon generation and preview hover/hide lifecycle are now ported structurally in Story 9.11, but packaged OS tray smoke has not been recorded.
- Legacy `.golutra/workspace.json` / `.golutra/local.json` compatibility is implemented structurally in Story 9.12, root-level `global-settings.json` settings import is implemented structurally in Story 9.13, legacy recent/workspace registry imports are implemented structurally in Story 9.14, workspace `.golutra/skills` symlink compatibility is implemented structurally in Story 9.15, root-level `contacts.json` import is implemented structurally in Story 9.16, legacy local profile avatar-library support is implemented structurally in Story 9.17, and legacy `chat.redb` import is implemented structurally in Story 9.18.
- MVP release is currently blocked because Windows, macOS and Linux packaged smoke runs have not been executed after the full MVP implementation.
- Restart recovery has no current three-platform packaged smoke evidence.
- Remote Skill Store and Plugin Marketplace remain placeholder-only because the Golutra reference still keeps remote marketplace arrays empty behind TODO comments.
- Release signing, notarization, installer publishing and update automation are not implemented by this story.
