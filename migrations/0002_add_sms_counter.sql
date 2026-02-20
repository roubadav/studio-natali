-- SMS Daily Counter table for rate limiting
CREATE TABLE IF NOT EXISTS sms_daily_counter (
  date TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- Add sms_daily_limit setting
INSERT OR IGNORE INTO settings (key, value, description, category)
VALUES ('sms_daily_limit', '20', 'Maximální počet SMS za den', 'workflow');

-- Cleanup old counter entries (keep last 30 days only - run periodically)
-- DELETE FROM sms_daily_counter WHERE date < date('now', '-30 days');
