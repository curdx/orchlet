# Story 8.4: 功能状态标记

Status: done

<!-- Note: Created after Story 8.3 completion. This story owns capability status taxonomy, labels and traceable MVP capability status data only; Story 8.5 owns release readiness checklist and three-platform smoke evidence. -->

## Story

As a product owner,
I want implemented, alternative, placeholder and abandoned capabilities to be explicit,
so that MVP scope is not ambiguous for users, maintainers or implementation agents.

## Acceptance Criteria

1. Given a feature is shown in the UI or docs, when it is implemented, replaced by an alternative, only a placeholder or explicitly abandoned, then its state is labeled consistently for users and maintainers.
2. Given a placeholder capability is visible, when the user attempts to activate it, then the app shows a clear unavailable or future-capability state instead of silently failing or pretending it is complete.
3. Given capability status is reviewed before release, when status labels are generated, then every MVP capability is marked implemented, alternative, placeholder or abandoned with a traceable reason.

## Tasks / Subtasks

- [x] Task 1: Define a capability status taxonomy and registry source of truth (AC: 1, 3)
  - [x] Add a small typed status model for `implemented`, `alternative`, `placeholder` and `abandoned` with required reason/evidence fields.
  - [x] Create an MVP capability status registry covering the domains in `docs/rebuild/parity-checklist.md`: workspace, chat, members/contacts, terminal, notifications, settings, skills/plugins, data/schema/diagnostics and platform/release scaffolding.
  - [x] Include traceable references for each item, such as story id, FR/NFR, test/fixture/script path or explicit product decision.
  - [x] Mark `.golutra`-specific legacy paths as `alternative` when the implemented MVP uses `.orchlet`, not as plain implemented.
  - [x] Keep release readiness, smoke run results and release notes out of this registry; Story 8.5 consumes statuses later.

- [x] Task 2: Validate capability status honesty automatically (AC: 3)
  - [x] Add a validation script or test that rejects missing/unknown statuses, empty reasons, missing evidence and duplicate capability ids.
  - [x] Ensure placeholder and abandoned items require user-facing wording or a product decision reason.
  - [x] Wire the validator into an existing test script only if it does not overload Story 8.5 release checks; otherwise add a focused `pnpm` script and run it in story validation.
  - [x] Do not infer implementation status from memory alone; every implemented/alternative item must cite an artifact that exists in the repo.

- [x] Task 3: Surface status labels for visible capabilities and placeholders (AC: 1-2)
  - [x] Add reusable UI helpers or local data mapping so visible statuses use consistent labels and tone.
  - [x] Apply labels to currently visible placeholder/future capabilities, especially Skill Store and remote plugin placeholders from Story 6.3.
  - [x] Apply labels or explicit unavailable copy to visible fallback/unavailable capability states, such as notification permission adapter unavailable and shortcut unavailable bindings.
  - [x] Ensure attempted activation of placeholder/future capability shows a recoverable toast or disabled explanatory state, never a silent no-op.
  - [x] Keep UI compact and work-focused inside the existing `WorkspaceSelectionPage` shell; do not add a marketing page or a large release dashboard.

- [x] Task 4: Preserve scope boundaries and existing behavior (AC: 1-3)
  - [x] Do not implement missing product features just to make the checklist pass; use `placeholder`, `alternative` or `abandoned` with a reason.
  - [x] Do not implement release checklist execution, three-platform smoke evidence, packaging automation or release notes; those belong to Story 8.5.
  - [x] Do not add backend persistence or IPC unless needed for the chosen UI; static local status data plus validation is acceptable for this story.
  - [x] Do not change diagnostics export/redaction behavior except to label its capability status.

- [x] Task 5: Add focused tests and completion evidence (AC: 1-3)
  - [x] Add unit tests for status label/taxonomy helpers and capability registry validation.
  - [x] Add frontend tests that visible placeholder/future capabilities are labeled and attempted activation surfaces an unavailable/future-capability state.
  - [x] Add fixture/script coverage proving every MVP capability entry has status, reason and evidence.
  - [x] Run `pnpm test:contracts`, `pnpm test:data-integrity`, focused capability/frontend tests, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build` and the IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.

## Dev Notes

### Scope Boundary

Story 8.4 is a governance and UX clarity story. It makes capability state explicit in data, docs-facing artifacts and visible UI labels. It does not implement the missing capabilities themselves, does not run release readiness gates and does not record platform smoke results. If a capability is incomplete, the correct output is an honest `placeholder`, `alternative` or `abandoned` status with evidence.

### Product Policy

- Capability states must be understandable to users and maintainers:
  - `implemented`: shipped in the new MVP architecture with evidence.
  - `alternative`: old/reference behavior is intentionally replaced by a new MVP equivalent, with the replacement named.
  - `placeholder`: visible or documented future capability that is not active in MVP.
  - `abandoned`: explicitly dropped from MVP or product scope with a product reason.
- Placeholder activation must never silently fail. Disabled controls, unavailable toasts, future-capability labels or equivalent recoverable states are acceptable.
- The status registry must not claim smoke coverage, release readiness or platform validation results. Story 8.5 will use the registry as input.

### Current Implementation State

- `docs/rebuild/parity-checklist.md` exists but still uses coarse `未开始/进行中/通过/放弃` wording and old `.golutra` references. Use it as source coverage, not as a claim that all entries are current.
- Story 6.3 already distinguishes local skills, Skill Store placeholder and future remote plugin placeholder in `WorkspaceSelectionPage`; reuse that pattern instead of inventing a new large surface.
- Current visible unavailable/fallback states include notification permission adapter unavailable, shortcut binding unavailable reasons and skill/plugin placeholders.
- Story 8.1-8.3 added diagnostics run/event, consistency diagnostics and redacted overview/export. For 8.4, only label these statuses; do not change their behavior.
- Existing tests are concentrated in `src/App.test.tsx`, shared API tests, contract fixture tests and script validators.

### Architecture Compliance

- Prefer a static, typed frontend/domain registry plus script validation. Backend persistence and IPC are unnecessary unless implementation discovers a real existing backend consumer.
- If new frontend code is added, keep it in existing local patterns: `src/shared/*`, `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx` and focused tests.
- If new fixtures are added, place them under a clear folder such as `fixtures/capabilities/` and validate them with `scripts/*`.
- Keep raw Tauri calls in `src/shared/api/*`; this story should not need new raw Tauri calls.
- Do not add npm or Rust dependencies unless a HALT condition is reached and the user approves.

### Previous Story Intelligence

- Story 8.3 review fixed three privacy/batching issues. Preserve the discipline: visible/status artifacts must not imply unsupported diagnostics export, telemetry, cloud upload or release smoke evidence.
- Story 6.3 established a useful UI pattern for local/store/plugin capability classification. Extend or normalize it rather than duplicating a separate visual language.
- Story 1.6/1.7 and later fixture work repeatedly enforced fixture honesty: manifests and validators must only claim implemented behavior.
- Story 7.8 reinforced that destructive/maintenance actions require explicit labels, disabled states and recoverable user feedback.

### Relevant Files To Read Before Coding

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/8-3-view-export-redacted-diagnostics.md`
- `_bmad-output/implementation-artifacts/6-3-delete-open-capability-classification.md`
- `docs/rebuild/parity-checklist.md`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/App.test.tsx`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `package.json`

### Testing Requirements

- Registry validation must fail on unknown status, missing reason, missing evidence, duplicate capability id and placeholder/abandoned entries without user-facing explanation.
- UI tests must prove visible placeholder/future controls are labeled and do not silently no-op when activated or inspected.
- Tests must not require platform smoke artifacts or packaged app builds; that belongs to Story 8.5.
- Full validation should include existing contract/data integrity checks to ensure no fixture honesty regressions.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 8.4 acceptance criteria and Epic 8 boundary.
- `_bmad-output/planning-artifacts/prd.md` - FR79, NFR23, NFR35 and NFR43 capability governance expectations.
- `_bmad-output/planning-artifacts/architecture.md` - capability governance, local-first privacy and release checklist separation.
- `docs/rebuild/parity-checklist.md` - coverage seed for MVP capability domains and old-version parity notes.
- `_bmad-output/implementation-artifacts/6-3-delete-open-capability-classification.md` - existing skill placeholder capability label pattern.
- `_bmad-output/implementation-artifacts/8-3-view-export-redacted-diagnostics.md` - diagnostics capability state and Story 8.5 boundary note.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Created Story 8.4 context from Epic 8, PRD, architecture, parity checklist, Story 6.3 and completed Story 8.3 review notes. Status set to ready-for-dev.
- 2026-05-13: Started dev-story implementation. Status set to in-progress.
- 2026-05-13: Added typed capability status helpers, 84-entry MVP capability registry and validator guard checks.
- 2026-05-13: Updated Skill Store/remote plugin placeholders with consistent `占位` labels and recoverable unavailable toasts; labeled notification permission and shortcut unavailable states.
- 2026-05-13: Validation passed: `pnpm vitest run src/shared/capabilities/status.test.ts src/App.test.tsx`, `pnpm test:capabilities`, `pnpm test:contracts`, `pnpm test:data-integrity`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build`, IPC boundary scan.
- 2026-05-13: Code review strengthened parity checklist coverage validation and generalized unavailable capability toast action copy.
- 2026-05-13: Post-review validation passed: `pnpm vitest run src/shared/capabilities/status.test.ts src/App.test.tsx`, `pnpm test:capabilities`, `pnpm test`, `pnpm build` and IPC boundary scan.

### Completion Notes List

- Added `CapabilityStatus` taxonomy and typed evidence/registry entry shapes for `implemented`, `alternative`, `placeholder` and `abandoned`.
- Added `fixtures/capabilities/mvp-capability-status.json` with traceable statuses for workspace, chat, members, terminal, notifications, settings, skills/plugins, data/schema/diagnostics and platform scaffolding domains.
- Added `scripts/validate-capability-status.mjs` and `pnpm test:capabilities` to reject duplicate ids, unknown statuses, empty reasons, missing evidence, missing placeholder/abandoned wording and `.golutra` entries marked as plain implemented.
- Normalized visible Skill Store and remote plugin placeholders to shared status labels and toasts; existing notification permission and shortcut unavailable states now show the same placeholder label language.
- Kept release readiness, real smoke run results, release notes, backend persistence, IPC changes and diagnostics behavior changes out of Story 8.4.
- Code review follow-up now parses `docs/rebuild/parity-checklist.md` table rows and rejects registry coverage gaps, and unavailable capability toasts use the shared status label instead of hard-coded placeholder copy.

### File List

- `_bmad-output/implementation-artifacts/8-4-capability-status-labeling.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/capabilities/mvp-capability-status.json`
- `package.json`
- `scripts/validate-capability-status.mjs`
- `src/App.test.tsx`
- `src/pages/workspace-selection/ui/WorkspaceSelectionPage.tsx`
- `src/shared/capabilities/status.ts`
- `src/shared/capabilities/status.test.ts`

## Change Log

- 2026-05-13: Created Story 8.4 context for capability status labeling and traceable MVP status governance.
- 2026-05-13: Started implementation of capability status labeling.
- 2026-05-13: Implemented capability status taxonomy, registry validation, visible placeholder labels and completion validation; story marked ready for review.
- 2026-05-13: Completed code review fixes for parity checklist coverage and generic unavailable copy; story moved to done.

## Senior Developer Review (AI)

Review Date: 2026-05-13

Outcome: Approve

Findings: 2 patch findings fixed.

Review Notes:

- Fixed capability registry validation so it parses `docs/rebuild/parity-checklist.md` and rejects any missing checklist row, rather than only checking required domains.
- Fixed unavailable capability toast copy so it uses `capabilityStatusMeta(status).label`, avoiding hard-coded placeholder language if the helper is reused for another status.
- Confirmed the registry keeps release readiness, real smoke run results and release notes out of Story 8.4; platform rows only cite the existing smoke scaffold and remain `placeholder` where real platform evidence belongs to Story 8.5.
- Confirmed UI changes stay inside the existing workspace shell, use typed shared status labels, and do not add backend persistence, IPC or diagnostics behavior changes.
- Validation after review passed: `pnpm vitest run src/shared/capabilities/status.test.ts src/App.test.tsx`, `pnpm test:capabilities`, `pnpm test`, `pnpm build`, and the IPC boundary scan.
