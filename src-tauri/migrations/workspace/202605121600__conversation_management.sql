ALTER TABLE conversations ADD COLUMN is_muted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN deleted_at_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_conversations__workspace_active_management
ON conversations(workspace_id, deleted_at_ms, is_pinned DESC, unread_count DESC, last_activity_at_ms DESC);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605121600__conversation_management', strftime('%s', 'now') * 1000);
