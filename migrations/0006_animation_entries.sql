-- ============================================================
-- Migration 0006 — animation entry type
--
-- Adds 'animation' as a valid entry_type, a new animation_key
-- column (which animation to run, e.g. 'fireworks'), and seeds
-- the first batch of animation trigger words.
--
-- To add more animation words later:
--   1. Add a new INSERT below (or directly via D1 console)
--   2. Add a matching block in animations.js using the template
-- ============================================================

-- SQLite doesn't support ALTER TABLE ... MODIFY CONSTRAINT, so we
-- recreate the table with the updated CHECK and migrate data across.
PRAGMA foreign_keys = OFF;

CREATE TABLE dictionary_entries_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  word          TEXT NOT NULL UNIQUE,
  fact          TEXT NOT NULL,
  entry_type    TEXT NOT NULL DEFAULT 'easter_egg'
                  CHECK (entry_type IN ('easter_egg', 'hobby_project', 'animation')),
  icon          TEXT,
  animation_key TEXT,   -- only used when entry_type = 'animation'
                        -- must match a key in the ANIMATIONS registry in animations.js
  is_visible    INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO dictionary_entries_new
  (id, word, fact, entry_type, icon, animation_key, is_visible, created_at, updated_at)
SELECT
  id, word, fact, entry_type, icon, NULL, is_visible, created_at, updated_at
FROM dictionary_entries;

DROP TABLE dictionary_entries;
ALTER TABLE dictionary_entries_new RENAME TO dictionary_entries;

CREATE INDEX idx_dictionary_entries_word ON dictionary_entries(word);

PRAGMA foreign_keys = ON;

-- ── Animation trigger words ───────────────────────────────────
-- Each word maps to one animation via animation_key.
-- The fact is shown in the typewriter slot briefly before the
-- animation fires, so keep it short and punchy.

INSERT INTO dictionary_entries (word, fact, entry_type, icon, animation_key) VALUES
  ('fireworks', 'Stand back.', 'animation', 'sparkle', 'fireworks'),
  ('confetti',  'Congratulations on finding this.', 'animation', 'sparkle', 'confetti'),
  ('snow',      'It''s quiet when it snows.', 'animation', 'sun', 'snow'),
  ('matrix',    'There is no spoon.', 'animation', 'code', 'matrix'),
  ('glitch',    'Did something just—', 'animation', 'virus', 'glitch'),
  ('aurora',    'The sky does this for free.', 'animation', 'sun', 'aurora');
