CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    contact_kind TEXT NOT NULL,
    invite_source TEXT NOT NULL,
    notes TEXT,
    source_label TEXT,
    created_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contacts__kind_display_name
ON contacts(contact_kind, display_name);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605121200__contacts', strftime('%s', 'now') * 1000);
