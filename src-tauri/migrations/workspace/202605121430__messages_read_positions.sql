CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    author_member_id TEXT NOT NULL,
    body TEXT NOT NULL,
    send_status TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages__conversation_page
ON messages(workspace_id, conversation_id, created_at_ms DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_messages__workspace_author
ON messages(workspace_id, author_member_id);

CREATE TABLE IF NOT EXISTS conversation_read_positions (
    workspace_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    last_read_message_id TEXT NOT NULL,
    last_read_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    PRIMARY KEY (workspace_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_read_positions__workspace
ON conversation_read_positions(workspace_id, updated_at_ms DESC);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605121430__messages_read_positions', strftime('%s', 'now') * 1000);
