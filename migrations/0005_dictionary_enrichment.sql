-- ============================================================
-- Dictionary enrichment — ~55 new easter-egg words across
-- forest/fire/nature, dev humor, food, pop culture (generic,
-- non-IP-specific), random objects, and a few wildcards.
-- Each word: one fact + 2 rotating quotes, cheeky-but-safe tone.
-- ============================================================

INSERT INTO dictionary_entries (word, fact, entry_type, icon) VALUES
  -- Forest / nature (extending the existing theme)
  ('moss', 'Moss has no roots — it absorbs water and nutrients directly through its leaves.', 'easter_egg', 'leaf'),
  ('owl', 'An owl can rotate its neck about 270 degrees without injury.', 'easter_egg', 'bird'),
  ('fox', 'A fox uses its tail like a blanket to keep warm in cold weather.', 'easter_egg', 'tree'),
  ('acorn', 'An oak tree doesn''t produce acorns until it''s about 20 years old.', 'easter_egg', 'leaf'),
  ('wolf', 'Wolves can howl at frequencies that carry for several miles in open terrain.', 'easter_egg', 'moon'),
  ('mushroom', 'The largest known organism on Earth is a fungus network in Oregon.', 'easter_egg', 'mushroom'),
  ('river', 'A river never really stops moving, even when it looks perfectly still.', 'easter_egg', 'wave'),
  ('thunder', 'Thunder is just the sound of air expanding violently after a lightning strike.', 'easter_egg', 'flame'),

  -- Fire / dark-mode adjacent
  ('ash', 'Wood ash is alkaline enough that it was historically used to make soap.', 'easter_egg', 'flame'),
  ('smoke', 'Smoke detectors work by sensing particles, not heat — that''s why steam sets them off too.', 'easter_egg', 'flame'),
  ('phoenix', 'The phoenix myth shows up, in some form, in Greek, Egyptian, and Chinese folklore independently.', 'easter_egg', 'flame'),
  ('candle', 'A candle flame is mostly hollow — the brightest part is actually unburned soot glowing.', 'easter_egg', 'flame'),
  ('spark', 'A single spark of static electricity can reach thousands of volts, briefly.', 'easter_egg', 'sparkle'),

  -- Dev humor
  ('bug', 'The term "bug" predates computers — Edison used it in his notebooks in the 1870s.', 'easter_egg', 'code'),
  ('git', 'Linus Torvalds named Git after himself, by his own admission — "I''m an egotistical bastard."', 'easter_egg', 'code'),
  ('localhost', '127.0.0.1 has been called home more times than any actual address.', 'easter_egg', 'code'),
  ('semicolon', 'JavaScript will often forgive a missing semicolon. Most relationships will not.', 'easter_egg', 'code'),
  ('recursion', 'To understand recursion, you must first understand recursion.', 'easter_egg', 'code'),
  ('undefined', 'In JavaScript, undefined and null walk into a bar. Only one of them exists.', 'easter_egg', 'code'),
  ('merge', 'Most merge conflicts are really just two people being right at the same time.', 'easter_egg', 'code'),
  ('cache', 'There are only two hard problems in computer science: cache invalidation and naming things.', 'easter_egg', 'code'),
  ('ctrl', 'Ctrl+Z has undone more bad decisions than therapy.', 'easter_egg', 'code'),
  ('deploy', 'Friday deploys are less a technical decision and more a personality trait.', 'easter_egg', 'code'),

  -- Food
  ('pizza', 'Pineapple on pizza was popularized in Canada, not Hawaii, in the 1960s.', 'easter_egg', 'coffee'),
  ('tea', 'Tea is the most consumed drink in the world after water.', 'easter_egg', 'coffee'),
  ('honey', 'Honey found in ancient Egyptian tombs has been confirmed still edible after 3000 years.', 'easter_egg', 'bean'),
  ('chocolate', 'Chocolate was originally consumed as a bitter drink, not a sweet solid.', 'easter_egg', 'coffee'),
  ('avocado', 'Avocados are technically a single-seeded berry, botanically speaking.', 'easter_egg', 'leaf'),
  ('toast', 'The phrase "the best thing since sliced bread" dates back to 1920s bread-slicing machines.', 'easter_egg', 'coffee'),
  ('spice', 'Black pepper was once so valuable it was used as currency to pay rent and taxes.', 'easter_egg', 'flame'),

  -- Pop culture (generic, non-IP)
  ('meme', 'The word "meme" predates the internet — coined by Richard Dawkins in 1976.', 'easter_egg', 'sparkle'),
  ('emoji', 'The first emoji set was designed in Japan in 1999 for pagers.', 'easter_egg', 'sparkle'),
  ('selfie', '"Selfie" was Oxford Dictionary''s Word of the Year in 2013.', 'easter_egg', 'sparkle'),
  ('vinyl', 'Vinyl records nearly disappeared in the 2000s, then outsold CDs again by the 2020s.', 'easter_egg', 'music'),
  ('arcade', 'The golden age of arcades peaked around 1982, before home consoles took over.', 'easter_egg', 'code'),
  ('podcast', 'The word "podcast" is a blend of "iPod" and "broadcast," coined in 2004.', 'easter_egg', 'music'),

  -- Random objects
  ('umbrella', 'Umbrellas were originally a status symbol for sun protection, not rain, in ancient times.', 'easter_egg', 'sun'),
  ('mirror', 'Before glass mirrors, polished obsidian and metal were used to see one''s reflection.', 'easter_egg', 'sparkle'),
  ('key', 'The oldest known lock-and-key mechanism is about 4,000 years old, found in Iraq.', 'easter_egg', 'lock'),
  ('clock', 'Mechanical clocks didn''t have minute hands until the late 1600s — hours were enough.', 'easter_egg', 'moon'),
  ('balloon', 'The first rubber balloons were sold in London in 1824.', 'easter_egg', 'sparkle'),
  ('paperclip', 'The standard paperclip design hasn''t meaningfully changed since 1899.', 'easter_egg', 'code'),
  ('socks', 'Mismatched socks were a deliberate fashion trend at least twice in the last 40 years.', 'easter_egg', 'bean'),
  ('ladder', 'A ladder leaning at the correct angle is safer at roughly 75 degrees from the ground.', 'easter_egg', 'code'),

  -- Wildcards / pure whimsy
  ('banana', 'Bananas are botanically berries, while strawberries technically are not.', 'easter_egg', 'leaf'),
  ('penguin', 'Penguins propose with a pebble in some species — it''s called a "pebbling" ritual.', 'easter_egg', 'bird'),
  ('ghost', 'The "boo" sound associated with ghosts only became common in English in the 1800s.', 'easter_egg', 'moon'),
  ('robot', 'The word "robot" comes from the Czech word "robota," meaning forced labor.', 'easter_egg', 'code'),
  ('alien', 'The Drake Equation, used to estimate alien civilizations, was written on a chalkboard in 1961.', 'easter_egg', 'sparkle'),
  ('pirate', 'Real pirates rarely buried treasure — it''s mostly a literary invention from Treasure Island.', 'easter_egg', 'lock'),
  ('dragon', 'Dragon myths appear independently in nearly every ancient culture, often linked to dinosaur fossils.', 'easter_egg', 'flame'),
  ('unicorn', 'The unicorn was considered a real, undiscovered animal by European naturalists until the 1600s.', 'easter_egg', 'sparkle'),
  ('time', 'Time zones weren''t standardized worldwide until railways made local solar time impractical.', 'easter_egg', 'moon'),
  ('luck', '"Break a leg" likely comes from old theater superstition about jinxing a performance by wishing luck.', 'easter_egg', 'sparkle'),
  ('rainbow', 'A rainbow is actually a full circle — we only see an arc because the ground gets in the way.', 'easter_egg', 'sun');

-- Quotes — 2 per entry, rotated randomly on each hit ------------------

INSERT INTO dictionary_quotes (dictionary_entry_id, quote, sort_order) VALUES
  ((SELECT id FROM dictionary_entries WHERE word = 'moss'), 'Moss: proof that doing less can still mean thriving.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'moss'), 'Grows without trying. Relatable.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'owl'), 'Night shift, but make it majestic.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'owl'), 'Judging you silently from a branch.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'fox'), 'Sly by reputation, cozy by tail.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'fox'), 'The original "wrap yourself in your own merch."', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'acorn'), 'Twenty years of patience for one nut. Respect.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'acorn'), 'Small now. Forest later.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'wolf'), 'Group chat, but it echoes for miles.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'wolf'), 'Howling: the original long-distance call.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'mushroom'), 'Quietly the biggest thing on Earth. No big deal.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'mushroom'), 'Underground network energy, before it was cool.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'river'), 'Always moving, rarely in a rush.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'river'), 'The original streaming service.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'thunder'), 'Loud first impression, no follow-through.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'thunder'), 'All bark, mostly air.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'ash'), 'What''s left after a good idea burns too bright.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'ash'), 'Soft, grey, and weirdly useful.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'smoke'), 'No fire required, apparently.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'smoke'), 'Sets off alarms for sport.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'phoenix'), 'The original "delete and re-deploy."', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'phoenix'), 'Burns down, comes back with better branding.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'candle'), 'Mostly hollow, fully dramatic.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'candle'), 'Ambiance''s favorite fire hazard.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'spark'), 'Brief, bright, occasionally a fire hazard.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'spark'), 'Thousands of volts, zero warning.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'bug'), 'Older than computers. Pettier than ever.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'bug'), 'It''s not a bug, it''s an undocumented feature.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'git'), 'Named after its creator''s self-assessment. Bold.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'git'), 'git commit -m "fix" — a thousand times a day.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'localhost'), 'The most visited address that goes nowhere.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'localhost'), '127.0.0.1: home is where the dev server is.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'semicolon'), 'JavaScript forgives. Your reviewer will not.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'semicolon'), 'Small mark, big argument in code review.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'recursion'), 'See: recursion.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'recursion'), 'A function that called itself out.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'undefined'), 'Not null. Not zero. Just vibes.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'undefined'), 'undefined is not a function, but it sure feels like one some days.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'merge'), 'Two right answers walk into a conflict.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'merge'), 'Resolved with slightly too much confidence.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'cache'), 'Hard problem #1. Naming things is #2.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'cache'), 'Stale data''s favorite hiding spot.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'ctrl'), 'Undoes mistakes faster than most apologies.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'ctrl'), 'The real most-used key on the keyboard.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'deploy'), 'Friday at 4:58pm. Bold strategy.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'deploy'), 'Ship it and pray, the developer''s prayer.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'pizza'), 'A circle, cut into triangles, served in a square box.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'pizza'), 'Pineapple discourse: still ongoing, still unresolved.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'tea'), 'Hot leaf juice, taken very seriously.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'tea'), 'The world''s quietest addiction.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'honey'), 'Doesn''t expire. Outlives empires, apparently.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'honey'), 'Bees: tiny, efficient, immortal-adjacent products.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'chocolate'), 'Started bitter. Got better PR over time.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'chocolate'), 'Once a drink. Now a love language.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'avocado'), 'A berry with a personal brand.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'avocado'), 'Ripens on its own schedule, not yours.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'toast'), 'The bar every good invention gets compared to.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'toast'), 'Bread, but with ambition.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'spice'), 'Once worth more than gold. Still worth the sneeze.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'spice'), 'Paid rent in pepper. Imagine explaining that today.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'meme'), 'Older than the internet. Cooler with it.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'meme'), 'A unit of culture, technically. A unit of chaos, actually.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'emoji'), 'Started on pagers. Ended up running group chats.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'emoji'), 'A whole language, mostly faces and food.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'selfie'), 'Word of the Year, 2013. Habit of forever.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'selfie'), 'The arm''s most repetitive workout.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'vinyl'), 'Declared dead. Came back anyway.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'vinyl'), 'Warmer sound, heavier shelf.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'arcade'), 'Quarters in, dopamine out.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'arcade'), 'Peaked in 1982. Never told anyone.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'podcast'), 'A blend word for a blend of opinions.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'podcast'), 'Two people talking, three hours, no editor.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'umbrella'), 'Started as sun protection. Got rebranded by rain.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'umbrella'), 'Inverts the moment you need it most.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'mirror'), 'Tells the truth. Reverses your left and right anyway.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'mirror'), 'Polished rock, ancient version. Same anxiety.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'key'), '4,000 years old and still the best metaphor for access.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'key'), 'Small object, disproportionate panic when lost.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'clock'), 'Took centuries to admit minutes mattered.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'clock'), 'Ticking with quiet judgment since forever.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'balloon'), '1824 called. It wants its invention credited.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'balloon'), 'Full of air and unreasonable optimism.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'paperclip'), 'Perfect design, 1899. Untouched since.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'paperclip'), 'Holds papers. Also doubles as everything else.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'socks'), 'Mismatched on purpose, allegedly.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'socks'), 'The drawer''s most chaotic resident.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'ladder'), '75 degrees of trust in physics.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'ladder'), 'One rung closer to a bad decision.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'banana'), 'A berry, technically. A punchline, culturally.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'banana'), 'Peels itself into comedy since antiquity.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'penguin'), 'Proposes with a pebble. Lower the bar, humans.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'penguin'), 'Dressed for a meeting it''s never attending.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'ghost'), '"Boo" is younger than you''d think.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'ghost'), 'Haunting since before sound effects existed.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'robot'), 'Czech for "forced labor." Tell your smart fridge.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'robot'), 'Beep boop, but with a complicated etymology.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'alien'), 'An equation on a chalkboard, still unanswered.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'alien'), 'Probably out there. Definitely not texting back.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'pirate'), 'Buried treasure: mostly fiction''s fault.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'pirate'), 'X marks the spot. The spot is usually a library.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'dragon'), 'Possibly just a really big fossil and a good imagination.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'dragon'), 'Every culture invented one independently. No notes shared.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'unicorn'), 'Taken seriously by scientists well into the 1600s.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'unicorn'), 'A horse with one good marketing decision.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'time'), 'Standardized late, argued about constantly since.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'time'), 'Flies. Also occasionally just a flat circle.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'luck'), 'A leg-breaking superstition, somehow about good fortune.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'luck'), 'What you call skill when you don''t want to explain it.', 2),

  ((SELECT id FROM dictionary_entries WHERE word = 'rainbow'), 'A full circle, technically. The ground just won''t admit it.', 1),
  ((SELECT id FROM dictionary_entries WHERE word = 'rainbow'), 'No pot of gold. Just light being dramatic.', 2);
