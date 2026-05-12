CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    participant_kind TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    last_activity_at_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations__workspace_private_participant
ON conversations(workspace_id, participant_kind, participant_id)
WHERE kind = 'private';

CREATE INDEX IF NOT EXISTS idx_conversations__workspace_activity
ON conversations(workspace_id, last_activity_at_ms DESC, updated_at_ms DESC);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605121210__private_conversations', strftime('%s', 'now') * 1000);
