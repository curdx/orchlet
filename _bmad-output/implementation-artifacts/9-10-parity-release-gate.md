# Story 9.10: Parity release gate

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a product owner,
I want release readiness to require Golutra parity evidence,
So that no build is called complete while it still diverges from the reference app.

## Acceptance Criteria

1. Given parity release gate runs, when all reference screens and core flows are reviewed, then every user-visible item in `docs/rebuild/feature-inventory.md` and `docs/rebuild/parity-checklist.md` is marked `通过`, approved exception, approved abandonment, or blocking bug with concrete evidence.
2. Given screenshots and interaction smoke are captured, when differences remain, then each difference is classified as rendering noise, approved parity exception, approved abandonment, or blocking bug.
3. Given release readiness fixtures are validated, when parity remains incomplete, then `fixtures/release/mvp-release-readiness.json` stays `blocked` with explicit Golutra parity evidence and does not claim product acceptance.
4. Given release notes are prepared, when parity gate completes, then `docs/release/mvp-release-notes-draft.md` states this build is a React/Tauri internal rebuild of Golutra, not a redesigned app.
5. Given validation commands run, when the story is ready for review, then `pnpm test`, `pnpm build`, `git diff --check`, and the release readiness validator pass structurally while preserving honest blocked/ready status.

## Tasks / Subtasks

- [x] Task 1: Build the parity evidence map (AC: 1, 2)
  - [x] Inventory all Story 9.1-9.9 screenshots, comparison montages and Dev Agent Records.
  - [x] Map evidence to the baseline screenshot matrix in `_bmad-output/planning-artifacts/golutra-parity-baseline-2026-05-13.md`.
  - [x] Create `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md` with pass/exception/blocker classifications.

- [x] Task 2: Update rebuild parity documents (AC: 1)
  - [x] Update `docs/rebuild/feature-inventory.md` with evidence-backed status notes where user-visible parity is verified or blocked.
  - [x] Update `docs/rebuild/parity-checklist.md` so no item remains `未开始`; use `通过`, `放弃`, `阻塞` or an equivalent explicit status with notes.
  - [x] Do not mark an item `通过` using implementation effort alone; require screenshot, test, fixture, source comparison or manual smoke evidence.

- [x] Task 3: Update release readiness fixtures honestly (AC: 3)
  - [x] Update `fixtures/release/mvp-release-readiness.json` `golutraParityGate` evidence to include Epic 9 story artifacts and the 9.10 report.
  - [x] Keep `overallStatus: "blocked"` if any parity or three-platform packaged smoke evidence is missing.
  - [x] Preserve `restartRecovery` / three-platform smoke blockers unless actual Windows, macOS and Linux packaged smoke evidence exists.

- [x] Task 4: Update release notes (AC: 4)
  - [x] Update `docs/release/mvp-release-notes-draft.md` to state the build is a React/Tauri internal rebuild of Golutra, not a redesigned app.
  - [x] List approved parity exceptions and blocking parity gaps separately from implementation-complete features.
  - [x] Keep remote Skill Store / Plugin Marketplace and platform tray constraints honest.

- [x] Task 5: Run release gate validation (AC: 2, 5)
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `node scripts/validate-release-readiness.mjs`.
  - [x] Run `git diff --check`.
  - [x] Record command outputs and any remaining blockers in the story Dev Agent Record.

## Dev Notes

- `/Users/wdx/opc/golutra` remains the product master. React/Tauri can differ internally, but user-visible UI, flow, copy semantics, state feedback and placeholder boundaries require evidence-backed parity or an explicit approved exception.
- `docs/rebuild/feature-inventory.md` and `docs/rebuild/parity-checklist.md` were generated before Epic 9 and currently contain broad `未开始` statuses. Story 9.10 must update them from actual Story 9.1-9.9 evidence, not blanket mark them as pass.
- `fixtures/release/mvp-release-readiness.json` already contains a `golutraParityGate` blocked check and three-platform packaged smoke blockers. Passing `scripts/validate-release-readiness.mjs` means the fixture is structurally valid; it does not mean release is ready unless `overallStatus` is `ready`.
- Story 9.8 documented a current parity boundary: Golutra `SkillStore.vue` and `PluginMarketplace.vue` keep remote marketplace arrays empty behind TODOs, so no real remote data/API behavior exists to port yet.
- Story 9.11 resolved the Story 9.9 native tray lifecycle boundary structurally: React notification rows now carry Golutra preview metadata where available, publish avatar PNG bytes, and call native preview hover/hide commands. Packaged OS tray smoke remains separate release evidence.
- Do not change release readiness to `ready` unless every blocker has direct evidence. Honest `blocked` with a complete evidence report is acceptable for this story if release blockers remain.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `pnpm test` — passed; frontend 7 files / 132 tests, contract/data-integrity/capability/smoke/release validators passed; release readiness reported `blocked`.
- `pnpm build` — passed; Vite emitted the existing >500 kB chunk warning.
- `node scripts/validate-release-readiness.mjs` — passed structurally; reported `validated MVP release readiness: blocked`.
- `git diff --check` — passed.

### Completion Notes List

- Built the Story 9.10 release gate report with pass, exception, boundary and blocker classifications across Epic 9 parity evidence.
- Updated rebuild parity docs so every checklist item is explicitly `通过`, `放弃` or `阻塞` with evidence notes instead of broad `未开始` placeholders.
- Updated release readiness evidence while preserving `overallStatus: "blocked"` and `golutraParityGate.status: "blocked"`.
- Updated release notes to state this is a React/Tauri internal rebuild of Golutra, not a redesign.
- Release remains blocked by legacy `.golutra` data compatibility gaps and missing Windows/macOS/Linux packaged smoke/restart evidence. Native tray lifecycle parity now has Story 9.11 code/test evidence but no packaged OS smoke.

### File List

- `_bmad-output/implementation-artifacts/9-10-parity-release-gate.md`
- `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/rebuild/feature-inventory.md`
- `docs/rebuild/parity-checklist.md`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/release/mvp-release-readiness.json`
- `_bmad-output/implementation-artifacts/9-11-native-tray-lifecycle-parity.md`

## Change Log

- 2026-05-14: Created Story 9.10 from Epic 9 release gate requirements.
- 2026-05-14: Completed parity release gate evidence, rebuild docs, release readiness fixture and release notes updates; release remains honestly blocked.
- 2026-05-14: Updated native tray lifecycle evidence from Story 9.11; release remains blocked for legacy data and packaged smoke evidence.
