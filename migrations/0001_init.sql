CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target_user TEXT,
    tweet_id TEXT,
    message TEXT,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seen_mentions (
    tweet_id TEXT PRIMARY KEY,
    handled_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seen_followers (
    user_handle TEXT PRIMARY KEY,
    dm_sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rate_counters (
    action TEXT NOT NULL,
    date TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (action, date)
);

-- Default config values
INSERT OR IGNORE INTO config (key, value) VALUES
    ('auto_reply.enabled', 'false'),
    ('auto_reply.keywords', '[]'),
    ('auto_reply.templates', '[]'),
    ('auto_reply.max_per_day', '50'),
    ('auto_reply.ai_variation', 'false'),
    ('follow_dm.enabled', 'false'),
    ('follow_dm.template', ''),
    ('follow_dm.max_per_day', '30'),
    ('follow_dm.ai_variation', 'false'),
    ('bot.poll_interval_secs', '60'),
    ('bot.clix_path', 'clix'),
    ('bot.own_handle', ''),
    ('ai.provider', 'ollama'),
    ('ai.model', 'llama3'),
    ('ai.api_key', ''),
    ('ai.ollama_url', 'http://localhost:11434');
