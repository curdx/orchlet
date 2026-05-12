CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dispatch_requests (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    status TEXT NOT NULL,
    terminal_session_id TEXT,
    failure_code TEXT,
    failure_message TEXT,
    failure_user_action TEXT,
    failure_details TEXT,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dispatch_requests__message
ON dispatch_requests(workspace_id, conversation_id, message_id, created_at_ms DESC);

CREATE INDEX IF NOT EXISTS idx_dispatch_requests__member_status
ON dispatch_requests(workspace_id, member_id, status, updated_at_ms DESC);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605122000__dispatch_requests', strftime('%s', 'now') * 1000);
