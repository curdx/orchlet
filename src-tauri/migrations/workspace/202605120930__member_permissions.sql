ALTER TABLE members ADD COLUMN instance_index INTEGER NOT NULL DEFAULT 1;
ALTER TABLE members ADD COLUMN instance_label TEXT;
ALTER TABLE members ADD COLUMN can_mention INTEGER NOT NULL DEFAULT 1;
ALTER TABLE members ADD COLUMN can_remove INTEGER NOT NULL DEFAULT 1;
ALTER TABLE members ADD COLUMN sandboxed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE members ADD COLUMN unlimited_access INTEGER NOT NULL DEFAULT 0;

UPDATE members
SET instance_label = display_name
WHERE instance_label IS NULL;

UPDATE members
SET can_mention = 0,
    can_remove = 0,
    sandboxed = 0,
    unlimited_access = 1
WHERE role = 'owner';

CREATE INDEX IF NOT EXISTS idx_members__workspace_instance_label
ON members(workspace_id, instance_label);

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605120930__member_permissions', strftime('%s', 'now') * 1000);
