-- ============================================================
-- Adds lookup_log: records every word submitted through the
-- command prompt, hit or miss, so word frequency can inform
-- which new dictionary entries are worth adding later.
-- ============================================================

CREATE TABLE lookup_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  word        TEXT NOT NULL,           -- lowercase, exactly as looked up
  was_hit     INTEGER NOT NULL,        -- 1 = matched a dictionary entry, 0 = miss
  entry_type  TEXT,                    -- 'easter_egg' | 'hobby_project' | NULL on miss
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_lookup_log_word ON lookup_log(word);
CREATE INDEX idx_lookup_log_created ON lookup_log(created_at);
