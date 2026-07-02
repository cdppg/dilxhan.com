-- Migration 0007 — fix glitch entry
--
-- The em dash in the original glitch fact (migration 0006) can cause
-- silent INSERT failures in some wrangler/SQLite environments, leaving
-- the word unregistered. This upserts the entry with a safe ASCII fact.

INSERT INTO dictionary_entries (word, fact, entry_type, icon, animation_key)
VALUES ('glitch', 'Did something just-', 'animation', 'virus', 'glitch')
ON CONFLICT(word) DO UPDATE SET
  fact          = excluded.fact,
  entry_type    = excluded.entry_type,
  animation_key = excluded.animation_key;
