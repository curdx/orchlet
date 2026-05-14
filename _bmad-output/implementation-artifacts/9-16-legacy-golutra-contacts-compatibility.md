# Story 9.16: Legacy Golutra contacts compatibility

Status: review

Baseline commit: cd1cb754bd89d807be3533f108bfb53c07f8e0a5

## Story

As a current Golutra user,
I want the React/Tauri rebuild to import my existing app-data `contacts.json`,
So that global/admin contacts created in Golutra still appear in the Friends and invite flows.

## Acceptance Criteria

1. Given app data contains legacy Golutra `contacts.json` and the current SQLite contacts table is absent, when orchlet lists global contacts, then it imports valid legacy contacts into the current contact schema and returns them sorted by current rules.
2. Given a legacy contact has Golutra fields `{ id, name, avatar, roleType, status, createdAt }`, when imported, then ULID ids, display names, avatar strings, admin/contact kind, status and timestamps are preserved where valid.
3. Given a legacy contact has duplicate ids, missing names or malformed optional fields, when imported, then invalid records are skipped or safely defaulted without failing the entire list.
4. Given the current SQLite contacts table already exists, even if empty, when legacy `contacts.json` also exists, then the current store remains authoritative and legacy contacts are not re-imported.
5. Given the story is ready for review, when validation runs, then targeted contact/data-integrity tests, `pnpm test:contracts`, `pnpm test:data-integrity`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm build`, release readiness validation and `git diff --check` pass structurally. Release readiness may remain blocked for `chat.redb`, avatars and packaged smoke evidence.

## Tasks / Subtasks

- [x] Task 1: Add legacy contacts import (AC: 1, 2, 3, 4)
  - [x] Detect current SQLite contacts table existence before migration/import.
  - [x] Parse root-level Golutra `contacts.json` array defensively.
  - [x] Map legacy fields into current `ContactProfile` rows.
  - [x] Keep current SQLite contact table authoritative once it exists.

- [x] Task 2: Add tests and data-integrity coverage (AC: 1, 2, 3, 4, 5)
  - [x] Add contact tests for legacy import and field mapping.
  - [x] Add invalid/duplicate legacy record coverage.
  - [x] Add current-store precedence coverage.
  - [x] Add data-integrity coverage for legacy contacts validation.

- [x] Task 3: Run validation and update release evidence (AC: 5)
  - [x] Run targeted contact/data-integrity Rust tests.
  - [x] Run `pnpm test:contracts`.
  - [x] Run `pnpm test:data-integrity`.
  - [x] Run `pnpm exec tsc --noEmit`.
  - [x] Run `pnpm test`.
  - [x] Run `pnpm build`.
  - [x] Run `node scripts/validate-release-readiness.mjs`.
  - [x] Run `git diff --check`.
  - [x] Update Story 9.10 release gate/checklists/capability registry to say `contacts.json` compatibility is resolved while remaining blockers stay honest.

## Dev Notes

- Golutra reference:
  - `/Users/wdx/opc/golutra/src/features/chat/contactsStorage.ts`
  - `/Users/wdx/opc/golutra/src/features/chat/contactsStore.ts`
  - `/Users/wdx/opc/golutra/src/features/chat/types.ts`
- Legacy Golutra keeps global contacts in root-level app data `contacts.json`.
- This story intentionally does not claim old `chat.redb`, avatar binary/library migration or packaged OS smoke evidence.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `cargo test --manifest-path src-tauri/Cargo.toml app::contacts` — passed; 3 contact tests including legacy import, invalid/duplicate handling and current-table precedence.
- `cargo test --manifest-path src-tauri/Cargo.toml app::data_integrity` — passed; 14 data-integrity tests including legacy contacts validation.
- `pnpm test:contracts` — passed; 80 contract fixture groups and 12 Rust contract fixture tests passed.
- `pnpm test:data-integrity` — passed; schema/data fixtures validated and 21 Rust fixture tests passed.
- `pnpm exec tsc --noEmit` — passed.
- `pnpm test` — passed; frontend 7 files / 133 tests, contract/data-integrity/capability/smoke/release validators passed; release readiness reported `blocked`.
- `pnpm build` — passed; Vite emitted the existing >500 kB chunk warning.
- `node scripts/validate-release-readiness.mjs` — passed structurally; reported `validated MVP release readiness: blocked`.
- `node scripts/validate-capability-status.mjs` — passed; 85 MVP capability status entries.
- `git diff --check` — passed.

### Completion Notes List

- Added root-level legacy Golutra `contacts.json` parsing and import into the current SQLite contacts table when that table is absent.
- Preserved ULID contact ids, display names, avatar strings, role kind, status and created timestamps where valid.
- Skipped duplicate ids, non-ULID ids and empty-name legacy records while defaulting malformed optional fields.
- Kept the current SQLite contacts table authoritative once it exists, including the empty-table case after user deletion.
- Added data-integrity validation for legacy contacts without creating the current SQLite DB.
- Updated Story 9.10 release evidence, rebuild checklist, release notes and capability status while keeping `chat.redb`, avatars and packaged smoke blocked.

### File List

- `_bmad-output/implementation-artifacts/9-10-parity-release-gate-report.md`
- `_bmad-output/implementation-artifacts/9-16-legacy-golutra-contacts-compatibility.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/rebuild/feature-inventory.md`
- `docs/rebuild/parity-checklist.md`
- `docs/release/mvp-release-notes-draft.md`
- `fixtures/capabilities/mvp-capability-status.json`
- `fixtures/release/mvp-release-readiness.json`
- `src-tauri/src/app/contacts/mod.rs`
- `src-tauri/src/app/data_integrity/mod.rs`
- `src-tauri/src/infrastructure/persistence/sqlite/contact_repository.rs`

## Change Log

- 2026-05-14: Created Story 9.16 from remaining Story 9.10 legacy contacts blocker.
- 2026-05-14: Implemented and validated legacy contacts import; moved story to review while release remains blocked for remaining legacy data and packaged smoke evidence.
