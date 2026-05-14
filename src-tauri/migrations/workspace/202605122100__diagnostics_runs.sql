CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnostics_runs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    initiated_by TEXT,
    outcome TEXT,
    summary TEXT,
    started_at_ms INTEGER NOT NULL,
    completed_at_ms INTEGER,
    updated_at_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_diagnostics_runs__workspace_active
ON diagnostics_runs(workspace_id)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_diagnostics_runs__workspace_started
ON diagnostics_runs(workspace_id, started_at_ms DESC, id DESC);

CREATE TABLE IF NOT EXISTS diagnostic_events (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    event_name TEXT NOT NULL,
    severity TEXT NOT NULL,
    conversation_id TEXT,
    message_id TEXT,
    member_id TEXT,
    terminal_session_id TEXT,
    terminal_tab_id TEXT,
    window_label TEXT,
    dispatch_id TEXT,
    metadata_json TEXT NOT NULL DEFAULT '[]',
    recorded_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_events__run_timeline
ON diagnostic_events(run_id, recorded_at_ms, id);

CREATE INDEX IF NOT EXISTS idx_diagnostic_events__workspace_scope
ON diagnostic_events(workspace_id, scope, recorded_at_ms DESC);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605122100__diagnostics_runs', strftime('%s', 'now') * 1000);
