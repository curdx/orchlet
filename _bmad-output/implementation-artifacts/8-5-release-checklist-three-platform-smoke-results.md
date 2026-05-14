# Story 8.5: 发布验收清单与三平台 smoke 结果

Status: done

<!-- Note: Created after Story 8.4 completion. This story consumes capability statuses and smoke scaffolding to record release readiness, smoke coverage and release-note categories; it must not redefine capability labels or fabricate platform pass evidence. -->

## Story

As a product owner,
I want release readiness and smoke results recorded separately from feature labels,
So that MVP release quality can be checked without overloading the capability-label story.

## Acceptance Criteria

1. Given release readiness is checked, when the MVP capability checklist runs, then it verifies workspace open, member invite, message-to-terminal dispatch, terminal output回写, notification jump and restart recovery.
2. Given desktop smoke tests are prepared, when release validation runs, then Windows, macOS and Linux smoke coverage is recorded with known issues and blocking failures.
3. Given release notes are prepared, when release validation completes, then release notes distinguish feature changes, data/schema changes, breaking changes, security changes and known issues.

## Tasks / Subtasks

- [x] Task 1: Define release readiness checklist data separate from capability labels (AC: 1)
  - [x] Add a release readiness fixture or artifact that references the Story 8.4 capability registry without changing registry meanings.
  - [x] Include the required release flows: workspace open, member invite, message-to-terminal dispatch, terminal output回写, notification jump and restart recovery.
  - [x] Require every checklist item to include status, owner domain, evidence path/reference and a clear release impact.
  - [x] Mark any unverified release gate honestly as `manual`, `blocked` or equivalent; do not convert missing platform evidence into `pass`.

- [x] Task 2: Record three-platform smoke coverage and blockers (AC: 2)
  - [x] Add a dedicated smoke results artifact for Windows, macOS and Linux that is distinct from the Story 1.7 smoke scaffold.
  - [x] For each platform, cover launch, open workspace, start shell, send message, terminal output, notification jump and restart recovery.
  - [x] Record known issues and blocking failures for manual/not-run flows rather than treating the scaffold as proof.
  - [x] Preserve Story 1.7 scaffold validation, but update stale notes if they contradict current implemented domains.

- [x] Task 3: Add release validation automation (AC: 1-3)
  - [x] Add a script that validates release readiness, smoke result structure, evidence paths, required release flows and release-note categories.
  - [x] Ensure the validator can pass for an honest `blocked` release record, while failing missing evidence, missing known-issue/blocker text, duplicate ids or omitted release-note sections.
  - [x] Wire the validator to a focused `pnpm` script and the aggregate test chain if it remains deterministic and local.
  - [x] Do not require packaged app execution or real platform smoke automation inside normal unit tests.

- [x] Task 4: Prepare release notes as a categorized draft (AC: 3)
  - [x] Add a release-notes draft that distinguishes feature changes, data/schema changes, breaking changes, security/privacy changes and known issues.
  - [x] Reference the capability registry, release readiness fixture and smoke results artifact.
  - [x] Clearly call out any blockers or manual smoke gaps instead of implying release approval.

- [x] Task 5: Add focused tests and completion evidence (AC: 1-3)
  - [x] Add fixture/script coverage for release checklist required flows, three-platform smoke coverage and release-note categories.
  - [x] Run focused release validation, `pnpm test:capabilities`, `pnpm test:smoke`, `pnpm test`, `pnpm build`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml` and the IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.

## Dev Notes

### Scope Boundary

Story 8.5 is a release governance and evidence story. It records what is ready, what is blocked and what still requires manual/platform verification. It may add release fixtures, release notes and validation scripts. It must not implement missing product features, mutate capability statuses to hide gaps, or claim platform smoke passes that were not actually run.

### Product Policy

- Capability state and release readiness are separate:
  - Story 8.4 answers “what is implemented/alternative/placeholder/abandoned?”
  - Story 8.5 answers “is MVP releasable, and what evidence/blockers exist?”
- An honest blocked release record is acceptable if platform smoke has not been run. The validator should fail dishonesty or missing evidence, not force a fake pass.
- Release notes must be categorized so maintainers can distinguish user-facing features, data/schema changes, breaking changes, security/privacy work and known issues.

### Current Implementation State

- Story 8.4 added `fixtures/capabilities/mvp-capability-status.json` and `scripts/validate-capability-status.mjs`.
- Story 1.7 added `fixtures/smoke/desktop-smoke-matrix.json`, `scripts/validate-smoke-matrix.mjs` and `src-tauri/tests/smoke_scaffold.rs`.
- The smoke matrix is scaffold-level evidence, not proof of packaged Windows/macOS/Linux smoke execution.
- Core product flows are now implemented across earlier stories, but restart recovery and actual platform smoke remain release gates that need honest status.

### Architecture Compliance

- Keep release artifacts under clear local paths such as `fixtures/release/` and release notes under docs.
- Validation scripts should use Node standard library only and follow existing `scripts/validate-*.mjs` patterns.
- Do not add npm/Rust dependencies, new IPC commands, backend persistence, Tauri permissions, packaging automation, signing/notarization automation or CI release publishing.
- Keep raw Tauri boundary unchanged; this story should not need frontend runtime code.

### Previous Story Intelligence

- Story 8.4 review added parity checklist coverage validation. Reuse that registry as input; do not duplicate capability truth in release notes.
- Story 8.3 enforced privacy discipline for diagnostics exports. Release notes should mention privacy/security changes without exposing raw diagnostic content.
- Story 1.7 intentionally kept smoke matrix scaffold/manual where real packaged automation did not exist. 8.5 can record blockers, but should not pretend scaffold equals platform pass.
- Story 7.8 and 8.1-8.3 added data maintenance and diagnostics features that should be represented in release notes under data/schema and diagnostics, not as platform smoke proof.

### Relevant Files To Read Before Coding

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/1-7-test-contract-fixture-desktop-smoke-scaffolding.md`
- `_bmad-output/implementation-artifacts/8-4-capability-status-labeling.md`
- `fixtures/capabilities/mvp-capability-status.json`
- `scripts/validate-capability-status.mjs`
- `fixtures/smoke/desktop-smoke-matrix.json`
- `scripts/validate-smoke-matrix.mjs`
- `src-tauri/tests/smoke_scaffold.rs`
- `package.json`

### Testing Requirements

- Release validator must reject missing required release flows, duplicate checklist ids, missing evidence paths/references, invalid statuses, missing platform flows, manual/not-run smoke entries without known issue or blocker text, and release notes missing required categories.
- Validator must not require real packaged app execution in local `pnpm test`.
- Existing capability and smoke scaffold validators must remain green.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 8.5 acceptance criteria.
- `_bmad-output/planning-artifacts/prd.md` - NFR20, NFR35, NFR37, NFR43 and release smoke expectations.
- `_bmad-output/planning-artifacts/architecture.md` - release strategy, smoke matrix and release checklist consumption.
- `_bmad-output/implementation-artifacts/1-7-test-contract-fixture-desktop-smoke-scaffolding.md` - existing smoke scaffold boundary.
- `_bmad-output/implementation-artifacts/8-4-capability-status-labeling.md` - capability status registry and release separation boundary.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-13: Created Story 8.5 context from Epic 8, PRD, architecture, Story 1.7 smoke scaffold and completed Story 8.4 capability status registry/review notes. Status set to ready-for-dev.
- 2026-05-13: Started dev-story implementation. Status set to in-progress.
- 2026-05-13: Added release readiness fixture, three-platform smoke results artifact and categorized release notes draft.
- 2026-05-13: Added release validator with guard checks for required flows, duplicate ids, evidence paths, smoke blockers and release-note categories; wired `pnpm test:release` into `pnpm test`.
- 2026-05-13: Validation passed: `pnpm test:release`, `pnpm test:capabilities`, `pnpm test:smoke`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, `cargo check --manifest-path src-tauri/Cargo.toml`, `cargo test --manifest-path src-tauri/Cargo.toml`, `pnpm test`, `pnpm build` and IPC boundary scan.
- 2026-05-13: Code review approved the honest blocked release readiness record and confirmed no packaged smoke pass evidence was fabricated.
- 2026-05-13: Post-review validation passed: `pnpm test:release`.

### Completion Notes List

- Added `fixtures/release/mvp-release-readiness.json` to verify workspace open, member invite, message-to-terminal dispatch, terminal output backwrite, notification jump and restart recovery separately from capability status labels.
- Added `fixtures/release/three-platform-smoke-results.json` with Windows/macOS/Linux coverage for launch, open workspace, start shell, send message, terminal output, notification jump and restart recovery; all platform flows are honestly recorded as not run with blocking failures.
- Updated stale Story 1.7 smoke scaffold notes so they no longer call implemented terminal/chat/notification domains “future scope.”
- Added `docs/release/mvp-release-notes-draft.md` with feature, data/schema, breaking, security/privacy and known issue/blocker sections.
- Added `scripts/validate-release-readiness.mjs` and `pnpm test:release`; `pnpm test` now includes release readiness validation after smoke scaffold validation.
- No packaged platform smoke, signing/notarization, release publishing automation, backend persistence, IPC, or Tauri permission changes were added.

### File List

- `_bmad-output/implementation-artifacts/8-5-release-checklist-three-platform-smoke-results.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/release/mvp-release-readiness.json`
- `fixtures/release/three-platform-smoke-results.json`
- `fixtures/smoke/desktop-smoke-matrix.json`
- `package.json`
- `scripts/validate-release-readiness.mjs`

## Change Log

- 2026-05-13: Created Story 8.5 context for release readiness checklist, smoke results and categorized release notes.
- 2026-05-13: Started implementation of release readiness and smoke result recording.
- 2026-05-13: Implemented release readiness, three-platform smoke results, categorized release notes and release validation; story marked ready for review.
- 2026-05-13: Completed code review; story moved to done.

## Senior Developer Review (AI)

Review Date: 2026-05-13

Outcome: Approve

Findings: None requiring code changes.

Review Notes:

- Confirmed release readiness is recorded separately from Story 8.4 capability labels and references the capability registry instead of redefining it.
- Confirmed the release readiness validator fails missing required flows, duplicate checklist ids, pass checks without existing path evidence, not-run smoke entries without blocker text and release notes missing required categories.
- Confirmed three-platform smoke results honestly record Windows/macOS/Linux flows as `notRun` with blocking failures; the Story 1.7 smoke scaffold is not treated as real packaged pass evidence.
- Confirmed release notes distinguish feature changes, data/schema changes, breaking changes, security/privacy changes and known issues/blockers.
- Validation after review passed: `pnpm test:release`.
