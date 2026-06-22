-- ============================================================
-- Dilxhan.com — initial schema
-- Three content tables, all designed to be managed later via
-- an admin portal (CRUD), but populated by hand/seed for now.
-- ============================================================

-- Social links shown on the page (visible row).
-- "sort_order" lets you reorder without changing IDs.
CREATE TABLE socials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT NOT NULL,        -- e.g. "GitHub"
  url         TEXT NOT NULL,        -- e.g. "https://github.com/..."
  icon        TEXT NOT NULL,        -- icon identifier, e.g. "github"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_visible  INTEGER NOT NULL DEFAULT 1,  -- 1 = shown, 0 = hidden (soft toggle without deleting)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Hobby projects — the visible tile row ("things I build for fun").
-- Each can optionally link to a dictionary_entry so typing its name
-- in the command palette can trigger a "pulse" highlight on this tile.
CREATE TABLE hobby_projects (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  description       TEXT,
  url               TEXT,                  -- where the tile links to (optional)
  icon              TEXT NOT NULL,
  dictionary_key     TEXT,                  -- FK-by-value to dictionary_entries.word (nullable)
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_visible        INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The easter-egg dictionary. One row per discoverable word.
-- "entry_type" distinguishes pure easter eggs from hobby/project
-- echoes, since they're presented differently on the frontend
-- (floating random reveal vs. tile pulse) even though they share
-- one lookup system.
CREATE TABLE dictionary_entries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  word          TEXT NOT NULL UNIQUE,   -- lowercase, what the user types
  fact          TEXT NOT NULL,          -- the little info blurb
  entry_type    TEXT NOT NULL DEFAULT 'easter_egg'
                  CHECK (entry_type IN ('easter_egg', 'hobby_project')),
  icon          TEXT,                   -- icon for the floating reveal (easter_egg type only)
  is_visible    INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Rotating quotes per dictionary entry (2-3 each, picked randomly
-- on each hit so repeat visits feel fresh). Separate table rather
-- than a JSON blob column so admin portal can add/remove/edit
-- individual quotes without rewriting the whole entry.
CREATE TABLE dictionary_quotes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  dictionary_entry_id INTEGER NOT NULL REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  quote               TEXT NOT NULL,
  sort_order          INTEGER NOT NULL DEFAULT 0
);

-- Rare "alt-response" lines shown after several consecutive misses.
-- Separate table (not hardcoded) so you can add more over time too.
CREATE TABLE miss_responses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  text        TEXT NOT NULL,
  response_tier TEXT NOT NULL DEFAULT 'common'
                  CHECK (response_tier IN ('common', 'rare')),
  -- 'common' = standard dry deadpan line, shown on most misses
  -- 'rare'   = shown after ~5 consecutive misses
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_dictionary_entries_word ON dictionary_entries(word);
CREATE INDEX idx_hobby_projects_sort ON hobby_projects(sort_order);
CREATE INDEX idx_socials_sort ON socials(sort_order);
