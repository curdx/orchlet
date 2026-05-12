CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS terminal_tabs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    terminal_session_id TEXT NOT NULL,
    member_id TEXT,
    label TEXT NOT NULL,
    shell TEXT NOT NULL,
    status TEXT NOT NULL,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    sort_index INTEGER NOT NULL DEFAULT 0,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL,
    closed_at_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_terminal_tabs__workspace_order
ON terminal_tabs(workspace_id, status, is_pinned DESC, sort_index, created_at_ms, id);

CREATE INDEX IF NOT EXISTS idx_terminal_tabs__workspace_session
ON terminal_tabs(workspace_id, terminal_session_id);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605121900__terminal_tabs', strftime('%s', 'now') * 1000);
