# Story 1.7: 建立测试、契约 fixture 与桌面 smoke 脚手架

Status: done

## Story

As a maintainer,
I want automated test and smoke scaffolding in place before broad feature work,
So that implementation agents have guardrails for contracts, storage, terminal streams and desktop flows.

## Acceptance Criteria

1. Given the initial project shell exists, when test scaffolding is added, then package and Cargo commands exist for frontend tests, Rust tests, contract tests, schema/data fixture tests and smoke-test entry points.
2. Given typed IPC contracts are defined, when contract tests run, then JSON fixtures verify TypeScript payload compatibility with Rust serde DTOs and response envelopes.
3. Given storage and terminal foundations are introduced, when fixture tests run, then sample `.orchlet` workspace data, SQLite/schema fixtures and terminal stream fixtures cover ordering, snapshot and validation paths.
4. Given release readiness is evaluated, when desktop smoke scaffolding runs or is listed for a platform, then launch, open workspace, start shell, send message, terminal output, notification jump and restart recovery are represented for Windows, macOS and Linux with pass/fail/manual status.

## Tasks / Subtasks

- [x] Task 1: Add package and Cargo test entry points (AC: 1)
  - [x] Add package scripts for frontend tests, Rust tests, contract fixture tests, schema/data fixture tests and smoke scaffold checks.
  - [x] Keep `pnpm test` as a useful aggregate that runs the non-packaging local verification entry points.
  - [x] Add Cargo aliases or named integration tests so maintainers can run Rust tests, contract fixtures, schema/data fixtures and smoke scaffold checks from Cargo.
  - [x] Do not add broad shell, window, plugin or opener permissions to make tests pass.

- [x] Task 2: Add contract fixtures and compatibility checks (AC: 2)
  - [x] Add JSON fixtures under `fixtures/contracts/<domain>/` for current typed IPC request/result/error shapes only.
  - [x] Include fixtures for existing workspace and data-integrity command payloads; do not invent chat/member/terminal command contracts.
  - [x] Add TypeScript fixture compatibility checks that compile fixture JSON against generated TS DTOs.
  - [x] Add Rust contract fixture tests that deserialize the same JSON into serde DTOs and `AppError`.
  - [x] Keep generated files in `src/contracts/generated` untouched unless `ts-rs` export regeneration is required by a DTO change.

- [x] Task 3: Add schema/data-integrity and terminal stream fixtures (AC: 3)
  - [x] Add sample `.orchlet/workspace.json`, app-data registry and app-data fallback fixture data.
  - [x] Add schema fixture metadata for the current workspace JSON schema and a SQLite placeholder/scaffold that explicitly contains no future-domain tables.
  - [x] Add data-integrity validation report fixtures for pass and failure paths.
  - [x] Add terminal stream fixtures using the architecture envelope `{ schemaVersion, sessionId, seq, chunk, kind, emittedAtMs }`.
  - [x] Validate ordering and snapshot expectations without implementing a PTY, terminal tabs, xterm renderer or terminal session lifecycle.

- [x] Task 4: Add desktop smoke scaffold and CI workflow structure (AC: 1, 4)
  - [x] Add a smoke matrix fixture covering Windows, macOS and Linux.
  - [x] Represent launch, open workspace, start shell, send message, terminal output, notification jump and restart recovery with `pass`, `fail` or `manual` status.
  - [x] Keep current entries honest as scaffold/manual where real packaged desktop automation does not exist yet.
  - [x] Add CI workflow structure for format/typecheck/frontend tests/Rust tests/contract tests/schema-data fixtures before packaging.
  - [x] Add desktop smoke workflow entry point that validates the matrix and can later be extended to packaged app automation.

- [x] Task 5: Verification and completion evidence (AC: 1-4)
  - [x] Run `pnpm test`.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `pnpm test:smoke`.
  - [x] Run `pnpm build`.
  - [x] Run `cargo fmt --check` and `cargo check` in `src-tauri`.
  - [x] Run `cargo test`, `cargo test-rust`, `cargo test-contracts`, `cargo test-schema-fixtures` and `cargo test-smoke` in `src-tauri`.
  - [x] Run `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` in `src-tauri`.
  - [x] Run IPC boundary scan: `rg -n "@tauri-apps/api|@tauri-apps/plugin-|invoke\\(|listen\\(|Channel|getCurrentWebview|getCurrentWebviewWindow" src src-tauri/src`.
  - [x] Run `pnpm tauri build` if local prerequisites remain available.

## Dev Notes

### Scope Boundary

Story 1.7 creates guardrails, fixtures and automation entry points. It must not turn scaffold data into product behavior.

Do not implement:

- real terminal PTY/session/tabs/xterm renderer, pane layout or terminal lifecycle.
- chat/member/unread/notification business data.
- diagnostics export, repair, backup/apply or product diagnostics history.
- actual SQLite repositories/tables for future domains.
- old `.golutra`, old redb or old app-data import/read compatibility.
- broad shell/window/plugin permissions or opener expansion.

### Current Implementation State

- Existing typed contracts are `common`, `workspace` and `data_integrity` under `src-tauri/src/contracts`, exported to `src/contracts/generated`.
- Existing IPC frontend boundary is `src/shared/api`; raw Tauri access should stay inside that boundary.
- Story 1.6 added:
  - `data_integrity_validate` command.
  - storage manifest entries for current JSON stores only.
  - validation checks for `.orchlet/workspace.json`, `workspace-registry.json`, `workspace-fallbacks.json` and the manifest.
- No `fixtures/`, root `tests/`, root `scripts/` or `.github/workflows` directories exist yet.
- Existing package scripts are `dev`, `build`, `preview`, `tauri` and `test`.
- Existing Rust tests are module-local; no integration test files exist under `src-tauri/tests`.

### Technical Requirements

- Fixture locations must follow the architecture:
  - contract fixtures: `fixtures/contracts/<domain>/`.
  - schema/data fixtures: `fixtures/schema/<case-name>/` and `fixtures/data-integrity/<case-name>/`.
  - terminal stream fixtures: `fixtures/terminal-streams`.
  - smoke fixtures: `fixtures/smoke`.
  - test suites: `tests/contract`, `tests/data-integrity`, `tests/smoke`, plus Rust integration tests where useful.
- Contract fixtures should use generated TypeScript DTOs and Rust serde DTOs as source-of-truth checks, not ad-hoc prose.
- Fixture JSON must use IPC/persisted casing already established by contracts and stores: camelCase for JSON, Rust snake_case only inside Rust code.
- The SQLite fixture should be explicitly marked as scaffold/future-owned and should not create placeholder tables that future stories inherit by accident.
- Terminal stream fixture validation should assert ordering by `seq` and reconstruct expected snapshots from synthetic chunks.
- Smoke matrix status values should be honest. Current unsupported automated flows should be `manual`, not fake `pass`.

### Architecture Compliance

- Package scripts can orchestrate Node, Vitest and Cargo, but should avoid new dependencies unless there is a clear need.
- Rust integration tests may import `orchlet_lib::contracts`, `orchlet_lib::domain` and `orchlet_lib::app` for fixture compatibility.
- CI should validate structure and test entry points before packaging. Real packaged desktop smoke can remain scaffolded/manual until future release stories provide automation.
- Do not loosen Tauri capabilities. Current opener posture remains narrow: `open_js_links_on_click(false)` and path opener permission only where already allowed.

### Previous Story Intelligence

- Story 1.4 tightened opener/capability scope; do not regress it.
- Story 1.5 fixed window context sync so remote snapshots do not overwrite local window identity.
- Story 1.6 deliberately limited validation to current JSON stores only. 1.7 fixtures should preserve that line and not claim coverage for future domains.
- Story 1.6 validation baseline passed with `pnpm test`, `pnpm build`, `cargo fmt --check`, `cargo check`, `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test`, IPC scan and `pnpm tauri build`.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 1.7 ACs and Epic 1 foundation scope.
- `_bmad-output/planning-artifacts/prd.md` - NFR20, NFR35, NFR36, NFR37, NFR43.
- `_bmad-output/planning-artifacts/architecture.md` - fixture locations, test organization, terminal stream envelope, CI/smoke strategy.
- `_bmad-output/implementation-artifacts/1-6-storage-manifest-schema-validation-report.md` - current storage/data-integrity contract and validation scope.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-11: `pnpm test:contracts` passed after adding TS enum narrowing for JSON fixtures; Rust integration test passed 2 contract fixture checks.
- 2026-05-11: `pnpm test:data-integrity` passed; Rust integration test passed 6 schema/data/terminal fixture checks.
- 2026-05-11: `pnpm test:smoke` passed; Rust integration test passed desktop smoke matrix coverage for Windows, macOS and Linux.
- 2026-05-11: `cargo fmt` applied formatting to new Rust integration tests.
- 2026-05-11: `pnpm test` passed: 15 frontend tests, 2 contract fixture tests, 6 schema/data fixture tests and 1 smoke scaffold test.
- 2026-05-11: `pnpm build` passed.
- 2026-05-11: `cargo fmt --check` and `cargo check` passed in `src-tauri`.
- 2026-05-11: `cargo test` passed: 65 unit tests, 2 contract fixture tests, 6 schema/data fixture tests and 1 smoke scaffold test.
- 2026-05-11: Cargo aliases `cargo test-rust`, `cargo test-contracts`, `cargo test-schema-fixtures` and `cargo test-smoke` passed in `src-tauri`.
- 2026-05-11: `TS_RS_EXPORT_DIR=../src/contracts/generated cargo test` passed with the same Rust test set and regenerated bindings unchanged.
- 2026-05-11: IPC boundary scan found raw Tauri usage only under `src/shared/api` boundary files/tests.
- 2026-05-11: `pnpm tauri build` passed and produced macOS app/dmg bundles; existing `com.orchlet.app` identifier warning remains.
- 2026-05-11: Review scan found no broad Tauri permissions, shell plugin, PTY/xterm, SQLite tables, `.golutra` reads or future chat/diagnostics implementation.

### Completion Notes List

- Added package scripts for frontend, Rust, contract fixture, schema/data fixture and smoke scaffold checks.
- Added Cargo aliases and Rust integration tests for contract fixtures, schema/data fixtures and smoke scaffold validation.
- Added contract JSON fixtures for current workspace and data-integrity commands, including request, success result and `AppError` failure shapes.
- Added TypeScript compatibility checks that import JSON fixtures and narrow generated DTO enum fields before assignment to generated contract types.
- Added schema/data fixtures for `.orchlet/workspace.json`, workspace registry, workspace fallbacks, data-integrity reports and a scaffold-only SQLite schema manifest with no future-domain tables.
- Added synthetic terminal stream fixtures for ordered output, out-of-order arrival and snapshot recovery; validation reconstructs snapshots by `seq`.
- Added desktop smoke matrix fixture covering Windows, macOS and Linux with honest `manual` status for flows that do not yet have packaged automation.
- Added CI and desktop smoke workflow skeletons without loosening Tauri capabilities or implementing future terminal/chat/diagnostics domains.

### File List

- `.github/workflows/ci.yml`
- `.github/workflows/desktop-smoke.yml`
- `_bmad-output/implementation-artifacts/1-7-test-contract-fixture-desktop-smoke-scaffolding.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `fixtures/contracts/contract-fixtures.manifest.json`
- `fixtures/contracts/data-integrity/data-integrity-validate.error.json`
- `fixtures/contracts/data-integrity/data-integrity-validate.request.json`
- `fixtures/contracts/data-integrity/data-integrity-validate.result.json`
- `fixtures/contracts/workspace/workspace-open.error.json`
- `fixtures/contracts/workspace/workspace-open.request.json`
- `fixtures/contracts/workspace/workspace-open.result.json`
- `fixtures/data-integrity/invalid-registry/app-data/workspace-fallbacks.json`
- `fixtures/data-integrity/invalid-registry/app-data/workspace-registry.json`
- `fixtures/data-integrity/reports/failed-registry-report.json`
- `fixtures/data-integrity/reports/passed-report.json`
- `fixtures/data-integrity/valid-json-stores/app-data/workspace-fallbacks.json`
- `fixtures/data-integrity/valid-json-stores/app-data/workspace-registry.json`
- `fixtures/data-integrity/valid-json-stores/workspace/.orchlet/workspace.json`
- `fixtures/schema/sqlite-workspace-v1/schema-manifest.json`
- `fixtures/schema/valid-workspace/.orchlet/workspace.json`
- `fixtures/smoke/desktop-smoke-matrix.json`
- `fixtures/terminal-streams/ordered-output.json`
- `fixtures/terminal-streams/out-of-order-arrival.json`
- `fixtures/terminal-streams/snapshot-recovery.json`
- `package.json`
- `scripts/validate-contract-fixtures.mjs`
- `scripts/validate-data-fixtures.mjs`
- `scripts/validate-smoke-matrix.mjs`
- `src-tauri/.cargo/config.toml`
- `src-tauri/tests/contract_fixtures.rs`
- `src-tauri/tests/schema_data_fixtures.rs`
- `src-tauri/tests/smoke_scaffold.rs`
- `tests/contract/contract-fixture-types.ts`
- `tests/contract/tsconfig.json`
- `tests/data-integrity/data-integrity-fixture-types.ts`
- `tests/data-integrity/tsconfig.json`

## Change Log

- 2026-05-11: Created Story 1.7 context and marked ready for development.
- 2026-05-11: Started implementation.
- 2026-05-11: Implemented fixture/test/smoke scaffolding, CI workflow skeletons and validation evidence; marked ready for review.
- 2026-05-11: Completed review with no required follow-up patches and marked story done.

## Senior Developer Review (AI)

Review Date: 2026-05-11

Outcome: Approve

Findings: None.

Review Notes:

- Contract fixtures are limited to current workspace and data-integrity IPC shapes and are checked by both TypeScript DTO assignment and Rust serde deserialization.
- Schema/data fixtures cover valid JSON stores, invalid registry failure, validation report counts, scaffold-only SQLite metadata and terminal stream ordering/snapshot reconstruction.
- Smoke matrix honestly records unsupported packaged flows as `manual` for Windows, macOS and Linux.
- No Tauri capability expansion or future terminal/chat/diagnostics/SQLite implementation was introduced.
