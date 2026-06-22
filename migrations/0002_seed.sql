-- ============================================================
-- Seed data — your real content. Add more rows anytime by
-- writing a new migration file (e.g. 0003_add_project.sql)
-- rather than editing this one after it's been run.
-- ============================================================

-- Socials -------------------------------------------------------
INSERT INTO socials (label, url, icon, sort_order) VALUES
  ('Instagram', 'https://instagram.com/itsdilxhan', 'instagram', 1),
  ('TikTok',    'https://tiktok.com/@itsdilxhan',   'tiktok',    2),
  ('Email',     'mailto:sollunga@dilxhan.com',       'email',     3);

-- Hobby projects --------------------------------------------------
-- dictionary_key links to a word below, so typing that word in the
-- palette pulses this tile instead of spawning a floating reveal.
-- meetcute is live; the two Chrome extensions use placeholder URLs
-- until they're published on the store — update `url` once they are.
INSERT INTO hobby_projects (title, description, url, icon, dictionary_key, sort_order) VALUES
  ('meetcute',
   'A little corner of the internet for matchmaking.',
   'https://meetcute.dilxhan.com',
   'heart',
   'meetcute',
   1),
  ('Extension One',
   'A Chrome extension — not yet published to the store.',
   'https://example.com/placeholder-extension-one',
   'puzzle',
   'extensionone',
   2),
  ('Extension Two',
   'Another Chrome extension, also pending store release.',
   'https://example.com/placeholder-extension-two',
   'puzzle',
   'extensiontwo',
   3);

-- Dictionary entries ------------------------------------------------
-- entry_type 'hobby_project' rows MUST have a matching word to the
-- dictionary_key used above. entry_type 'easter_egg' rows are pure
-- discoverable words with no tile of their own.

INSERT INTO dictionary_entries (word, fact, entry_type, icon) VALUES
  ('meetcute', 'meetcute is a matchmaking project — typing this just points you back to its tile.', 'hobby_project', NULL),
  ('extensionone', 'Extension One is still waiting on its Chrome Web Store debut.', 'hobby_project', NULL),
  ('extensiontwo', 'Extension Two — also in the store-review queue of life.', 'hobby_project', NULL),
  ('coffee', 'Coffee beans are technically the seeds of a fruit called a coffee cherry.', 'easter_egg', 'coffee'),
  ('hello', 'You typed hello. The site appreciates manners.', 'easter_egg', 'wave'),
  ('beans', 'There are over 400 varieties of kidney beans worldwide.', 'easter_egg', 'bean'),
  ('dinosaur', 'Some dinosaurs survived — we call them birds now.', 'easter_egg', 'bird'),
  ('forest', 'A mature forest can take centuries to fully regenerate after a major fire.', 'easter_egg', 'tree'),
  ('fire', 'Some forest ecosystems actually depend on periodic fire to stay healthy.', 'easter_egg', 'flame'),
  ('dolphin', 'Dolphins sleep with one half of their brain at a time, eyes half-open.', 'easter_egg', 'dolphin'),
  ('sunrise', 'The sky turns red and orange at sunrise because shorter wavelengths scatter away first.', 'easter_egg', 'sun'),
  ('butterfly', 'A butterfly wing is transparent — color comes from light-scattering scales on top.', 'easter_egg', 'butterfly'),
  ('virus', 'Most viruses are so small that thousands could fit across the width of a human hair.', 'easter_egg', 'virus'),
  ('secret', 'You typed secret looking for a secret. Bold strategy.', 'easter_egg', 'lock'),
  ('surprise', 'Surprise. Thats it. Thats the surprise.', 'easter_egg', 'sparkle'),
  ('love', 'The left ventricle is the strongest part of the heart muscle — it pumps blood to your whole body.', 'easter_egg', 'heart'),
  ('sleep', 'Some animals, like dolphins and certain birds, can sleep with one eye open.', 'easter_egg', 'moon'),
  ('code', 'The first computer bug was, allegedly, an actual moth stuck in a relay back in 1947.', 'easter_egg', 'code'),
  ('music', 'Listening to music releases dopamine, the same chemical involved in food and other rewards.', 'easter_egg', 'music');

-- Quotes (2-3 per entry, rotated randomly on each hit) --------------
INSERT INTO dictionary_quotes (dictionary_entry_id, quote, sort_order) VALUES
  ((SELECT id FROM dictionary_entries WHERE word = 'meetcute'), 'Built for fun. Used for love. Or at least a few good matches.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'meetcute'), 'Somewhere out there, meetcute is making an introduction.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'extensionone'), 'Coming soon to a Chrome Web Store near you.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'extensionone'), 'It works. It just isn''t public yet. Patience.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'extensiontwo'), 'Also waiting in the wings.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'extensiontwo'), 'Two extensions, one developer, zero sleep.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'coffee'), 'Behind every great commit is a questionable amount of caffeine.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'coffee'), 'Coffee: the original async/await.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'hello'), 'Hi. You found the talking part of the website.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'hello'), 'Hello to you too. Try typing something weirder.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'beans'), 'Beans, beans, the musical fruit — you know the rest.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'beans'), 'Legumes: criminally underrated.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'dinosaur'), 'Rawr means I love you in dinosaur, probably.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'dinosaur'), 'Extinction-proof your code, unlike the dinosaurs.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'forest'), 'Touch grass. Or at least look at some.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'forest'), 'This whole site lives in one, technically.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'fire'), 'Careful. Dark mode lit something.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'fire'), 'Everything that burns was once alive.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'dolphin'), 'They were the example. They remain the favorite.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'dolphin'), 'Smarter than most code reviews.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'sunrise'), 'A new day. A fresh set of bugs.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'sunrise'), 'Even the sky has a deploy schedule.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'butterfly'), 'Started as a bug. Became a feature.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'butterfly'), 'Transformation arc, fully patched.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'virus'), 'Spreads faster than good naming conventions.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'virus'), 'Not every infection is a bad thing. Some are just dark mode.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'secret'), 'Shh. You are doing great.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'secret'), 'There are more. Keep typing.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'surprise'), 'Plot twist: there was no plot.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'surprise'), 'You wanted a surprise. Here is the absence of one.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'love'), 'Found some on a portfolio website. Unexpected.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'love'), 'Also the name of a hobby project around here.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'sleep'), 'What this developer does instead of debugging at 2am. Allegedly.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'sleep'), 'Highly recommended. Rarely practiced.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'code'), 'It works. Nobody, including the author, knows exactly why.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'code'), 'Written with love, deployed with hope.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'music'), 'This site has no sound. Use your imagination.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'music'), 'Soundtrack not included. Vibes are.', 2);

-- Miss responses --------------------------------------------------
INSERT INTO miss_responses (text, response_tier, sort_order) VALUES
  ('...nothing here.', 'common', 1),
  ('still nothing.', 'common', 2),
  ('not that one either.', 'common', 3),
  ('try another word.', 'common', 4),
  ('okay, this is just persistence now. respect.', 'rare', 1),
  ('you have typed a lot of words. none of them are it. keep going.', 'rare', 2);
