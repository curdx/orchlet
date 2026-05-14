# Golutra Parity Baseline

Date: 2026-05-13
Reference app: `/Users/wdx/opc/golutra`
Target app: `/Users/wdx/opc/orchlet`
Purpose: establish the source-based UI and behavior baseline for Epic 9 before React parity implementation.

## Acceptance Standard

`/Users/wdx/opc/golutra` is the user-visible product master. React replaces Vue internally, but the visible app must preserve Golutra's screen structure, visual system, window modes, interaction states and feature boundaries unless a parity exception is explicitly approved.

Current `orchlet` Epic 1-8 status is infrastructure completion, not product acceptance.

## Reference Screen Inventory

| Screen / mode | Reference source | Required React target |
| --- | --- | --- |
| App shell / main window | `/Users/wdx/opc/golutra/src/app/App.vue` | `AppShell`, `Titlebar`, `WindowControls`, `ResizeHandles`, mode switch |
| Workspace selection | `/Users/wdx/opc/golutra/src/features/WorkspaceSelection.vue` | `WorkspaceSelection` |
| Sidebar navigation | `/Users/wdx/opc/golutra/src/shared/components/SidebarNav.vue` | `SidebarNav`, account status menu, unread badge |
| Chat workbench | `/Users/wdx/opc/golutra/src/features/chat/ChatInterface.vue` | `ChatInterface` |
| Chat sidebar | `/Users/wdx/opc/golutra/src/features/chat/components/ChatSidebar.vue` | `ChatSidebar` |
| Chat header | `/Users/wdx/opc/golutra/src/features/chat/components/ChatHeader.vue` | `ChatHeader` |
| Messages list | `/Users/wdx/opc/golutra/src/features/chat/components/MessagesList.vue` | `MessagesList` |
| Chat input | `/Users/wdx/opc/golutra/src/features/chat/components/ChatInput.vue` | `ChatInput` |
| Members sidebar | `/Users/wdx/opc/golutra/src/features/chat/components/MembersSidebar.vue` | `MembersSidebar` |
| Friends | `/Users/wdx/opc/golutra/src/features/chat/FriendsView.vue` | `FriendsView` |
| Invite/member/roadmap/skill modals | `/Users/wdx/opc/golutra/src/features/chat/modals/*` | Modal parity components |
| Terminal workspace | `/Users/wdx/opc/golutra/src/features/terminal/TerminalWorkspace.vue` | `TerminalWorkspace` |
| Terminal pane | `/Users/wdx/opc/golutra/src/features/terminal/TerminalPane.vue` | `TerminalPane` |
| Settings | `/Users/wdx/opc/golutra/src/features/Settings.vue` | `Settings` |
| Skill store | `/Users/wdx/opc/golutra/src/features/SkillStore.vue` | `SkillStore` |
| Plugin marketplace | `/Users/wdx/opc/golutra/src/features/PluginMarketplace.vue` | `PluginMarketplace` |
| Notification preview | `/Users/wdx/opc/golutra/src/features/notifications/NotificationPreview.vue` | `NotificationPreview` |
| Toast / context menu | `/Users/wdx/opc/golutra/src/shared/components/ToastStack.vue`, `/Users/wdx/opc/golutra/src/shared/context-menu/ContextMenuHost.vue` | Global hosts |

## Visual Token Baseline

Source: `/Users/wdx/opc/golutra/src/styles/global.css` and `/Users/wdx/opc/golutra/tailwind.config.cjs`.

| Token | Reference value / behavior | Parity requirement |
| --- | --- | --- |
| App font | `Be Vietnam Pro` 300/400/500/600/700 woff2 | Copy assets and make app sans font |
| Icon font | `Material Symbols Outlined` woff2 | Use for parity screens before lucide |
| Default theme | dark | App must launch into dark Golutra shell unless stored theme says otherwise |
| Background | `--color-background: 15 15 18` | Use same CSS variable model |
| Surface | `--color-surface: 24 24 27` | Same variable and utility behavior |
| Panel | `--color-panel: 18 18 21` | Same glass/panel treatment |
| Strong panel | `--color-panel-strong: 20 20 23` | Same modal/sidebar treatment |
| Accent | `--color-primary: 56 189 248` | Same active, glow, mention and CTA color |
| Window frame | `.window-frame`, 12px radius, gradient background | Required shell primitive |
| Titlebar | 40px height, uppercase 12px title, custom controls | Required for non-macOS windows |
| Glass | `glass-panel`, `glass-modal` usage throughout screens | Required for panels, cards, menus, modals |
| Scrollbar | `.custom-scrollbar` 6px | Required for scroll regions |
| xterm overrides | helper textarea/viewport/screen rules | Required before terminal parity |

## Core Layout Baseline

### App Shell

Golutra root behavior:

- `NotificationPreview` renders directly for `notification-preview` window mode.
- All other modes render inside `.window-frame`.
- Titlebar changes style for macOS and workspace-selection.
- Terminal window mode renders only `TerminalWorkspace`.
- Missing workspace or active `workspaces` tab renders `WorkspaceSelection`.
- Main mode renders `SidebarNav` plus a glass main panel containing `FriendsView`, `SkillStore`, `PluginMarketplace`, `Settings` or `ChatInterface`.
- `ToastStack`, `ContextMenuHost` and resize handles are global.

### Workspace Selection

Required states:

- Large centered open-folder glass card.
- Background radial glow spots.
- Recent workspaces section with uppercase heading and divider.
- Primary recent grid with 3-column desktop cards.
- More dropdown with search, compact rows and no-results state.
- Empty state with history icon.
- Fixed top-right error toast with red glass styling and auto-dismiss behavior.

### Chat

Required structure:

- Three-panel desktop layout: conversation sidebar, message column, members sidebar.
- Read-only workspace warning bar above chat header.
- Chat header: roadmap button left, centered title/description, skills button right, mobile members button.
- Messages: history button, date separators, avatar/name/time rows, own-message white bubble, mention highlights, attachment cards, terminal stream typewriter and sticky jump-to-latest.
- Input: quick prompts, mention pill bar, glass textarea row, add button, emoji panel, send/stop button and length hint.
- Members sidebar: grouped owner/admin/assistant/member sections and invite/add behavior.

### Terminal

Required structure:

- Compact header with title/subtitle, tab search, new tab button.
- Tab bar with recent closed button, draggable tabs, active/inactive styles, pin/activity/close affordances.
- Empty terminal state with icon and new tab button.
- Pane grid modes: single, split vertical, split horizontal, grid 2x2.
- Terminal panes use black terminal background, focus ring, tab-in-pane header, empty pane drop state.
- Find overlay includes search input, case/whole-word/regex toggles, result count, previous/next and close.

### Settings

Required structure:

- Settings has its own left settings rail inside the main panel.
- Sections: account, appearance, language, members, notifications, keybinds, data.
- Account card includes editable display name, readonly email, timezone and avatar menu with presets/uploads/upload/reset.
- Theme cards show preview swatches and selected check.
- Language, member/terminal, notification, shortcut and data maintenance sections follow Golutra spacing and glass card style.

### Skill Store / Plugin Marketplace

Required structure:

- Centered 3xl title and search.
- Segmented store/installed control with animated active background.
- Filter pills.
- Card grid with rounded-3xl glass cards.
- Skill Store source data may be empty like Golutra; local folder import/delete/open remains functional.
- Plugin Marketplace remains placeholder unless separate product approval changes scope.

### Notification Preview

Required structure:

- Transparent root and rounded 16px glass card, not a normal full-page panel.
- Header title and unread count.
- Item rows with avatar/fallback, tag, meta text, preview text, secondary unread count and open terminal action.
- Footer includes open all terminals, ignore all and view all.
- Hover should keep preview alive.

## Current React Deviation Log

| Area | Current evidence | Classification | Required action |
| --- | --- | --- | --- |
| App shell | `src/App.tsx` switches only terminal / notificationPreview / workspaceSelection | parity bug | Add main Golutra shell and route active tabs inside it |
| Global style | `src/app/styles.css` uses Inter/system font and light green defaults | parity bug | Port Golutra fonts, CSS variables, shell and glass styles |
| Main UI structure | `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` is a 9385-line aggregate page | parity bug | Split/replace with Golutra screen/component map |
| Notification preview | `src/App.tsx` renders a full light page/card | parity bug | Replace with Golutra compact transparent preview |
| Terminal visuals | `src/pages/terminal/TerminalPage.tsx` uses green slate UI and different toolbar density | parity bug | Restyle/restructure to Golutra `TerminalWorkspace`/`TerminalPane` |
| Icons | Current UI uses lucide broadly | parity bug for product screens | Use Material Symbols on parity surfaces |
| Workspace selection | Current page is not Golutra hero-card/recent-grid first experience | parity bug | Implement Story 9.3 |
| Chat/Friends/Settings/Skills/Plugins | Current surfaces exist inside aggregate page, not Golutra shell/screens | parity bug | Implement Stories 9.4, 9.5, 9.7, 9.8 |

## Screenshot Baseline Matrix

Store future screenshots under:

- Reference: `_bmad-output/implementation-artifacts/parity-screenshots/reference/`
- React current: `_bmad-output/implementation-artifacts/parity-screenshots/current/`
- Diffs/review notes: `_bmad-output/implementation-artifacts/parity-screenshots/review/`

Required captures:

| Id | Window | State |
| --- | --- | --- |
| ws-empty | workspace-selection | no recent workspaces |
| ws-recent | workspace-selection | three primary recent cards and more dropdown closed |
| ws-more-search | workspace-selection | more dropdown open with search |
| ws-error | workspace-selection | open workspace error toast visible |
| main-chat-default | main | chat tab, default channel, members sidebar |
| main-chat-emoji | main | emoji panel open |
| main-chat-mention | main | mention dropdown open |
| main-friends | main | friends tab with project/global sections |
| main-settings-account | main | settings account section and avatar menu |
| main-settings-theme | main | settings appearance/theme section |
| main-skill-store | main | skill store tab |
| main-plugin-marketplace | main | plugin marketplace browse tab |
| terminal-empty | terminal | no open tabs |
| terminal-single | terminal | one active terminal tab |
| terminal-split | terminal | split/grid pane layout |
| terminal-find | terminal | find overlay open |
| notification-unread | notification-preview | unread items visible |

## Parity Exception Policy

Allowed without approval:

- Minor antialiasing differences from WebView/platform rendering.
- Timestamp or path text differences caused by test fixtures.
- Exact pixel differences caused by native titlebar overlay on macOS, if layout intent matches.

Requires explicit approval:

- Different font, icon set, palette, layout density or component shape.
- Different navigation flow or screen grouping.
- Different placeholder boundary for skill store/plugin marketplace/admin/team/account features.
- Missing modal/menu/drawer/notification/terminal state that exists in Golutra.

## Implementation Order

1. Port global fonts, CSS variables, window shell, titlebar, glass panels, scrollbars and Material Symbols.
2. Rebuild AppShell and SidebarNav parity.
3. Rebuild WorkspaceSelection parity.
4. Rebuild ChatInterface and modal parity.
5. Rebuild TerminalWorkspace/TerminalPane parity.
6. Rebuild Settings, SkillStore, PluginMarketplace and NotificationPreview parity.
7. Capture screenshots and run parity release gate.
