---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'React 跨平台桌面 AI CLI 编排架构技术选型'
research_goals: '为 orchlet 新版架构提供最新、性能优先、跨平台、本地优先、可迁移的技术栈建议，重点评估 React 替代 Vue、桌面运行时、本地后端、PTY/终端、IPC、数据库、构建工具、测试和发布策略。'
user_name: '王定旭'
date: '2026-05-11'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-05-11
**Author:** 王定旭
**Research Type:** technical

---

## Research Overview

本技术研究为 `orchlet` 新版架构定案提供当前技术证据。研究范围覆盖 React 替代 Vue、跨平台桌面运行时、本地后端、终端/PTY、IPC/typed contracts、存储/迁移、测试、发布和安全边界，并以 PRD 中的“跨平台、高性能、本地优先、同功能不遗漏、技术栈可重选”为约束。

核心结论：默认架构候选应是 Tauri 2 + Rust 本地后端 + React 19.2 + TypeScript + Vite 8 + Tailwind CSS v4 + xterm.js 6；数据层采用 SQLite/rusqlite 作为新架构主路径；IPC 使用 Tauri commands/channels/events，但必须包在 typed facade 和集中契约后面。

**Constraint update:** 旧版 `golutra` 数据兼容已明确移出范围。本报告中早期关于 redb 兼容、旧数据迁移、旧 `.golutra` 的讨论仅保留为历史研究背景，不再作为目标架构建议。目标架构以 PRD 和 Architecture 的最新约束为准：新 `.orchlet` schema + SQLite-first。

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technical Research Scope Confirmation

**Research Topic:** React 跨平台桌面 AI CLI 编排架构技术选型
**Research Goals:** 为 orchlet 新版架构提供最新、性能优先、跨平台、本地优先、可迁移的技术栈建议，重点评估 React 替代 Vue、桌面运行时、本地后端、PTY/终端、IPC、数据库、构建工具、测试和发布策略。

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-05-11

## Technology Stack Analysis

### Programming Languages

**Recommendation:** React/TypeScript for the UI, Rust for local backend/system services, SQL or typed key-value storage for durable local data, and Node only as development tooling or explicitly isolated sidecar when unavoidable.

React is the requested frontend direction and has current official support for React 19.2, including `Activity`, `useEffectEvent`, React Performance Tracks, and Partial Pre-rendering capabilities. For this desktop app, the most relevant React 19.2 items are state preservation for hidden UI areas, cleaner event/effect separation, and profiling support for UI responsiveness. React Compiler is relevant but should be adopted incrementally; official docs describe it as automatic memoization that can remove manual `useMemo`, `useCallback`, and `React.memo` pressure, but compiler adoption must be validated against terminal-heavy UI code. Sources: [React 19.2](https://react.dev/blog/2025/10/01/react-19-2), [React Compiler](https://react.dev/learn/react-compiler).

Rust remains the strongest local backend candidate because `orchlet` needs PTY/session lifecycle, filesystem access, local database migration, cross-platform packaging, diagnostics, and high-frequency stream handling. Tauri’s official positioning fits this split: any frontend that compiles to HTML/CSS/JS can be used while backend logic can use Rust, Swift, or Kotlin; Tauri emphasizes small binaries, a Rust security foundation, native system webviews, and flexible frontend choice. Source: [Tauri start docs](https://v2.tauri.app/start/).

Registry check on 2026-05-11:

- npm: `react@19.2.6`, `vite@8.0.11`, `@vitejs/plugin-react@6.0.1`, `tailwindcss@4.3.0`, `@xterm/xterm@6.0.0`, `vitest@4.1.5`, `playwright@1.59.1`.
- crates.io: `tauri@2.11.1`, `redb@4.1.0`, `portable-pty@0.9.0`, `tokio@1.52.3`, `rusqlite@0.39.0`, `tauri-specta@2.0.0-rc.25`, `rspc@1.0.0-rc.5`.

_Popular Languages:_ TypeScript + Rust.
_Emerging/Optional:_ Rust type-generation tooling (`specta`, `tauri-specta`, `rspc`) is promising but still release-candidate in registry checks, so it needs architecture-stage risk assessment.
_Performance Characteristics:_ Rust should own I/O, PTY, storage, diagnostics, migration, and dispatch queues; React should own view state and interaction orchestration only.
_Confidence:_ High for React/TypeScript + Rust; medium for exact type-generation library choice until CA validates maturity.

### Development Frameworks and Libraries

**Desktop runtime:** Tauri 2 should be the default architecture candidate. It supports major desktop platforms, system webviews, frontend flexibility, Rust backend commands, plugin permissions/capabilities, updater, tray/window APIs, and smaller app size than browser-bundling runtimes. Electron remains a viable fallback when Chromium consistency or Node ecosystem depth matters more than bundle size and native backend isolation; Electron’s own docs state it embeds Chromium and Node.js in the binary for cross-platform apps. Flutter is not aligned with the requested React frontend direction, though it is a mature desktop UI option for Dart-native products. Sources: [Tauri](https://v2.tauri.app/start/), [Electron](https://www.electronjs.org/docs/latest/), [Flutter desktop](https://docs.flutter.dev/platform-integration/desktop).

**Build tool:** Vite 8 is the preferred React build tool candidate. Official Vite 8 docs state it ships with Rolldown as a unified Rust-based bundler, claiming 10-30x faster builds than Rollup while keeping plugin compatibility goals. This is directly relevant to a large React desktop app because fast local rebuilds and production builds reduce iteration cost. Source: [Vite 8 announcement](https://vite.dev/blog/announcing-vite8).

**CSS/UI styling:** Tailwind CSS v4 is a good default styling engine if paired with a restrained design system. Its official v4 release emphasizes a high-performance engine, CSS-first configuration, native CSS features, automatic content detection, and first-party Vite plugin integration. Use Tailwind for layout/design tokens and custom components for desktop-dense UI; avoid marketing-page patterns. Source: [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4).

**Terminal renderer:** `@xterm/xterm` remains the strongest browser/WebView terminal renderer candidate. Xterm.js is used by Visual Studio Code, Theia, Azure Cloud Shell, and many web terminal products, and npm registry shows `@xterm/xterm@6.0.0`. `orchlet` should keep xterm for terminal rendering unless CA finds a Tauri/WebView-specific blocker. Source: [xterm.js](https://xtermjs.org/).

**PTY library:** `portable-pty@0.9.0` remains a strong default for Rust PTY abstraction. Docs describe a cross-platform API for system PTY interfaces and runtime-selectable PTY implementations, including Windows-specific variation. Source: [portable-pty docs](https://docs.rs/portable-pty/latest/portable_pty/).

_Major Frameworks:_ React 19.2 + Vite 8 + Tailwind 4 + Tauri 2 + xterm.js + Rust backend.
_Micro-frameworks:_ Typed IPC helper libraries may be used, but only after maturity review.
_Evolution Trends:_ Frontend build tooling is moving to Rust-native bundling; React is adding compiler/profiling/state preservation capabilities; desktop shells are moving toward explicit permissions and smaller native-webview packages.
_Confidence:_ High for React/Vite/Tailwind/Tauri/xterm as candidates; final architecture should confirm exact versions and compatibility matrix.

### Database and Storage Technologies

`orchlet` has mixed storage needs: structured chat/history queries, workspace metadata, settings, migration reports, session caches, and high-confidence durability. The current reference project uses redb for chat storage; `redb@4.1.0` is an embedded Rust key-value store with ACID transactions, MVCC, crash safety, savepoints, and rollback support. Source: [redb docs](https://docs.rs/redb/latest/redb/).

SQLite deserves serious consideration for the new architecture. SQLite’s own documentation argues that a SQLite database file is a strong application file format because it is cross-platform, transactional, incrementally updateable, widely supported, queryable, and accessible across languages. For `orchlet`, SQLite is especially attractive for conversations, messages, attachments indexes, migrations, diagnostics, and ad hoc repair tooling. Source: [SQLite application file format](https://www.sqlite.org/appfileformat.html).

**Recommendation for CA evaluation:**

- Use SQLite/rusqlite as the leading candidate for chat, conversations, diagnostics, migration reports, and structured data.
- Use JSON/TOML for simple human-readable workspace metadata where editability matters.
- Keep redb as a candidate only if key-value performance and pure-Rust deployment outweigh SQL query/migration advantages.
- Avoid storing business facts only in browser localStorage; reserve it for UI cache.

_Relational Databases:_ SQLite is the leading candidate for structured local durable data.
_Key-Value Stores:_ redb is viable for high-performance embedded Rust storage and current-data compatibility.
_In-Memory Stores:_ Use Rust in-memory repositories/queues for terminal session state; persist only durable facts and recovery snapshots.
_Data Warehousing:_ Not relevant for MVP; diagnostics exports can be file-based.
_Confidence:_ High that SQLite should be evaluated seriously; medium on redb vs SQLite until CA weighs migration compatibility and query needs.

### Development Tools and Platforms

**Testing:** Vitest 4.1.5 is the natural unit/component test runner for a Vite React frontend; official docs call Vitest a next-generation testing framework powered by Vite and note Vite/Node version requirements. Playwright 1.59.1 should be used for WebView/browser-style E2E and UI smoke where possible; official docs emphasize cross-browser support on Windows, Linux, and macOS and rich tooling. Sources: [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro).

**Rust async/runtime:** Tokio remains the default Rust async runtime candidate for background workers, outbox, diagnostics, and I/O coordination. Registry shows `tokio@1.52.3`; final architecture should align Tauri async usage, runtime ownership, and shutdown semantics.

**IPC/type safety:** Tauri’s JS API exposes `invoke` for frontend-to-backend calls and `Channel<T>`/resource concepts for richer IPC. Tauri capability files allow explicit window/permission boundaries and platform-specific capabilities; this supports the PRD requirement that command/event/window contracts be centralized. Sources: [Tauri core API](https://tauri.app/reference/javascript/api/namespacecore/), [Tauri capabilities](https://v2.tauri.app/security/capabilities/).

**Type generation:** Candidate tools include `specta`, `tauri-specta`, and `rspc`; registry checks show these are release-candidate versions. They may still be useful, but CA should choose based on stability, Tauri 2 compatibility, generated TypeScript quality, streaming/event support, and ability to support command fixtures.

_IDE and Editors:_ VS Code or JetBrains are sufficient; no product dependency.
_Version Control:_ GitHub Actions is sufficient for CI/release initially.
_Build Systems:_ Vite 8 + Tauri CLI + Cargo; do not introduce a monorepo build orchestrator until there is real need.
_Testing Frameworks:_ Vitest, Playwright, Rust unit/integration tests, and Tauri/WebDriver or app smoke tests.
_Confidence:_ High for Vitest/Playwright/Rust tests; medium for exact Tauri E2E harness pending architecture.

### Cloud Infrastructure and Deployment

`orchlet` is local-first and should not require cloud infrastructure for MVP. Deployment infrastructure is release infrastructure, not runtime infrastructure.

If Tauri remains the desktop runtime, the updater plugin supports automatic updates via an update server or static JSON and requires signed updates. Official docs state updater signatures cannot be disabled and list platform artifacts for Windows, macOS, and Linux. This supports PRD requirements for signed updates, schema-aware migrations, and platform release notes. Source: [Tauri updater](https://v2.tauri.app/plugin/updater/).

**Recommendation:**

- MVP runtime: no required cloud services.
- Release: GitHub Releases or equivalent static update JSON is sufficient initially.
- CI: build Windows/macOS/Linux artifacts, run smoke, publish signed artifacts only after migration checks.
- Future: plugin marketplace/template distribution can use a remote service later, but it must remain optional and explicit.

_Major Cloud Providers:_ Not needed for MVP runtime.
_Container Technologies:_ Not relevant except CI/build isolation.
_Serverless Platforms:_ Not relevant for MVP.
_CDN/Edge:_ Useful only for future downloads, templates, and update metadata.
_Confidence:_ High.

## Implementation Approaches and Technology Adoption

### Technology Adoption Strategies

`orchlet` should not do a blind rewrite. It should follow a controlled modernization path:

1. Freeze behavior with PRD + parity checklist.
2. Run technical research and architecture before implementation.
3. Build vertical slices around the riskiest paths.
4. Migrate capability by capability with fixtures and smoke tests.
5. Keep old data readable until migration is proven.

The Strangler Fig pattern is relevant as a modernization strategy, not because `orchlet` should run old and new apps forever, but because the principle is right: replace bounded capabilities incrementally while preserving behavior and reducing transformation risk. Microsoft describes it as a controlled, phased approach for modernization where functionality is gradually replaced and clients do not need to track old/new locations. Source: [Microsoft Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig).

Adoption order:

- **Spike 1:** Tauri 2 + React + Vite + xterm + Rust PTY shell session.
- **Spike 2:** typed command/channel/event contracts with one terminal stream and one chat command.
- **Spike 3:** SQLite vs redb benchmark using old chat/workspace sample shapes.
- **Spike 4:** migration dry-run and report against reference data.
- **Spike 5:** three-platform smoke on Windows/macOS/Linux.

_Confidence:_ High.

### Development Workflows and Tooling

Recommended workflow:

- ADRs for major choices: desktop runtime, database, typed IPC, terminal engine, migration strategy, test stack.
- Contract-first implementation: commands/events/storage schemas before full UI.
- Feature slices: workspace open, terminal session, chat send, dispatch, notification, migration.
- CI gates: formatting, linting, type checking, unit tests, contract tests, Rust tests, migration fixtures, smoke.
- PR review checklist maps changes to FR/NFR and parity checklist items.

Use Vite/Vitest for frontend fast feedback, Cargo/Rust tests for backend logic, Playwright for UI/E2E where the WebView behavior can be approximated, and Tauri-specific app smoke for actual packaged/runtime behavior.

Sources: [Vitest guide](https://vitest.dev/guide/), [Playwright docs](https://playwright.dev/docs/intro), [Tauri testing and mocking](https://v2.tauri.app/develop/tests/mocking/).

_Confidence:_ High for workflow; medium for exact app E2E harness until CA chooses tooling.

### Testing and Quality Assurance

Testing must be layered:

- **Contract tests:** DTO schema, command payload fixtures, event payload fixtures, storage manifest fixtures.
- **Domain tests:** chat, workspace, terminal session state machine, dispatch queue, notification aggregation, migration decisions.
- **Integration tests:** SQLite/redb repository behavior, PTY adapter behavior, file system adapters, skill link/unlink behavior.
- **Frontend tests:** React state/view-model behavior, component behavior for core controls.
- **E2E/smoke:** open workspace, invite member, start shell, send message, terminal output, notification jump, restart recovery.
- **Migration tests:** old data sample -> dry-run report -> apply -> verify counts and key relations.
- **Performance tests:** terminal output flood, chat history pagination, startup/open workspace timings.

Do not rely on manual QA for terminal reliability or migration. The PRD’s 80 FRs and 45 NFRs should become traceability inputs for tests and epics.

_Confidence:_ High.

### Deployment and Operations Practices

Deployment should remain simple until updater and migration are safe:

- Build signed artifacts per platform.
- Publish release candidates internally before public release.
- Run dry-run migration on fixture data during CI/release.
- Keep update checks optional until rollback/migration failure behavior is proven.
- Produce release notes grouped by feature, migration, security, breaking changes and known issues.

Tauri updater docs require signed updates and list platform-specific artifacts, so updater adoption must be coupled to release signing and migration safety. Source: [Tauri updater](https://v2.tauri.app/plugin/updater/).

Operational excellence for this local app means diagnosability rather than server uptime: users must be able to export useful logs without leaking secrets, and developers must be able to correlate workspace/conversation/message/member/session/window/job identifiers.

_Confidence:_ High.

### Team Organization and Skills

Minimum skill coverage:

- React desktop UX engineer.
- Rust/Tauri systems engineer.
- Terminal/PTY engineer.
- Local data/migration engineer.
- Test automation engineer.
- Release/cross-platform engineer.
- Product/PM owner maintaining parity decisions.

For a small team, one person can cover multiple roles, but ownership boundaries should still exist in architecture docs.

Recommended ownership model:

- Frontend app shell and interaction model.
- Typed IPC/contracts.
- Terminal engine.
- Chat/orchestration.
- Persistence/migration.
- Platform/release.
- Diagnostics/testing.

_Confidence:_ High.

### Cost Optimization and Resource Management

Primary cost is engineering complexity, not cloud spend. Avoid cost growth by:

- avoiding Electron unless Chromium consistency becomes necessary;
- avoiding microservices and cloud runtime dependencies in MVP;
- avoiding remote plugin marketplace in MVP;
- using local-first storage;
- building thin vertical slices before full UI;
- choosing boring, testable storage over custom binary formats;
- avoiding RC type-generation libraries unless the fallback path is clear.

Runtime resource budgets should be set in CA:

- memory budget per terminal session;
- scrollback size;
- channel buffer limits;
- dispatch queue limits;
- diagnostics log retention;
- migration batch size;
- CPU budget for terminal render and notification image generation.

_Confidence:_ High.

### Risk Assessment and Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Tauri WebView behavior differs across platforms | terminal/UI bugs | run early platform smoke; keep WebView-specific CSS/IME tests |
| typed IPC tooling immature | contract drift | use generated contracts only if stable; keep explicit fixtures fallback |
| SQLite vs redb wrong choice | migration/reliability cost | prototype both against real chat/workspace sample shapes |
| terminal stream floods UI | freezes | channel backpressure, batching, ACK, snapshot attach |
| old data migration loses history | user trust loss | dry-run, backup, migration report, fixtures |
| external CLI changes | member launch failures | adapter/config approach, clear errors, custom CLI fallback |
| product scope expands into CEO Agent too early | MVP delay | keep CEO Agent in Phase 3; enforce parity-first MVP |
| diagnostics leak sensitive data | privacy/security issue | redaction, preview, user confirmation |

Sources: [OWASP SAMM](https://owasp.org/www-project-samm/), [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/stable-en/).

_Confidence:_ High.

## Technical Research Recommendations

### Implementation Roadmap

1. **Before CA:** preserve PRD as capability contract; collect sample old data; create architecture decision questions.
2. **CA Phase:** decide desktop runtime, database, IPC/type generation, terminal engine, module boundaries, data migration and test strategy.
3. **Prototype Phase:** validate Tauri + React + xterm + Rust PTY + typed IPC + storage candidate on one thin vertical slice.
4. **Foundation Phase:** implement contracts, storage manifest, migration fixtures, diagnostics ID model and platform adapter shell.
5. **MVP Capability Phase:** implement workspace, chat, members, terminal, dispatch, notifications, settings, skills and migration in feature slices.
6. **Release Phase:** run parity checklist, migration dry-run, three-platform smoke, signed artifacts and release notes.

### Technology Stack Recommendations

| Area | Recommendation | Confidence |
| --- | --- | --- |
| Desktop runtime | Tauri 2 + Rust as default; Electron only fallback | High |
| Frontend | React 19.2 + TypeScript | High |
| Build | Vite 8 + `@vitejs/plugin-react` | High |
| Styling | Tailwind CSS v4 + custom desktop components | High |
| Terminal UI | xterm.js 6 | High |
| PTY backend | `portable-pty` or validated equivalent | High |
| Async/runtime | Tokio + Tauri managed state/workers | High |
| Structured storage | SQLite/rusqlite leading candidate | Medium-high |
| KV/compat storage | redb only if benchmark/migration demands | Medium |
| IPC | Tauri commands/channels/events behind typed facade | High |
| Type generation | Evaluate `tauri-specta`/`specta`/`rspc`; keep fallback | Medium |
| Testing | Vitest + Playwright + Rust tests + app smoke | High |
| Release | signed per-platform builds; updater after migration safety | High |

### Skill Development Requirements

- React performance profiling and multi-window state design.
- Tauri 2 security/capabilities, IPC, channels, updater and packaging.
- Rust async, PTY process handling, filesystem safety and database migrations.
- SQLite/redb storage design and migration tooling.
- xterm.js rendering, fit/search/webgl behavior and IME quirks.
- Cross-platform release engineering.
- Test architecture for desktop apps and migration-heavy products.

### Success Metrics and KPIs

- Stack prototype proves shell launch, terminal output, typed IPC and basic storage on macOS plus at least one other OS.
- Database prototype imports representative old chat/workspace data and produces a migration report.
- Terminal flood test does not block chat input or window interactions.
- Contract tests cover all MVP command/event DTOs before UI completion.
- Three-platform smoke passes before MVP beta.
- Parity checklist has no untriaged items before release.

## Research Synthesis

### Executive Summary

`orchlet` 的技术路线应围绕一个原则：用本地系统能力承载复杂性，用 React 只承载交互界面。产品的核心风险不是普通 Web UI，而是 PTY 终端、跨窗口事件、聊天到终端派发、本地数据库迁移、托盘通知、插件/技能权限和三平台发布。架构必须把这些能力放在强边界内，否则新版会重复旧版状态源分散、IPC 契约分散、store 过重和迁移脆弱的问题。

当前公开资料和 registry 检查支持以下默认候选：Tauri 2 + Rust 作为桌面与本地后端；React 19.2 + TypeScript 作为 UI；Vite 8 作为构建工具；Tailwind CSS v4 作为样式系统；xterm.js 6 作为终端渲染；portable-pty 作为 PTY 候选；SQLite/rusqlite 作为结构化本地数据领先候选；redb 作为兼容和 key-value 性能候选；Vitest、Playwright、Rust tests 和 app smoke 组成测试矩阵。

**Key Technical Findings:**

- Tauri 2 的 Core/WebView 分工、IPC、capabilities、updater 和小体积定位契合本地跨平台桌面开发者工具。
- React 19.2 满足前端方向，React Compiler 可后续增量评估，不应成为 MVP 前置风险。
- Vite 8 的 Rolldown 方向、Tailwind 4 的高性能引擎和 CSS-first 配置适合 React 桌面 UI。
- xterm.js 仍是 WebView 终端渲染主选；终端可靠性取决于后端 PTY 生命周期、ACK、快照和背压。
- SQLite 更适合聊天、诊断、迁移报告和可查询历史；redb 可保留为兼容/性能候选，但不应默认延续 bincode/schema 不透明问题。
- typed IPC 是架构硬要求，不是工程锦上添花。

**Technical Recommendations:**

- 默认采用 Tauri 2 + Rust + React 19.2 + TypeScript + Vite 8 + Tailwind 4。
- 用 modular monolith + ports/adapters；不要引入微服务或云运行时依赖。
- CA 阶段必须先原型验证 Tauri channel terminal stream、typed IPC、SQLite/redb 数据层和三平台 smoke。
- 将 workspace、chat、terminal、orchestration、notification、settings、skills、diagnostics、migration 拆为领域模块。
- MVP 前先建立 contracts、storage manifest、migration fixtures 和 parity smoke。

### Table of Contents

1. Technical Research Scope Confirmation
2. Technology Stack Analysis
3. Integration Patterns Analysis
4. Architectural Patterns and Design
5. Implementation Approaches and Technology Adoption
6. Research Synthesis
7. Source Verification and Technical Appendices

### Technical Research Significance

AI coding tools正在从单 Agent 对话转向多 Agent、后台 Agent、终端 Agent 和长期任务执行。`orchlet` 的机会不是复制某个 IDE 或 CLI，而是建立本地跨 CLI 编排层。这个方向要求架构同时满足桌面系统集成、终端可靠性、本地数据安全、可迁移和可扩展插件边界。技术研究必须先于 CA，否则“性能最好、最新架构”的要求会变成主观选择。

_Technical Importance:_ 终端/PTY、IPC、数据库和三平台能力是产品核心，不是底层实现细节。
_Business Impact:_ 技术栈选错会直接导致用户迁移失败、终端不可靠、UI 卡顿或跨平台发布困难。
_Sources:_ [Tauri Process Model](https://v2.tauri.app/concept/process-model/), [OpenAI Codex](https://github.com/openai/codex), [Claude Code subagents](https://code.claude.com/docs/en/subagents), [Warp Local Agents](https://docs.warp.dev/agent-platform/local-agents/overview/).

### Current Technical Landscape and Architecture Analysis

The recommended architecture is a local modular monolith:

```text
React WebViews
  -> typed frontend API facade
  -> Tauri IPC gateway
  -> application use cases
  -> domain services
  -> infrastructure adapters
  -> OS / PTY / DB / filesystem / tray / updater / external CLIs
```

This gives `orchlet` a single local deployment unit while preserving internal architecture boundaries. It avoids microservice overhead and avoids pushing PTY, migration, diagnostics, and filesystem concerns into the frontend.

_Dominant Pattern:_ local modular monolith with ports/adapters.
_Architectural Trade-off:_ less runtime distribution complexity; more responsibility on module boundaries and tests.
_Source:_ [Tauri Architecture](https://v2.tauri.app/concept/architecture/).

### Implementation Approaches and Best Practices

Implementation should proceed by risk, not by screen order:

1. terminal shell slice;
2. typed command/channel/event slice;
3. database/migration slice;
4. workspace + chat + dispatch slice;
5. notification + terminal recovery slice;
6. settings/skills/diagnostics slice;
7. cross-platform release slice.

The Strangler Fig modernization principle applies to behavior replacement: freeze current capabilities, replace bounded areas, prove parity, then expand. Source: [Microsoft Strangler Fig Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig).

### Technology Stack Evolution and Current Trends

Registry and official-source checks on 2026-05-11 indicate:

- `react@19.2.6`
- `vite@8.0.11`
- `@vitejs/plugin-react@6.0.1`
- `tailwindcss@4.3.0`
- `@xterm/xterm@6.0.0`
- `vitest@4.1.5`
- `playwright@1.59.1`
- `tauri@2.11.1`
- `redb@4.1.0`
- `portable-pty@0.9.0`
- `tokio@1.52.3`
- `rusqlite@0.39.0`

_Trend:_ frontend build and desktop infrastructure are moving toward Rust-native performance components while preserving web UI productivity.
_Sources:_ [React 19.2](https://react.dev/blog/2025/10/01/react-19-2), [Vite 8](https://vite.dev/blog/announcing-vite8), [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4), [xterm.js](https://xtermjs.org/).

### Integration and Interoperability Patterns

Commands, channels and events must not be interchangeable. The architecture should enforce:

- commands for request/response operations;
- channels for terminal stream and long-running progress;
- events for lifecycle/state notifications;
- durable outbox for chat-to-terminal dispatch;
- repositories for storage, never direct frontend file writes.

_Source:_ [Tauri IPC](https://v2.tauri.app/concept/inter-process-communication/), [Tauri Channels](https://v2.tauri.app/es/develop/calling-rust/).

### Performance and Scalability Analysis

Performance bottlenecks are local:

- terminal output volume;
- terminal attach and snapshot consistency;
- chat history size;
- migration scan/apply duration;
- notification avatar/icon generation;
- multi-window synchronization;
- external CLI startup latency.

CA should define budgets for scrollback, channel buffers, dispatch queues, diagnostic retention and migration batch size. AWS Well-Architected pillars are useful as an evaluation checklist, but `orchlet` should translate them to local desktop reliability, security, performance and operability. Source: [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html).

### Security and Compliance Considerations

The main security model is local least privilege:

- split Tauri capabilities by window;
- never expose arbitrary shell execution to React;
- treat terminal output as untrusted data;
- avoid token/secret storage unless a secure storage design exists;
- redact diagnostics;
- make plugin/skill permissions explicit.

_Sources:_ [Tauri Capabilities](https://v2.tauri.app/security/capabilities/), [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/stable-en/).

### Strategic Technical Recommendations

**Architecture Recommendation:** Tauri 2 + Rust modular monolith with React WebViews and ports/adapters.

**Technology Selection:** React 19.2, TypeScript, Vite 8, Tailwind 4, xterm.js, Rust/Tauri, portable-pty, SQLite-first storage evaluation, Vitest/Playwright/Rust tests.

**Implementation Strategy:** contract-first, migration-first, terminal-first vertical slices.

**CA Decision Questions:**

- Does Tauri channel streaming meet terminal flood requirements on all target platforms?
- Does SQLite outperform redb in queryability/migration enough to justify migration work?
- Which typed IPC approach is stable enough: `tauri-specta`, `specta`, `rspc`, custom generator or manual contracts?
- How should terminal sessions be represented as runtime resources?
- What is the minimum MVP updater/release strategy?

### Implementation Roadmap and Risk Assessment

**Implementation Phases:**

1. CA architecture and ADRs.
2. terminal/IPC/storage spikes.
3. contract and storage manifest foundation.
4. MVP feature slices.
5. migration and parity verification.
6. platform release.

**Top Risks:**

- terminal stream overload;
- database migration loss;
- cross-platform WebView/PTY differences;
- immature typed IPC tooling;
- old feature parity gaps;
- security leakage through diagnostics or plugins.

**Mitigation:** vertical spikes, fixture-based migration tests, three-platform smoke, explicit parity checklist, security capabilities per window.

### Future Technical Outlook and Innovation Opportunities

Near-term innovation should stay in local orchestration:

- cross-CLI status model;
- terminal semantic extraction;
- local workflow templates;
- typed plugin/skill contracts;
- diagnostic bundles for AI-assisted bug reports.

Medium-term innovation can add:

- remote/mobile monitoring;
- standardized agent protocol;
- team-shared templates;
- local/remote hybrid execution.

Long-term innovation can pursue CEO Agent and dynamic agent network, but only after MVP terminal/chat/dispatch reliability is proven.

### Technical Research Methodology and Source Verification

**Primary Source Types Used:**

- Official product/framework documentation.
- Official package registries via `npm view` and `cargo search`.
- Project docs from `docs/` and `/Users/wdx/opc/golutra`.
- Security and architecture guidance from official/primary sources.

**Representative Search Queries:**

- Tauri 2 desktop WebView Rust architecture
- React 19.2 official documentation compiler performance
- Vite 8 Rolldown React official
- Tailwind CSS v4 official docs
- xterm.js official terminal emulator
- redb Rust database docs
- portable-pty Rust docs
- SQLite application file format WAL
- Tauri IPC channels capabilities updater
- Microsoft Strangler Fig pattern
- OWASP secure coding practices

**Confidence Levels:**

- High: Tauri + Rust + React + Vite + Tailwind + xterm overall direction.
- High: typed contracts, channel/event separation, window capability boundaries.
- Medium-high: SQLite-first storage direction.
- Medium: exact typed IPC generation library.
- Medium: final updater timing and signing strategy.

### Technical Appendices and Reference Materials

**Core References:**

- [Tauri Start](https://v2.tauri.app/start/)
- [Tauri Architecture](https://v2.tauri.app/concept/architecture/)
- [Tauri Process Model](https://v2.tauri.app/concept/process-model/)
- [Tauri IPC](https://v2.tauri.app/concept/inter-process-communication/)
- [Tauri Capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri Updater](https://v2.tauri.app/plugin/updater/)
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2)
- [React Compiler](https://react.dev/learn/react-compiler)
- [Vite 8](https://vite.dev/blog/announcing-vite8)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
- [xterm.js](https://xtermjs.org/)
- [portable-pty](https://docs.rs/portable-pty/latest/portable_pty/)
- [redb](https://docs.rs/redb/latest/redb/)
- [SQLite App File Format](https://www.sqlite.org/appfileformat.html)
- [SQLite WAL](https://www.sqlite.org/wal.html)
- [Vitest](https://vitest.dev/guide/)
- [Playwright](https://playwright.dev/docs/intro)
- [Microsoft Cloud Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/stable-en/)

## Technical Research Conclusion

### Summary of Key Technical Findings

`orchlet` should be architected as a local-first, modular desktop system. React should replace Vue at the UI layer, but the core product value depends on Rust/local backend quality: terminal process control, stream backpressure, IPC contracts, storage migration, diagnostics and platform integration.

The best default stack for CA evaluation is Tauri 2 + Rust + React 19.2 + TypeScript + Vite 8 + Tailwind 4 + xterm.js 6 + SQLite-first local persistence + Vitest/Playwright/Rust tests. This is the strongest fit for “跨平台、性能优先、本地优先、同功能不遗漏、后续可扩展” among researched options.

### Strategic Technical Impact Assessment

This stack keeps runtime local, reduces package size compared with Chromium-bundled runtimes, preserves React productivity, gives Rust ownership of system-heavy concerns, and supports a safer permission model through capabilities. The main uncertainty is not stack viability; it is choosing and enforcing the right internal contracts, database migration path and terminal stream architecture.

### Next Steps Technical Recommendations

1. Run `[CA] bmad-create-architecture` using this research report and the PRD as inputs.
2. In CA, create ADRs for desktop runtime, storage, typed IPC, terminal engine and updater.
3. Build three spikes before broad implementation: terminal stream, database migration, typed IPC.
4. Convert PRD FR/NFR into contract tests, migration fixtures and platform smoke.
5. Start implementation only after CA answers the decision questions above.

**Technical Research Completion Date:** 2026-05-11
**Research Period:** current comprehensive technical analysis
**Source Verification:** All key technical facts cited with current sources or registry checks
**Technical Confidence Level:** High for stack direction; medium for storage and typed IPC final choices pending CA prototypes

## Post-Research Constraint Update

**Date:** 2026-05-11

The product constraint changed after this research report was completed: `orchlet` does **not** need to read, migrate, import, or remain compatible with old `golutra` data, old redb chat databases, old app data, or old `.golutra` workspace metadata.

This updates the storage recommendation:

- SQLite/rusqlite remains the preferred durable structured storage for the new architecture.
- JSON remains appropriate for simple workspace-local metadata.
- redb should not be part of the MVP target architecture.
- redb is only relevant if a future explicit product requirement adds "import old golutra data" as a separate feature.

The rest of the technology stack recommendation is unchanged: Tauri 2 + Rust + React 19.2 + TypeScript + Vite 8 + Tailwind CSS v4 + xterm.js 6 remains the best default architecture direction for the stated cross-platform, performance-first, local-first React desktop app.

### Technology Adoption Trends

The stack trend favors Rust-native local infrastructure plus web-based UI for productivity tools:

- Tauri provides a smaller, security-conscious desktop shell using system webviews while allowing React frontend and Rust backend integration.
- Vite 8 moves the React build chain toward Rust-based bundling with Rolldown.
- Tailwind 4 moves styling toward CSS-first configuration and a faster engine.
- React 19.2 adds performance tooling and UI state capabilities that help multi-pane desktop UIs.
- xterm.js remains broadly adopted in serious terminal products.
- SQLite remains the safest default for long-lived application files and migration tooling, while redb remains attractive for pure Rust embedded key-value workloads.

**Preliminary stack recommendation for architecture research:**

1. **Desktop/runtime:** Tauri 2 + Rust, with Electron kept as fallback only if WebView/runtime consistency becomes a blocker.
2. **Frontend:** React 19.2 + TypeScript + Vite 8 + Tailwind CSS v4.
3. **Terminal:** xterm.js + Rust PTY backend using portable-pty or a validated alternative.
4. **Storage:** SQLite/rusqlite as leading candidate for structured durable data; JSON/TOML for simple workspace metadata; redb only where key-value performance or migration compatibility wins.
5. **IPC:** Tauri invoke/channel/resources behind a typed API facade; evaluate `tauri-specta`, `specta`, and `rspc` but do not depend on RC tooling without a fallback generator/manual contract path.
6. **Testing:** Vitest + Playwright + Rust tests + cross-platform smoke.
7. **Release:** signed Tauri artifacts, updater optional after migration safety is proven.

_Migration Pattern:_ Vue/Pinia stores should not be ported directly; migrate capabilities into React view models, use cases, repositories, and typed IPC contracts.
_Legacy Technology:_ Vue is explicitly excluded by product direction; redb/bincode should be revisited because SQL migration tooling may better serve the new architecture.
_Community Trend:_ AI coding products are increasingly terminal/agent-oriented; this supports investment in terminal reliability and multi-agent orchestration rather than decorative UI.
_Confidence:_ High for the stack direction; medium for database and typed IPC tooling pending CA benchmarks/prototypes.

## Integration Patterns Analysis

### API Design Patterns

`orchlet` is a local desktop system, not a public web API product. Its primary API surface is internal IPC between React WebView windows and the local backend. Tauri’s IPC model is a strong fit: official docs describe asynchronous message passing with two primitives, Events and Commands; `invoke` behaves similarly to a request/response call and uses JSON-serializable payloads. Source: [Tauri IPC](https://v2.tauri.app/concept/inter-process-communication/).

**Recommendation:** use a typed command facade, not raw `invoke` from feature code.

- **Commands:** request/response operations such as `workspace_open`, `chat_send_message`, `terminal_create`, `project_skills_link`.
- **Channels:** streaming and chunked flows such as terminal output, migration progress, diagnostics export progress, and long-running scans. Tauri docs identify channels as the recommended mechanism for streaming data to the frontend. Source: [Tauri calling Rust / Channels](https://v2.tauri.app/es/develop/calling-rust/).
- **Events:** lifecycle and state notifications such as `terminal-exit`, `terminal-status-change`, `chat-message-created`, `notification-preview-updated`, window-ready events.
- **Resources:** long-lived backend-owned handles for terminal sessions, migration jobs, diagnostics runs, and file exports if CA confirms Tauri resource use is stable enough.

_RESTful APIs:_ Not relevant for MVP runtime.
_GraphQL APIs:_ Not recommended for local app IPC; too much query-layer overhead for the core desktop path.
_RPC and gRPC:_ The internal IPC resembles RPC; use typed commands rather than network RPC.
_Webhook Patterns:_ Not relevant until plugin/remote ecosystem exists.
_Confidence:_ High.

### Communication Protocols

Communication should be explicitly separated by semantics:

- **Command protocol:** typed request/response DTOs for deterministic operations.
- **Streaming protocol:** channel-based byte/text/event chunks for terminal output and long-running jobs.
- **Event protocol:** fire-and-forget state changes with topic, direction, payload, ordering, and replay behavior documented.
- **Storage protocol:** repositories expose domain operations; frontend never writes arbitrary app/workspace files directly.
- **CLI process protocol:** backend owns PTY and process state; frontend receives rendered stream/snapshot and sends input/resize commands.

Tauri’s docs identify events as one-way messages for lifecycle/state changes and commands as JSON-RPC-like request/response IPC. This maps directly to `orchlet`’s needs: terminal-output should be streaming/channel-like, terminal status and unread changes event-like, and operations command-like. Source: [Tauri IPC](https://v2.tauri.app/concept/inter-process-communication/).

_HTTP/HTTPS Protocols:_ Use only for future updates, templates, remote plugin metadata, or explicit remote services.
_WebSocket Protocols:_ Not needed for local MVP; may be relevant for future mobile remote control or remote agent monitoring.
_Message Queue Protocols:_ Use in-process durable outbox rather than AMQP/Kafka.
_gRPC/Protobuf:_ Not needed unless future external agent protocol requires it.
_Confidence:_ High.

### Data Formats and Standards

**Internal DTOs:** Use JSON-serializable DTOs for Tauri commands because command invocation payloads and return values must be serializable. Define them in a `contracts` layer and generate or validate TypeScript bindings.

**Terminal streams:** Use ordered stream envelopes, not raw unstructured text alone:

```text
{ sessionId, seq, chunk, encoding, timestamp, kind }
```

This supports ACK, snapshot consistency, replay, and diagnostics. Raw terminal bytes may still exist at the backend boundary; UI-facing payloads need sequencing and metadata.

**Storage formats:**

- SQLite for structured durable data should use explicit schema migrations.
- JSON/TOML workspace metadata should carry `schemaVersion`.
- Diagnostic exports should use NDJSON or structured JSON bundles so large logs can stream and redact.
- Migration reports should be machine-readable and human-readable.

SQLite WAL is relevant if SQLite is selected. Official SQLite docs state WAL allows readers and writers to proceed concurrently in ways rollback journals do not; this is useful for chat reads while appending messages or diagnostics, but backup/checkpoint behavior must be handled correctly. Source: [SQLite WAL](https://www.sqlite.org/wal.html).

_JSON and XML:_ JSON for IPC and metadata; XML not needed.
_Protobuf/MessagePack:_ Optional for future external protocols; not needed for MVP.
_CSV/Flat Files:_ Useful for export/import only.
_Custom Formats:_ Avoid custom binary formats unless required for terminal snapshots; prefer structured, versioned formats.
_Confidence:_ High for JSON/SQLite; medium for final database choice.

### System Interoperability Approaches

The system should use a modular local architecture rather than microservices:

- **Frontend boundary:** React pages/features call typed frontend API clients.
- **IPC gateway:** converts typed frontend payloads into app use cases.
- **Application/use-case layer:** owns orchestration flows such as send-and-dispatch.
- **Domain services:** workspace, chat, terminal, notification, skill, settings, diagnostics.
- **Infrastructure adapters:** Tauri, PTY, filesystem, database, tray, notifications, updater.

This avoids over-engineering while preserving boundaries needed for testability. The key interoperability pattern is adapter-driven integration with external CLIs, not service mesh or network APIs.

_Point-to-Point Integration:_ Avoid feature-to-command point-to-point sprawl; centralize API clients and command registry.
_API Gateway Pattern:_ Use a local IPC gateway inside the app, not a network API gateway.
_Service Mesh/ESB:_ Not relevant.
_Confidence:_ High.

### Microservices Integration Patterns

Microservices are not recommended for MVP. The useful patterns are local equivalents:

- **Gateway pattern:** Tauri command gateway.
- **Service discovery:** not network service discovery; terminal environment discovery and CLI path resolution.
- **Circuit breaker:** apply as failure state handling for CLI startup, terminal dispatch, migration jobs, and update checks.
- **Saga pattern:** useful conceptually for multi-step workflows like message creation + outbox enqueue + terminal dispatch + status update. Implement as a durable local outbox, not distributed transactions.

For `chat_send_message_and_dispatch`, use a local transaction/outbox pattern:

1. Persist message.
2. Persist outbox task with target resolution metadata.
3. Worker dispatches to terminal session.
4. Status updates emit events.
5. Failure remains retryable and inspectable.

_Confidence:_ High.

### Event-Driven Integration

The architecture should use event-driven integration inside a bounded local process, with strict topic definitions:

- **Domain events:** message created, message status changed, unread changed, terminal status changed, terminal exited, workspace changed.
- **UI events:** terminal window ready, terminal tab opened, notification opened, theme changed, locale changed.
- **Diagnostic events:** snapshot triplet, chat consistency, migration step, frontend batch log.

Events should include:

- topic name
- direction
- payload schema
- ordering expectation
- replayability
- idempotency rule
- owning domain

Avoid using events for operations that require request/response acknowledgement. Use commands or outbox tasks for those.

_Publish-Subscribe Patterns:_ Good for state/lifecycle updates.
_Event Sourcing:_ Not recommended as whole-system persistence; too heavy. Use append-only diagnostics where useful.
_Message Broker Patterns:_ Use in-process event bus and durable local outbox, not Kafka/RabbitMQ.
_CQRS Patterns:_ Useful locally: command use cases mutate data; query repositories serve lists/history; no full CQRS framework needed.
_Confidence:_ High.

### Integration Security Patterns

Tauri capabilities should be treated as product architecture, not configuration trivia. Official docs state capabilities constrain what windows/webviews can access and define permissions per window/webview. `orchlet` has multiple windows with different authority levels, so capabilities should be split by window mode. Source: [Tauri capabilities](https://v2.tauri.app/es/security/capabilities/).

Recommended capability model:

- **Main window:** workspace/chat/settings capabilities.
- **Terminal window:** terminal attach/write/resize/search capabilities, limited workspace context.
- **Workspace selection window:** directory selection and recent workspace read.
- **Notification preview window:** read notification state and open target actions only.

Security integration requirements:

- Do not expose arbitrary shell execution to frontend.
- CLI commands must be configured, validated, and launched by backend adapters.
- Terminal output is untrusted text.
- Plugin/skill integrations need explicit permission grants before they can trigger terminal/file operations.
- Diagnostic exports need redaction and user confirmation.

_OAuth/JWT:_ Not relevant for local MVP unless future remote account features appear.
_API Key Management:_ Relevant only to external AI CLIs/providers, which should remain user-managed or explicitly configured.
_Mutual TLS:_ Not relevant for MVP.
_Data Encryption:_ Consider OS keychain/Stronghold for future secrets; do not store provider tokens casually in JSON.
_Confidence:_ High for capability boundaries; medium for secrets storage until CA defines whether `orchlet` stores secrets at all.

## Architectural Patterns and Design

### System Architecture Patterns

**Recommended pattern:** modular monolith desktop architecture with ports/adapters boundaries.

`orchlet` should not be built as network microservices. Its complexity is local orchestration: windows, terminal sessions, chat persistence, notifications, migration, skills, settings, and diagnostics. A modular monolith gives strong local performance, simple deployment, fewer failure modes, and clear domain boundaries.

Tauri’s process model supports this direction. Official docs describe a multi-process architecture where the Core process has OS access, creates/orchestrates windows, system tray menus, and notifications, routes IPC centrally, and can manage global state such as settings or database connections. WebView processes render UI and should keep business-sensitive logic out of the frontend. Source: [Tauri Process Model](https://v2.tauri.app/concept/process-model/).

Recommended top-level architecture:

```text
React WebView(s)
  -> typed frontend API client
  -> Tauri IPC gateway
  -> application use cases
  -> domain services
  -> infrastructure adapters
  -> OS / PTY / DB / filesystem / tray / updater / external CLI
```

Core modules:

- `workspace`
- `project_members`
- `chat`
- `terminal`
- `orchestration`
- `notification`
- `settings`
- `skills`
- `diagnostics`
- `migration`
- `release/update`

_Source:_ [Tauri Architecture](https://v2.tauri.app/concept/architecture/).
_Confidence:_ High.

### Design Principles and Best Practices

Use Clean/Hexagonal ideas pragmatically, not ceremonially. Ports are useful where technology or process boundaries exist: database, PTY, filesystem, Tauri windows/tray/notifications, updater, external CLI, diagnostics sink. Do not create a port for every plain function.

Architecture principles:

- UI state is not domain state.
- IPC gateway does not contain business logic.
- Use cases coordinate domain services and repositories.
- Domain services do not depend on Tauri.
- Infrastructure adapters own Tauri, PTY, filesystem, SQLite/redb, OS dialogs, tray, updater and external binaries.
- Every command/event/storage schema has an owner and tests.
- Long-running work is cancelable, observable, and recoverable.

Microsoft’s architecture pattern catalog is useful as a pattern vocabulary, but most cloud patterns should be adapted locally. Relevant patterns for `orchlet`: Anti-Corruption Layer for old data/legacy behavior, Asynchronous Request-Reply for long jobs, Bulkhead for isolating terminal sessions/jobs, Circuit Breaker/Retry for CLI startup and update checks, CQRS for command/query separation, Event Sourcing only for diagnostics, Publisher-Subscriber for UI state events, Queue-Based Load Leveling for dispatch/outbox, Sidecar only for external binaries, Strangler Fig for incremental migration from old code. Source: [Azure Cloud Design Patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/).

_Confidence:_ High.

### Scalability and Performance Patterns

For a local desktop app, scalability means number of workspaces, conversations, messages, terminal sessions, output volume, migration size, and UI windows; not horizontal server scaling.

Recommended patterns:

- **Bulkhead:** isolate terminal sessions and long-running jobs so one noisy CLI does not freeze UI or block other sessions.
- **Backpressure:** terminal output, chat stream, diagnostics and migration progress must be throttled/batched.
- **Durable outbox:** message dispatch should persist before terminal write, enabling retry and visible failure.
- **CQRS-lite:** command paths mutate through use cases; query paths use optimized repositories/views for conversations, messages, status and notifications.
- **Snapshot + replay boundary:** terminal attach uses snapshot plus incremental seq rather than relying only on live stream.
- **Incremental migration:** dry-run, batch, report, then apply.

AWS Well-Architected remains relevant as an evaluation checklist even though this is not cloud-hosted. Its six pillars include operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability; for `orchlet`, reliability, security, performance efficiency and operational excellence map directly to NFRs. Source: [AWS Well-Architected pillars](https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html).

_Confidence:_ High.

### Integration and Communication Patterns

The integration model should map communication semantics to specific mechanisms:

- **Commands:** request/response, user-triggered actions, idempotent where possible.
- **Channels:** terminal stream, migration progress, diagnostics export, long-running job progress.
- **Events:** domain/state/lifecycle notifications.
- **Outbox:** chat-to-terminal dispatch and retry.
- **Adapter contracts:** external CLI configuration, launch, status, and post-ready behavior.

Use event topics sparingly and document them. For each event define direction, payload type, ordering, replayability, idempotency, and owning module. Avoid using global events as an unstructured state bus.

_Source:_ [Tauri IPC](https://v2.tauri.app/concept/inter-process-communication/).
_Confidence:_ High.

### Security Architecture Patterns

Security architecture should follow least privilege per window and per adapter. Tauri’s capability model supports permissions by window/webview; this is essential because notification preview, terminal window, workspace selection and main window need different authority. Source: [Tauri capabilities](https://v2.tauri.app/security/capabilities/).

OWASP secure coding guidance is applicable because `orchlet` processes untrusted terminal text, paths, plugin files, environment variables and future remote metadata. Relevant categories include input validation, output encoding, access control, error handling/logging, data protection, file management, and general coding practices. Source: [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/stable-en/).

Security decisions:

- Treat AI CLI output as untrusted display/input data.
- Never let frontend issue arbitrary shell commands.
- Keep secrets out of frontend and unencrypted JSON.
- Redact diagnostics.
- Restrict filesystem access to selected workspace/app data paths.
- Split capabilities by window mode.
- Require explicit user action for destructive operations and plugin actions.

_Confidence:_ High.

### Data Architecture Patterns

Use a storage manifest as an architectural artifact:

```text
name
owner module
path
format
schema version
readers/writers
migration strategy
backup strategy
privacy classification
test fixtures
```

Proposed storage ownership:

- `workspace`: `.golutra/workspace.json`, `.golutra/local.json`
- `settings`: global settings JSON or table
- `chat`: SQLite/redb database, message/conversation/member/outbox tables
- `terminal`: runtime session state in memory; durable mapping/snapshots only where needed
- `skills`: app skill library + workspace links
- `diagnostics`: structured logs/reports
- `migration`: dry-run/apply reports

CA should evaluate SQLite-first data architecture. SQLite’s application-file documentation supports it as a durable, portable application file format, and WAL can improve read/write concurrency. Sources: [SQLite app file format](https://www.sqlite.org/appfileformat.html), [SQLite WAL](https://www.sqlite.org/wal.html).

_Confidence:_ High for storage manifest; medium for final DB.

### Deployment and Operations Architecture

MVP operations are local release operations:

- deterministic builds
- signed artifacts
- migration-aware release notes
- smoke test matrix
- issue/diagnostics export workflow
- updater only after migration safety is proven

Tauri docs list desktop distribution targets and signing/distribution guides, and the updater plugin requires signed updates. This supports a release process where update and migration are treated together rather than as a late add-on. Sources: [Tauri distribute docs](https://v2.tauri.app/distribute/), [Tauri updater](https://v2.tauri.app/plugin/updater/).

Recommended operations architecture:

- CI builds Windows/macOS/Linux.
- CI runs frontend tests, Rust tests, contract tests, migration fixture tests and smoke.
- Release candidate uses dry-run migration against sample old data.
- Published builds include release notes grouped by feature, migration, security, breaking changes and known issues.

_Confidence:_ High.

## Final Architecture Constraint Override

This final note supersedes any earlier research text about redb compatibility, old `.golutra` metadata, old app data, old chat databases, old-data migration, migration fixtures, or parity-first migration:

- No old `golutra` data compatibility is required for MVP.
- No old `.golutra` workspace metadata is required for MVP.
- No redb/bincode compatibility path is required for MVP.
- No migration fixture work for old data is required for MVP.

Downstream planning should use the completed architecture document as the source of truth:

- New workspace metadata: `.orchlet`
- Structured persistence: SQLite/rusqlite
- Simple metadata: JSON
- Data work: schema versioning, storage manifest, schema validation, data integrity reports
- Out of scope unless explicitly reintroduced later: redb, old data import, old app data migration
