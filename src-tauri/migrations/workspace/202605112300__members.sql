CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    role TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL,
    runtime_type TEXT NOT NULL,
    runtime_id TEXT,
    runtime_label TEXT,
    runtime_command TEXT,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_members__workspace_owner
ON members(workspace_id)
WHERE role = 'owner';

CREATE INDEX IF NOT EXISTS idx_members__workspace_role
ON members(workspace_id, role, created_at_ms);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605112300__members', strftime('%s', 'now') * 1000);
