ALTER TABLE members ADD COLUMN avatar TEXT NOT NULL DEFAULT 'css:orbit';

UPDATE members
SET avatar = 'css:orbit'
WHERE avatar IS NULL OR trim(avatar) = '';

INSERT OR IGNORE INTO schema_migrations(version, applied_at_ms)
VALUES ('202605130930__member_avatar', strftime('%s', 'now') * 1000);
