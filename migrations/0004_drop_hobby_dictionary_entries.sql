-- ============================================================
-- Hobby projects are now matched by their TITLE directly
-- (normalized: lowercased, spaces/punctuation stripped) instead
-- of a separate dictionary_key slug. This means:
--   - The dictionary_entries rows with entry_type='hobby_project'
--     are no longer queried by the lookup endpoint — they're dead
--     weight. This migration removes them.
--   - The hobby_projects.dictionary_key column is no longer read
--     by the API (title is used instead) — left in place rather
--     than dropped, since SQLite ALTER TABLE DROP COLUMN support
--     varies and the column being unused is harmless. Safe to
--     ignore/leave blank on future inserts.
--
-- Net effect: adding a new hobby project is now just ONE insert
-- into hobby_projects with a `title` — no second dictionary entry
-- to remember, no slug to keep in sync. Typing the title (in any
-- capitalization/spacing) in the command prompt will automatically
-- pulse that project's tile.
-- ============================================================

DELETE FROM dictionary_quotes
WHERE dictionary_entry_id IN (
  SELECT id FROM dictionary_entries WHERE entry_type = 'hobby_project'
);

DELETE FROM dictionary_entries WHERE entry_type = 'hobby_project';
