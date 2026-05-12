# Story 1.1: Set up initial project from starter template

Status: done

## Story

As a desktop user,
I want to launch orchlet as a React/Tauri desktop app,
so that I can start from a performant cross-platform shell instead of a browser-only prototype.

## Acceptance Criteria

1. Given a clean implementation workspace, when the project is initialized, then it uses:
   `pnpm create tauri-app orchlet --template react-ts --manager pnpm --identifier com.orchlet.app --tauri-version 2`
   and the application runs on the React + TypeScript + Vite + Tailwind CSS v4 + Tauri 2 + Rust baseline.
2. Given the app is started in development mode, when the main window opens, then the user sees a usable workspace entry surface, not a marketing landing page.
3. Given reusable UI primitives are added, when icon-only buttons are implemented, then they use `lucide-react` icons with `aria-label` and tooltip text.
4. Given frontend code needs backend data, when it calls desktop capabilities, then feature code uses `src/shared/api` instead of direct raw `invoke`, and Rust DTOs live under `src-tauri/src/contracts` with TypeScript types exported through `ts-rs`.

## Tasks / Subtasks

- [x] Task 1: Initialize the official Tauri React TypeScript starter without destroying existing repository files (AC: 1)
  - [x] Confirm the repository root contains BMad/docs artifacts and must not be wiped.
  - [x] Run the required starter command in a safe temporary or sibling location if the current root cannot be targeted directly by `create-tauri-app`.
  - [x] Deliberately merge generated starter files into `/Users/wdx/opc/orchlet`, preserving `_bmad`, `_bmad-output`, `docs`, `.git`, and any user-created files.
  - [x] Use `pnpm` as the package manager and keep the provisional bundle identifier `com.orchlet.app`.
  - [x] Verify generated starter files include `package.json`, `src/`, `src-tauri/`, Vite configuration, Tauri configuration, and Rust sources.

- [x] Task 2: Establish the selected frontend/runtime baseline (AC: 1, 3)
  - [x] Add Tailwind CSS v4 and configure global styles for the app shell.
  - [x] Add `lucide-react` for icons.
  - [x] Add TanStack Query and Zustand only in their intended roles: TanStack Query for IPC-backed async state, Zustand for ephemeral UI state.
  - [x] Do not add Vue, Pinia, redb, Next.js, Remix, T3, Electron, Wails, or old `.golutra` compatibility code in this story.
  - [x] Keep package scripts for `dev`, `build`, `preview` or their Tauri equivalents discoverable from `package.json`.

- [x] Task 3: Replace starter demo content with the first usable desktop entry surface (AC: 2, 3)
  - [x] On first app launch, show a Workspace Selection screen, not a landing page or marketing hero.
  - [x] Screen content must include: app name/brand signal `orchlet`, primary `打开文件夹` card/button, subtitle `选择一个文件夹开始或恢复工作区`, `最近的工作区` block, empty state `暂无最近工作区`, and helper copy `打开文件夹以创建你的第一个工作区。`
  - [x] Primary `打开文件夹` control uses a `FolderOpen` icon, is keyboard focusable, exposes an accessible name, and has loading/disabled/error visual states.
  - [x] Recent workspace empty state uses a history-style icon and does not fake any recent data.
  - [x] Add a minimal desktop titlebar/shell surface appropriate for the starter: macOS may rely on system controls; Windows/Linux custom controls, if implemented now, must expose minimize/maximize/close labels and tooltips.
  - [x] If the actual directory picker and `.orchlet/workspace.json` creation are not implemented in this story, the click handler must use a typed placeholder path through `src/shared/api` and show a clear recoverable toast; it must not pretend the workspace was opened. Story 1.2 owns real workspace metadata creation.

- [x] Task 4: Create shared UI primitives required by this story (AC: 3)
  - [x] Add `src/shared/ui/icon-button` or equivalent shared primitive for icon-only buttons.
  - [x] The primitive must require `aria-label` and tooltip text at the call site or through typed props.
  - [x] Add a minimal tooltip implementation or choose a lightweight local implementation consistent with Tailwind; avoid a heavy UI framework unless justified.
  - [x] Use the primitive for any titlebar/window/action icon-only button added in this story.

- [x] Task 5: Establish typed IPC and contract folder boundaries without overbuilding future features (AC: 4)
  - [x] Create `src/shared/api` as the only frontend location allowed to import/call Tauri `invoke`, `listen`, channels, or Tauri plugins.
  - [x] Create `src-tauri/src/contracts` with at least a common error/result envelope and one minimal bootstrap/workspace-selection DTO needed by this starter shell.
  - [x] Add `ts-rs` and export TypeScript bindings into `src/contracts/generated` or document the exact command/script if export must wait for the next foundation story.
  - [x] Ensure feature/page/widget code imports typed functions from `src/shared/api`; no raw `invoke` appears outside `src/shared/api`.
  - [x] Keep Rust Tauri command exposure under `src-tauri/src/gateway`; gateway code delegates or returns typed placeholder errors and does not hold business logic.

- [x] Task 6: Prepare minimal Tauri capability/window-mode scaffolding (AC: 2, 4)
  - [x] Keep the main window runnable in dev mode.
  - [x] Add or preserve `src-tauri/capabilities` structure if the starter supports it cleanly now.
  - [x] Name intended window modes in code/config comments or type definitions: `main`, `workspace-selection`, `terminal`, `notification-preview`.
  - [x] Do not grant broad filesystem, shell, notification, or terminal permissions beyond what the starter shell needs.

- [x] Task 7: Verification and completion evidence (AC: 1-4)
  - [x] Install dependencies with `pnpm install`.
  - [x] Run available static checks/builds: at minimum `pnpm build`; run `pnpm tauri dev` or `pnpm tauri build` when local prerequisites allow.
  - [x] Run Rust checks from `src-tauri` where feasible, such as `cargo check`.
  - [x] Search for forbidden raw Tauri calls outside `src/shared/api`.
  - [x] Record any platform/toolchain prerequisites that prevented full verification in the Dev Agent Record; do not mark blocked checks as passed.

### Review Findings

- [x] [Review][Patch] Remove the unused opener plugin and capability from the starter shell [src-tauri/capabilities/default.json:6]
- [x] [Review][Patch] Fix starter HTML metadata for the Chinese UI and missing Vite favicon [index.html:2]

## Dev Notes

### Critical Scope Rules

- This story creates the implementation foundation and first desktop entry surface. It does not complete real workspace opening, recent workspace persistence, `.orchlet/workspace.json` creation, SQLite schema, terminal sessions, chat, notifications, or diagnostics.
- Story 1.2 owns real directory open and workspace metadata creation. If this story adds an `打开文件夹` click path, it must be a truthful typed placeholder or a very small directory-selection-only slice with no fake workspace success state.
- No legacy data compatibility is required. Do not read old `.golutra` data, do not create redb adapters, and do not copy the old Vue store/component structure.
- The reference project `/Users/wdx/opc/golutra` is product/UX reference only. Do not treat it as a source of implementation architecture, storage compatibility, or framework choice.

### Latest Version Snapshot

Registry checks on 2026-05-11 confirmed these current versions for this foundation story:

- `create-tauri-app@4.6.2`
- `@tauri-apps/cli@2.11.1`
- Rust crate `tauri@2.11.1`
- `react@19.2.6`
- `vite@8.0.11`
- `tailwindcss@4.3.0`
- `lucide-react@1.14.0`
- `@tanstack/react-query@5.100.9`
- `zustand@5.0.13`
- Rust crate `ts-rs@12.0.1`
- Rust crate `rusqlite@0.39.0`
- Rust crate `portable-pty@0.9.0`

If the starter generates newer compatible patch/minor versions at implementation time, keep the lockfile authoritative and document the final versions in the Dev Agent Record. Do not downgrade below the architecture baseline without an explicit correction-course artifact.

### Architecture Compliance

- Selected starter: official Tauri 2 `react-ts` starter, not a web-first SSR starter.
- Frontend stack: React + TypeScript + Vite + Tailwind CSS v4.
- Desktop backend: Tauri 2 + Rust.
- Future structured persistence path: SQLite/rusqlite and `.orchlet`; no redb in MVP.
- IPC access boundary: `src/shared/api` only.
- Rust command/event boundary: `src-tauri/src/gateway` only.
- Contract DTO boundary: `src-tauri/src/contracts`; generated TypeScript under `src/contracts/generated`.
- Frontend module layout should move toward:

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
    api/
    ui/
    config/
    lib/
  contracts/
    generated/
```

- Backend module layout should move toward:

```text
src-tauri/src/
  gateway/
  app/
  domain/
  infrastructure/
  contracts/
  workers/
```

For Story 1.1, create only the folders needed to make the boundary real and understandable. Do not generate empty broad feature folders unless they clarify immediate imports.

### UX Requirements for First Screen

- User opens app and immediately sees a desktop workspace entry surface.
- Required visible controls/states:
  - Primary `打开文件夹` card/button: opens the future workspace selection flow; in this story it must either call a typed placeholder or a scoped directory-selection slice.
  - Recent workspaces section: title `最近的工作区`; empty state `暂无最近工作区`.
  - Error toast pattern: explain what happened, impact, and next action.
  - Loading/disabled state on `打开文件夹` while any async placeholder/API call is running.
  - Keyboard focus outline for the primary action.
- Avoid marketing layout patterns: no hero sales copy, no oversized illustrative landing page, no fake onboarding content, no nested cards.
- Icon-only controls must use `lucide-react`, `aria-label`, and tooltip text.

### Testing Requirements

- Minimum checks for completion:
  - `pnpm install`
  - `pnpm build`
  - `cargo check` inside `src-tauri` if Rust/Tauri prerequisites are installed
  - A grep/rg check proving raw Tauri calls are contained in `src/shared/api`
- If Tauri dev launch is feasible locally, verify the app window opens to the Workspace Selection screen.
- If full `pnpm tauri dev` cannot run in the agent environment, document the missing prerequisite and provide the best completed checks; do not claim desktop launch was verified.

### Previous Story Intelligence

- This is the first implementation story. There are no prior story files or implementation commits to preserve.
- The current repository has BMad/docs artifacts but no app implementation baseline yet. Treat generated starter files as new implementation files while preserving existing planning outputs.

### Project Structure Notes

- Existing repository content is sparse and must be preserved: `.git`, `_bmad`, `_bmad-output`, and `docs`.
- There is no `project-context.md` yet. Use the PRD, architecture, UX specification, epics, and sprint status as the source of truth until a project context artifact is generated.
- The git branch has no commits yet, so there is no local code convention beyond the planning artifacts.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 1.1, Epic 1 context, starter requirement, no Vue/redb/legacy compatibility.
- `_bmad-output/planning-artifacts/prd.md` - FR1, FR8, NFR20, NFR26, NFR33, NFR34.
- `_bmad-output/planning-artifacts/architecture.md` - selected starter, version snapshot, IPC/contracts boundaries, frontend/backend project structure, implementation handoff.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Workspace Selection first screen, accessibility rules, empty/loading/error matrix, implementation handoff checklist.
- `_bmad-output/planning-artifacts/research/technical-react-cross-platform-desktop-ai-cli-orchestration-architecture-research-2026-05-11.md` - technical research supporting React/Tauri/Rust cross-platform architecture.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm create tauri-app orchlet --template react-ts --manager pnpm --identifier com.orchlet.app --tauri-version 2 --yes` run in `/tmp/orchlet-starter-RI9o5T`, then generated files merged into repo root.
- Red test run: `pnpm test` failed against default starter because Workspace Selection UI was not implemented.
- Green test run: `pnpm test` passed, 1 file / 2 tests.
- Contract export and Rust tests: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed, 5 generated ts-rs export tests.
- Frontend build: `pnpm build` passed with Vite 8.
- Rust static check: `cargo check` passed from `src-tauri`.
- IPC boundary scan: `rg -n "@tauri-apps/api|invoke\\(" src src-tauri/src` only found `src/shared/api/client.ts`.
- Desktop packaging: `pnpm tauri build` passed and produced macOS app/dmg. Tauri warned that `com.orchlet.app` ends in `.app`; this is kept because the story explicitly requires that provisional identifier.
- Browser verification: Vite page at `http://127.0.0.1:1420/` exposed title `orchlet`, heading `orchlet`, buttons `刷新最近工作区`, `打开设置`, `打开文件夹`, recent-workspace empty state, and typed placeholder toast.
- Code review fixes: removed unused Tauri opener plugin/dependency/capability and corrected HTML document metadata for the Chinese workspace-selection UI.

### Completion Notes List

- Story context engine analysis completed on 2026-05-11.
- Implemented official Tauri 2 + React + TypeScript starter foundation using a safe temporary scaffold merge.
- Upgraded/locked the frontend baseline to React 19.2.6, Vite 8.0.11, Tailwind CSS 4.3.0, lucide-react 1.14.0, TanStack Query 5.100.9 and Zustand 5.0.13.
- Replaced starter demo content with a usable Workspace Selection surface: `打开文件夹`, subtitle, recent workspace empty state, shell action icon buttons and accessible tooltips.
- Established `src/shared/api` as the sole frontend Tauri boundary and added browser/test fallback behavior for the Story 1.1 placeholder.
- Added Rust `src-tauri/src/contracts` DTOs with `ts-rs` exports into `src/contracts/generated`, plus a `src-tauri/src/gateway` command boundary.
- Kept real directory selection and `.orchlet/workspace.json` creation out of scope; the open action shows a truthful recoverable placeholder toast for Story 1.2.
- Verified tests, frontend build, Rust check, Rust contract export tests, IPC boundary scan, browser accessibility snapshot and Tauri macOS packaging.

### File List

- `.gitignore`
- `.vscode/extensions.json`
- `README.md`
- `index.html`
- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `src/App.test.tsx`
- `src/App.tsx`
- `src/app/styles.css`
- `src/contracts/generated/common.ts`
- `src/contracts/generated/index.ts`
- `src/contracts/generated/workspace.ts`
- `src/main.tsx`
- `src/pages/workspace-selection/index.ts`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/errors.ts`
- `src/shared/api/index.ts`
- `src/shared/api/workspace-api.ts`
- `src/shared/ui/icon-button.tsx`
- `src/shared/ui/index.ts`
- `src/shared/ui/toast-store.ts`
- `src/shared/ui/toast.tsx`
- `src/test/setup.ts`
- `src/vite-env.d.ts`
- `src-tauri/.gitignore`
- `src-tauri/Cargo.lock`
- `src-tauri/Cargo.toml`
- `src-tauri/build.rs`
- `src-tauri/capabilities/default.json`
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/128x128@2x.png`
- `src-tauri/icons/32x32.png`
- `src-tauri/icons/Square107x107Logo.png`
- `src-tauri/icons/Square142x142Logo.png`
- `src-tauri/icons/Square150x150Logo.png`
- `src-tauri/icons/Square284x284Logo.png`
- `src-tauri/icons/Square30x30Logo.png`
- `src-tauri/icons/Square310x310Logo.png`
- `src-tauri/icons/Square44x44Logo.png`
- `src-tauri/icons/Square71x71Logo.png`
- `src-tauri/icons/Square89x89Logo.png`
- `src-tauri/icons/StoreLogo.png`
- `src-tauri/icons/icon.icns`
- `src-tauri/icons/icon.ico`
- `src-tauri/icons/icon.png`
- `src-tauri/src/contracts/common.rs`
- `src-tauri/src/contracts/mod.rs`
- `src-tauri/src/contracts/workspace.rs`
- `src-tauri/src/gateway/mod.rs`
- `src-tauri/src/gateway/workspace_commands.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/main.rs`
- `src-tauri/tauri.conf.json`

## Change Log

- 2026-05-11: Implemented Story 1.1 starter foundation and moved story to review.
