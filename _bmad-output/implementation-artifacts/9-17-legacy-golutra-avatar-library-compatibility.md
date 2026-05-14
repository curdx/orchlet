# Story 9.17: Legacy Golutra avatar library compatibility

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a current Golutra user,
I want the React/Tauri rebuild to understand my existing `avatar-library.json` and `avatars/` files,
So that a previously selected local profile avatar continues to render instead of resetting to a placeholder.

## Acceptance Criteria

1. Given no current `settings/profile.json` exists and legacy `global-settings.json` has `account.avatar` set to `local:<id>`, when the matching `avatar-library.json` entry and `avatars/<filename>` file exist, then profile settings load an uploaded avatar snapshot with preview data.
2. Given the same legacy files exist but current `settings/profile.json` exists, when profile settings load, then the current profile remains authoritative.
3. Given legacy local avatar metadata is missing, points outside the avatar directory, has an unsupported extension, is empty or exceeds the avatar size limit, when profile settings load, then the profile falls back to a safe placeholder instead of failing.
4. Given the story is ready for review, when validation runs, then targeted settings/data-integrity tests, `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness validation and `git diff --check` pass structurally. Release readiness may remain blocked for `chat.redb` and packaged smoke evidence.

## Tasks / Subtasks

- [x] Task 1: Add legacy avatar-library reader (AC: 1, 3)
  - [x] Parse root-level Golutra `avatar-library.json` entries.
  - [x] Resolve legacy `local:<id>` avatar references to `avatars/<filename>` safely.
  - [x] Map valid legacy local avatars into current uploaded avatar snapshots.
  - [x] Fall back to placeholder for missing or unsafe legacy assets.

- [x] Task 2: Preserve current profile precedence (AC: 2)
  - [x] Keep current `settings/profile.json` authoritative when present.
  - [x] Ensure current uploaded avatar path validation accepts legacy-root avatar paths only under `avatars/`.

- [x] Task 3: Add tests and release evidence (AC: 1, 2, 3, 4)
  - [x] Add Rust tests for valid legacy local avatar import and preview hydration.
  - [x] Add tests for current profile precedence and unsafe/missing legacy avatar fallback.
  - [x] Add data-integrity coverage for legacy avatar library validation.
  - [x] Update release gate/checklists/capability registry to say avatar library compatibility is resolved while remaining blockers stay honest.

## Dev Notes

- Golutra reference:
  - `/Users/wdx/opc/golutra/src-tauri/src/ui_gateway/app.rs`
  - `/Users/wdx/opc/golutra/src/shared/tauri/avatars.ts`
  - `/Users/wdx/opc/golutra/src/shared/utils/avatar.ts`
- Legacy Golutra keeps avatar metadata in root-level `avatar-library.json` and files under app data `avatars/`.
- This story intentionally does not claim old `chat.redb` or packaged OS smoke evidence.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cargo fmt --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml app::settings`
- `cargo test --manifest-path src-tauri/Cargo.toml legacy_global_settings`
- `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity`
- `pnpm test:contracts`
- `pnpm test:data-integrity`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `node scripts/validate-release-readiness.mjs`
- `node scripts/validate-capability-status.mjs`
- `git diff --check`

### Completion Notes List

- Legacy `account.avatar = local:<id>` now resolves through root-level `avatar-library.json` and app-data `avatars/<filename>` when current `settings/profile.json` is absent.
- Valid legacy local avatars hydrate current uploaded avatar snapshots, including preview data URLs, without persisting current profile files during read.
- Current `settings/profile.json` remains authoritative when present; missing, unsafe, unsupported, empty or oversized legacy avatar assets fall back to placeholder.
- Release evidence marks avatar-library compatibility as structurally resolved while keeping release readiness `blocked` for old `chat.redb` and packaged platform smoke/tray evidence.

### File List

- `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`
- `_bmad-output/implementation-artifacts/9-17-legacy-golutra-avatar-library-compatibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/rebuild/feature-inventory.md`
- `docs/rebuild/parity-checklist.md`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/capabilities/mvp-capability-status.json`
- `fixtures/release/mvp-release-readiness.json`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/app/settings/mod.rs`
- `src-tauri/src/infrastructure/persistence/json_store/legacy_global_settings_store.rs`
- `src-tauri/src/infrastructure/persistence/json_store/profile_settings_store.rs`

## Change Log

- 2026-05-14: Created Story 9.17 from remaining Story 9.10 legacy avatar-library blocker.
- 2026-05-14: Implemented legacy avatar-library local profile avatar compatibility and moved story to review.
