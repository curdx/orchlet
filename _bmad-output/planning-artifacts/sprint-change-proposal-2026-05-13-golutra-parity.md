---
workflowType: 'correct-course'
project_name: 'orchlet'
user_name: '王定旭'
date: '2026-05-13'
status: 'approved'
changeScope: 'major'
mode: 'batch'
approval: 'approved by user on 2026-05-13: "开始吧"'
trigger: 'Installed app rejected because it does not match /Users/wdx/opc/golutra UI and behavior'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - docs/rebuild/project-overview.md
  - docs/rebuild/feature-inventory.md
  - docs/rebuild/parity-checklist.md
referenceApplication:
  - /Users/wdx/opc/golutra
  - /Users/wdx/opc/golutra/src/app/App.vue
  - /Users/wdx/opc/golutra/src/styles/global.css
  - /Users/wdx/opc/golutra/src/features/WorkspaceSelection.vue
  - /Users/wdx/opc/golutra/src/features/chat/ChatInterface.vue
  - /Users/wdx/opc/golutra/src/features/terminal/TerminalWorkspace.vue
  - /Users/wdx/opc/golutra/src/features/Settings.vue
  - /Users/wdx/opc/golutra/src/shared/components/SidebarNav.vue
---

# Sprint Change Proposal - Golutra Parity Correction

## 1. Issue Summary

当前 `orchlet` 实现方向与真实验收标准发生重大偏差。

用户在安装测试 `/Applications/orchlet.app` 后明确反馈：目标不是按功能类目做一个“类似的 React 新应用”，而是复刻 `/Users/wdx/opc/golutra` 的页面、UI、流程与功能；允许变化的是内部项目架构、前端框架从 Vue 变 React、后端/数据层实现选择，而不是用户可见产品形态。

### Core Problem

问题类型：原需求理解错误 + 已执行方案方向错误。

当前规划与实现把 `golutra` 定义为“功能参考和产品行为样本”，并接受新的视觉组织与功能域式交付；但用户实际要求是：

- `golutra` 是用户可见 UI 与功能行为的 canonical reference。
- React 版必须在主窗口、工作区选择、聊天、好友、终端、设置、技能商店、插件市场、通知预览、Toast、上下文菜单、快捷键、i18n 文案等层面保持同形态。
- 新架构只能改变内部实现，不能改变用户看到的 App。

### Evidence

1. 旧版 Golutra 根布局是完整桌面 shell：
   - `window-frame`、自绘 titlebar、窗口控制、resize handles。
   - `SidebarNav` 左侧 88px 图标导航。
   - 主区域按 `ChatInterface`、`FriendsView`、`SkillStore`、`PluginMarketplace`、`Settings` 切换。
   - `ToastStack` 与 `ContextMenuHost` 常驻。

2. 旧版视觉基线是深色玻璃桌面 UI：
   - `Be Vietnam Pro` 字体。
   - `Material Symbols Outlined` 图标字体。
   - CSS 变量：`--color-background: 15 15 18`、`--color-panel`、`--color-primary: 56 189 248`。
   - radial gradient 背景、glass panel、rounded-3xl 卡片、暗色半透明边框。

3. 当前 React 版与参考应用结构不一致：
   - `src/App.tsx` 只在 `terminal`、`notificationPreview`、`workspaceSelection` 之间切换，没有 Golutra 主 shell 的 `SidebarNav + Chat/Friends/Store/Plugins/Settings` 结构。
   - `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` 单文件约 9385 行，把工作区、聊天、成员、设置、技能、诊断等大量 UI 混在一起，不对应旧版页面结构。
   - `src/app/styles.css` 使用 Inter/system 字体、浅色绿色调，缺少 Golutra 的 font-face、CSS variables、window-frame/titlebar/glass 基线。
   - `src/App.tsx` 通知预览是普通浅色页面卡片，不是旧版透明圆角悬浮预览窗。

4. 当前 `sprint-status.yaml` 标记 Epic 1-8 全部 done，但这是工程任务状态，不再能代表产品验收完成。

## 2. Impact Analysis

### Epic Impact

现有 Epic 1-8 不能直接废弃，因为其中后端契约、Tauri capability、SQLite、终端 session、通知、设置、诊断等工程能力仍可复用；但它们不再构成发布验收。

需要新增一个阻断发布的 parity epic，并在批准后把 sprint status 标记为产品验收 blocked：

- Existing Epic 1-8: engineering implementation done, product parity not accepted.
- New Epic 9: Golutra UI and Behavior Parity Restoration.
- Release condition: Epic 9 全部通过前不得再声称 MVP complete 或 release-ready。

### Story Impact

所有 UI-facing stories 都需要重新按 Golutra 屏幕拆分验收，而不是按能力域验收：

- 工作区选择不只要能打开目录，还要匹配旧版 hero open-folder card、recent grid、more dropdown、error toast、背景光晕与空状态。
- 主窗口不只要有聊天能力，还要匹配旧版 titlebar、sidebar、主面板、底部移动导航、状态菜单、未读徽标。
- 聊天不只要能收发消息，还要匹配旧版三栏结构、channel/DM 列表、header、messages、input、emoji、mention、quick prompts、members sidebar 和所有 modal。
- 终端不只要能启动 session，还要匹配旧版 terminal header、tab search、recent closed、tab drag/pin/activity、pane layouts、find overlay 和 xterm panel。
- 设置不只要有 settings API，还要匹配旧版设置侧栏、account/avatar/theme/language/members/notifications/keybinds/data sections。
- Skill Store 和 Plugin Marketplace 必须保持旧版“UI 壳 + 明确 placeholder”的形态，不能伪装成不同的新市场。

### PRD Conflicts

Current PRD language conflicts with the corrected requirement:

- Current: `golutra` 是功能参考和产品行为样本，新版可以重做内部架构、模块边界、前后端技术栈和数据层。
- Required: `golutra` 是用户可见产品母版。内部可重做，但所有用户可见 UI、文案、流程、窗口模式、功能状态必须 parity。

Required PRD update:

- Add `Visual and Behavioral Parity` as a release-blocking MVP requirement.
- Clarify that “React replaces Vue” is an implementation detail, not a redesign license.
- State that no intentional visual/flow/function deviation is allowed without explicit user approval and documented exception.
- Reclassify current MVP status as not accepted until parity epic passes.

### Architecture Conflicts

Current Architecture remains partly valid for internals, but the UI architecture must change:

- Keep React + TypeScript + Tauri 2 + Rust + SQLite/rusqlite unless separately changed.
- Replace broad “restrained desktop UI component layer” language with “Golutra visual system ported to React”.
- Remove or relax `lucide-react` as the default for parity screens. Golutra uses Material Symbols; parity requires Material Symbols unless a specific icon replacement is explicitly approved.
- Add a React component map that mirrors old screen boundaries while still avoiding Vue/Pinia internals:
  - `AppShell`, `Titlebar`, `SidebarNav`
  - `WorkspaceSelection`
  - `ChatInterface`, `ChatSidebar`, `ChatHeader`, `MessagesList`, `ChatInput`, `MembersSidebar`
  - `FriendsView`
  - `TerminalWorkspace`, `TerminalPane`
  - `Settings`
  - `SkillStore`, `PluginMarketplace`
  - `NotificationPreview`, `ToastStack`, `ContextMenuHost`

### UX Specification Conflicts

Current UX spec has button-level behavior but does not define pixel/visual parity as acceptance. It must be updated with:

- Screen inventory based on Golutra source.
- Visual tokens copied from Golutra: fonts, icons, CSS variables, shell geometry, spacing, radii, panel opacity, gradients, shadow/glow, scrollbar, xterm styling.
- Window-mode specific acceptance:
  - main
  - workspace-selection
  - terminal
  - notification-preview
- Modal/dropdown/drawer acceptance:
  - invite menus and modals
  - manage member
  - rename conversation
  - roadmap
  - skill management/detail
  - avatar menu
  - terminal find
  - context menus
- Mobile/responsive parity where old Golutra defines responsive behavior.

### Technical Impact

Frontend impact is high. The current React UI layer should be treated as a functional prototype, not the final UI.

Backend impact is medium. Existing APIs may remain useful, but UI-facing DTOs must support the exact Golutra flows. Any missing behavior discovered during parity implementation becomes blocking.

Testing impact is high. Existing unit/fixture/release scripts are insufficient; parity requires screenshot and interaction smoke gates.

## 3. Recommended Approach

Selected approach: Hybrid Direct Adjustment.

Do not roll back the whole repo. Keep useful backend contracts, Tauri commands, fixtures and terminal infrastructure. Rewrite/restructure the React UI around Golutra parity, and add parity tests before claiming release readiness.

Rationale:

- Full rollback would discard working infrastructure without solving the acceptance misunderstanding.
- Continuing to patch the current UI in place is risky because its structure is already far from Golutra and concentrated in one large component.
- The fastest reliable path is to freeze current work as infrastructure, then create a parity-focused UI epic with screen-by-screen implementation and visual gates.

Effort estimate: High.

Risk level: High until the first two parity screens pass screenshot review; Medium after shell/workspace/chat baseline is stable.

Release impact: MVP release must be delayed. Current installed app must not be considered accepted.

## 4. Detailed Change Proposals

### 4.1 PRD Changes

Replace the current acceptance framing:

```text
OLD:
golutra 是功能参考和产品行为样本；新版可以重做内部架构、模块边界、前后端技术栈和数据层。
```

```text
NEW:
golutra 是 orchlet 的用户可见产品母版。新版允许用 React 替代 Vue，并允许重做内部架构、模块边界、后端实现、IPC 契约和数据层；但所有用户可见 UI、窗口模式、主流程、文案语义、交互状态、功能行为和占位边界必须与 /Users/wdx/opc/golutra 保持 parity。任何 intentional deviation 都必须先被用户明确批准，并记录为 parity exception。
```

Add MVP release gate:

```text
MVP-PARITY:
发布前必须完成 Golutra parity gate。所有参考屏幕和核心流程必须通过截图对照、交互 smoke、功能库存对照和人工验收。自动截图允许仅因平台字体抗锯齿/WebView 渲染产生的微小差异；不得存在 intentional layout、color、flow、copy 或 feature deviation。
```

### 4.2 UX Spec Changes

Add a new section `Golutra Parity Design System`:

- Fonts: port `Be Vietnam Pro` and `Material Symbols Outlined` assets.
- Theme: port `global.css` variable model and light/dark/system behavior.
- Shell: port `window-frame`、`titlebar`、`window-body`、window controls、inactive/focused/maximized states、resize handles.
- Navigation: port 88px desktop sidebar and 64px mobile bottom nav behavior.
- Panels: port glass-panel/glass-modal, panel opacity, border colors, shadow/glow and custom scrollbar.
- Copy/i18n: port zh-CN/en-US keys and text behavior before changing labels.

Add screenshot baseline requirement:

- Capture reference screenshots from Golutra for each window mode and major screen.
- Capture React screenshots at the same viewport and state.
- Store baseline and current screenshots under a traceable artifact folder.
- Any diff must be classified as rendering noise, approved exception or bug.

### 4.3 Architecture Changes

Keep these architecture decisions:

- React + TypeScript + Vite.
- Tauri 2 + Rust.
- Typed frontend API facade instead of raw `invoke` in feature code.
- Rust-owned terminal session lifecycle.
- Terminal hot path outside React state.
- SQLite/rusqlite or approved new data layer for internal persistence.

Modify these decisions:

- UI primitive library must serve Golutra parity, not create a new visual language.
- `lucide-react` is no longer the default for parity screens. Material Symbols parity takes precedence.
- React components should be decomposed by Golutra screen/component boundaries first, then wired to the new architecture.
- Current `WorkspaceSelectionPage.tsx` monolith should be split or replaced; it is not an acceptable long-term parity surface.

### 4.4 Epics / Stories

Add blocking Epic 9.

#### Epic 9: Golutra UI and Behavior Parity Restoration

Epic goal: 用户打开 React 版 orchlet 时，看到和使用到的产品必须与 `/Users/wdx/opc/golutra` 一致；内部实现可新，但 UI、流程、功能状态与旧版保持 parity。

##### Story 9.1: 建立 Golutra parity baseline

Acceptance criteria:

- Reference app screen inventory is documented from source.
- Baseline screenshots are captured for workspace selection, main chat, friends, settings, skill store, plugin marketplace, terminal window and notification preview.
- Visual tokens are extracted from Golutra CSS/fonts/assets.
- Existing React UI deviations are logged as parity bugs.

##### Story 9.2: App shell、titlebar、sidebar、global systems parity

Acceptance criteria:

- React app ports `window-frame`、titlebar、window controls、resize handles、focused/maximized/inactive states.
- Main shell matches Golutra `SidebarNav` layout and active/unread/status behavior.
- ToastStack and ContextMenuHost are present and styled like Golutra.
- Theme/language changes propagate across main、terminal、workspace-selection、notification-preview windows.

##### Story 9.3: WorkspaceSelection parity

Acceptance criteria:

- Open-folder hero card, recent workspace grid, more dropdown/search, empty state, error toast and background treatment match Golutra.
- Directory open, recent open, read-only/conflict handling remain functional.
- Screenshot diff has no intentional deviation.

##### Story 9.4: ChatInterface parity

Acceptance criteria:

- Chat tri-panel layout matches Golutra: `ChatSidebar` + `ChatHeader/MessagesList/ChatInput` + `MembersSidebar`.
- Conversation list, channel/DM grouping, unread badges, pin/mute/rename/clear/delete menus match Golutra.
- Message rendering, date separators, own-message bubble, terminal stream typewriter, attachment cards, jump-to-latest match Golutra.
- Chat input matches Golutra quick prompts, mention bar, mention dropdown, emoji panel and send/stop behavior.

##### Story 9.5: Friends、members、invite and modal parity

Acceptance criteria:

- FriendsView project/global sections, friend cards, status menus, DM/open-terminal/delete actions match Golutra.
- MembersSidebar and MemberRow grouping/actions match Golutra.
- InviteMenu, InviteAdminModal, InviteAssistantModal, InviteFriendsModal, ManageMemberModal and RenameConversationModal match Golutra flows and style.

##### Story 9.6: TerminalWorkspace and TerminalPane parity

Acceptance criteria:

- Terminal header, tab search, new tab, recent closed tabs, tab bar, pin/activity/close states match Golutra.
- Pane layouts single/split-vertical/split-horizontal/grid-2x2 match Golutra.
- TerminalPane xterm area, find overlay, attach/reconnect/fatal overlays and context menu behavior match Golutra.
- Terminal drag/drop, restore and member tab open flows match Golutra.

##### Story 9.7: Settings parity

Acceptance criteria:

- Settings sidebar sections and content layout match Golutra.
- Account/avatar menu, theme cards, language rows, members/terminal configuration, notifications, keybinds and data maintenance match Golutra.
- Placeholder or TODO controls remain visibly aligned with Golutra behavior unless explicitly approved otherwise.

##### Story 9.8: SkillStore and PluginMarketplace parity

Acceptance criteria:

- Header, search, tabs, filters, card grid, installed/local folder cards and import card match Golutra.
- Empty/placeholder data behavior matches Golutra.
- Local skill folder import/delete/open and workspace link/unlink remain functional.
- Plugin marketplace remains clearly placeholder if remote install is not implemented.

##### Story 9.9: NotificationPreview and tray flow parity

Acceptance criteria:

- Notification preview window is transparent/rounded/glass like Golutra, not a normal full page.
- Preview item layout, tags, unread badges, open terminal/open all/ignore/view all actions match Golutra.
- Hover state and tray preview lifecycle match Golutra behavior.

##### Story 9.10: Parity release gate

Acceptance criteria:

- All `docs/rebuild/feature-inventory.md` user-visible items are pass/abandoned-with-approval.
- All `docs/rebuild/parity-checklist.md` items are updated from `未开始` to `通过` or explicitly approved `放弃`.
- Screenshot and interaction smoke are run for all parity screens.
- Release notes state that this build is a React/Tauri internal rebuild of Golutra, not a redesigned app.

### 4.5 Sprint Status Changes After Approval

Do not edit `sprint-status.yaml` until this proposal is approved.

After approval, update status as:

```yaml
development_status:
  product_acceptance: blocked-golutra-parity
  epic-1: done
  epic-2: done
  epic-3: done
  epic-4: done
  epic-5: done
  epic-6: done
  epic-7: done
  epic-8: done
  epic-9: backlog
  9-1-golutra-parity-baseline: backlog
  9-2-app-shell-titlebar-sidebar-global-systems-parity: backlog
  9-3-workspace-selection-parity: backlog
  9-4-chat-interface-parity: backlog
  9-5-friends-members-invite-modal-parity: backlog
  9-6-terminal-workspace-terminal-pane-parity: backlog
  9-7-settings-parity: backlog
  9-8-skill-store-plugin-marketplace-parity: backlog
  9-9-notification-preview-tray-flow-parity: backlog
  9-10-parity-release-gate: backlog
```

## 5. Checklist Execution Summary

| Checklist Item | Status | Notes |
| --- | --- | --- |
| 1.1 Triggering story | Done | Trigger is post-install user rejection of the delivered app, not one specific implementation story. |
| 1.2 Core problem | Done | Requirement misunderstanding: functional rebuild was treated as acceptable, but actual requirement is Golutra UI/function parity with React internals. |
| 1.3 Evidence | Done | Compared Golutra shell/styles/key screens with current React App/styles/workspace/terminal implementation. |
| 2.1 Current epic viability | Action-needed | Existing epics are not sufficient for product acceptance; they remain infrastructure work only. |
| 2.2 Epic-level changes | Done | Add blocking Epic 9 for Golutra parity. |
| 2.3 Remaining epics | Done | No remaining pre-release epic can be accepted without Epic 9 gate. |
| 2.4 New epic needed | Done | Epic 9 required. |
| 2.5 Priority/order | Done | Epic 9 must run before release; current release readiness is blocked. |
| 3.1 PRD conflicts | Done | PRD must elevate parity from implied reference to release-blocking requirement. |
| 3.2 Architecture conflicts | Done | UI architecture must port Golutra visual system; Material Symbols parity overrides lucide default for parity screens. |
| 3.3 UX conflicts | Done | UX spec lacks visual/pixel parity gates and screenshot baseline. |
| 3.4 Other artifacts | Action-needed | sprint-status, parity checklist, release readiness and smoke fixtures need updates after approval. |
| 4.1 Direct adjustment | Viable | Keep useful infrastructure, add parity epic and rewrite UI layer. |
| 4.2 Rollback | Not viable | Full rollback wastes backend/contracts work and does not create parity plan. |
| 4.3 MVP review | Viable | MVP release definition must be tightened, not reduced. |
| 4.4 Recommended path | Done | Hybrid Direct Adjustment. |
| 5.1 Issue summary | Done | Included above. |
| 5.2 Epic/artifact impact | Done | Included above. |
| 5.3 Path rationale | Done | Included above. |
| 5.4 MVP action plan | Done | Epic 9 story plan defined. |
| 5.5 Handoff plan | Done | See below. |
| 6.1 Checklist review | Done | All applicable areas addressed; action-needed items are documented. |
| 6.2 Proposal accuracy | Done | Proposal is based on current docs and source comparisons. |
| 6.3 User approval | Action-needed | Await explicit approval before updating PRD/UX/Epics/sprint-status or starting implementation. |
| 6.4 Sprint status update | Action-needed | Pending approval. |

## 6. Implementation Handoff

After user approval:

1. Update PRD, Architecture, UX spec and Epics with the changes above.
2. Update `sprint-status.yaml` to mark product acceptance blocked and add Epic 9 backlog stories.
3. Create Story 9.1 and capture parity baselines from `/Users/wdx/opc/golutra`.
4. Implement UI parity screen-by-screen, starting with global styles/assets and shell before feature screens.
5. Run existing tests plus new parity screenshot/interaction smoke before reinstalling.

Execution ownership:

- Developer agent: React UI parity implementation, Tauri window behavior integration, tests.
- Architect/Product owner role: approve parity exceptions and update architecture/PRD wording.
- UX role: inspect screenshots and reject intentional visual drift.

Approval recorded:

User approved this proposal on 2026-05-13 with “开始吧”. Proceed with planning artifact updates, sprint status correction and Epic 9 execution.
