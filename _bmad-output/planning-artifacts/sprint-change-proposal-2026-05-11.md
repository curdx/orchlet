---
workflowType: 'correct-course'
project_name: 'orchlet'
user_name: '王定旭'
date: '2026-05-11'
status: 'implemented'
changeScope: 'moderate'
approval: 'User instructed autonomous execution before implementation readiness rerun'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/implementation-readiness-report-2026-05-11.md
---

# Sprint Change Proposal - orchlet

## 1. Issue Summary

Implementation readiness found no architecture blocker, but the epics and UX handoff had story hygiene and scope-boundary issues that could create avoidable first-sprint risk.

Triggering evidence came from `_bmad-output/planning-artifacts/implementation-readiness-report-2026-05-11.md`:

- early CI/test/contract/schema/terminal smoke scaffolding was not represented as an implementable Story 1.x;
- Story 1.6 risked front-loading all future storage/schema categories;
- Story 8.4 combined feature status labels, release checklist and three-platform smoke recording;
- Story 7.7 combined chat stream display preference with risky data repair/clear operations;
- FR17 was covered at epic level but Story 2.2 did not list it in `Requirements`;
- Admin/account/team/store/plugin UX controls needed clearer MVP placeholder boundaries;
- lucide icon dependency was required by UX but not explicit in Architecture/Epics.

## 2. Impact Analysis

### Epic Impact

- Epic 1 required one new foundation story and a narrower Story 1.6.
- Epic 2 required FR17 traceability on member action behavior.
- Epic 7 required Story 7.7 to be split.
- Epic 8 required Story 8.4 to be split.
- No new epic was required.
- No epic order change was required.

### Artifact Conflicts

- PRD: no product requirement change required after the earlier legal/contribution removal.
- Architecture: add explicit `lucide-react` icon dependency and icon-only button accessibility rule.
- UX: clarify Admin invite, account/team, skill store and plugin marketplace MVP boundaries.
- Epics: add/split/narrow stories and update story-level traceability.

### Technical Impact

No technology stack change. React, Tauri 2, Rust, SQLite/rusqlite, typed IPC, xterm and portable-pty remain the implementation baseline.

## 3. Recommended Approach

**Selected approach:** Direct Adjustment.

Rationale:

- The issue is planning hygiene, not product strategy or architecture failure.
- MVP remains achievable with the existing architecture.
- The highest-risk corrections are small document changes that improve implementation sequencing and reduce scope ambiguity.
- No rollback is relevant because implementation has not started.

**Effort:** Low to medium.  
**Risk after correction:** Low.  
**Scope classification:** Moderate backlog/story reorganization.

## 4. Detailed Change Proposals Implemented

### Epics / Stories

1. Added `Story 1.7: 建立测试、契约 fixture 与桌面 smoke 脚手架`.
   - Covers frontend tests, Rust tests, contract fixtures, schema/data fixtures, terminal stream fixtures and smoke-test entry points.
   - References NFR20, NFR35, NFR36, NFR37 and NFR43.

2. Narrowed `Story 1.6: Storage manifest、schema version 与 validation 报告`.
   - Old risk: upfront manifest/schema placeholders for all future domains.
   - New behavior: only implemented storage categories are created now; future persisted domains must add their own manifest entry, schema marker, fixture and validation check when introduced.

3. Updated `Story 2.2: 多实例邀请、权限与成员操作入口`.
   - Added FR17 to `Requirements` for member mention/remove action traceability.

4. Split `Story 7.7`.
   - `Story 7.7: 聊天终端输出展示偏好` now covers FR69 only.
   - `Story 7.8: 聊天数据修复与清空维护` now covers FR70 and FR71.

5. Split `Story 8.4`.
   - `Story 8.4: 功能状态标记` covers capability status labeling.
   - `Story 8.5: 发布验收清单与三平台 smoke 结果` covers release checklist, smoke result recording and release note categories.

6. Added `lucide-react` to epics Additional Requirements and Story 1.1 acceptance criteria.

### UX

1. Re-scoped Admin invite to local workspace role behavior.
   - Removed remote invite-link and server/billing permission semantics from MVP behavior.

2. Removed account/team controls from MVP settings navigation.
   - `更改邮箱`, `退出账号`, `新建团队`, `退出团队` are not shown in MVP.

3. Clarified Skill Store and Plugin Marketplace placeholders.
   - Remote sync/install/import behavior is disabled or placeholder in MVP.
   - Local skill folder import remains available where already required.

### Architecture

1. Added explicit `lucide-react` rule:
   - app icons use `lucide-react`;
   - icon-only controls must be implemented through shared UI primitives with `aria-label` and tooltip support.

## 5. Checklist Execution Summary

| Checklist Area | Status | Notes |
| --- | --- | --- |
| Trigger and context | Done | Trigger is implementation readiness `NEEDS WORK` story hygiene findings. |
| Epic impact | Done | Epics remain valid; changes are story-level and UX scope adjustments. |
| PRD impact | Done | No new PRD change required for this cleanup. |
| Architecture impact | Done | Only lucide/accessibility dependency clarification added. |
| UX impact | Done | Admin/account/team/store/plugin MVP boundaries clarified. |
| Path forward | Done | Direct Adjustment selected. |
| Sprint proposal | Done | This document records proposal and implemented changes. |
| User approval | Done | User requested autonomous execution and rerun. |
| Sprint status update | N/A | Sprint planning has not run yet, so no sprint-status.yaml exists to update. |

## 6. Implementation Handoff

Route to next workflow:

1. Re-run `[IR] bmad-check-implementation-readiness`.
2. If readiness becomes `READY`, proceed to `[SP] bmad-sprint-planning`.
3. If readiness still reports issues, correct only the remaining concrete findings before sprint planning.

Success criteria for this correction:

- Epics contain early CI/test/fixture/smoke scaffolding.
- Story 1.6 no longer requires all future domain schemas upfront.
- Story 7.7 and Story 8.4 are split into independently implementable stories.
- FR17 is traceable at story level.
- MVP UX no longer implies server/account/team/plugin marketplace work.
- Architecture and epics explicitly include lucide icon dependency and icon-button accessibility rules.
