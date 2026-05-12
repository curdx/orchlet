ALTER TABLE conversations ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN last_message_preview TEXT;

CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    created_at_ms INTEGER NOT NULL,
    PRIMARY KEY (conversation_id, member_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations__workspace_default_channel
ON conversations(workspace_id)
WHERE kind = 'channel' AND is_default = 1;

CREATE INDEX IF NOT EXISTS idx_conversation_members__workspace_member
ON conversation_members(workspace_id, member_id);

CREATE INDEX IF NOT EXISTS idx_conversations__workspace_list_order
ON conversations(workspace_id, is_pinned DESC, unread_count DESC, last_activity_at_ms DESC, updated_at_ms DESC);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605121300__conversation_list_groups', strftime('%s', 'now') * 1000);
