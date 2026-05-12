CREATE TABLE IF NOT EXISTS message_mentions (
    workspace_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    PRIMARY KEY (message_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_message_mentions__conversation
ON message_mentions(workspace_id, conversation_id, message_id);

CREATE INDEX IF NOT EXISTS idx_message_mentions__member
ON message_mentions(workspace_id, member_id, created_at_ms DESC);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605121700__message_mentions', strftime('%s', 'now') * 1000);
