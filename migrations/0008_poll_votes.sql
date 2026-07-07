-- Migration 0008 — 👁️සේ poll votes table
--
-- Stores running vote counts per question per choice.
-- question_id matches the id field in the QUESTIONS array in animations.js.
-- choice is 0 (first option) or 1 (second option).
-- count is incremented on each vote via ON CONFLICT DO UPDATE.

CREATE TABLE IF NOT EXISTS poll_votes (
  question_id  TEXT    NOT NULL,
  choice       INTEGER NOT NULL CHECK (choice IN (0, 1)),
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (question_id, choice)
);
