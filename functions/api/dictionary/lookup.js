// GET /api/dictionary/lookup?word=coffee
// Looks up a single word against the dictionary.
//
// Response shapes:
//   HIT (easter_egg):    { hit: true, type: "easter_egg", word, fact, quote, icon }
//   HIT (hobby_project): { hit: true, type: "hobby_project", word, fact, quote, dictionaryKey }
//   HIT (animation):     { hit: true, type: "animation", word, fact, animationKey }
//   MISS:                { hit: false, message }
//
// MATCHING STRATEGY (important — this is what makes new projects
// work automatically, with zero manual bookkeeping):
//   1. Hobby projects are matched by their TITLE, normalized
//      (lowercased, punctuation/spaces stripped) — e.g. typing
//      "Extension One" or "extension-one" or "EXTENSION ONE" all
//      normalize to "extensionone" and match the project titled
//      "Extension One". There is no separate slug to keep in sync;
//      whatever you type into the `title` column when you add a
//      project IS the lookup key, automatically.
//   2. If no hobby project matches, fall back to dictionary_entries
//      for pure easter eggs (also matched on a normalized word).
//
// "miss_streak" query param (optional, sent by frontend) lets the
// frontend tell us how many consecutive misses the user is on, so
// we can decide whether to serve a rare alt-response.
//
// Every lookup (hit or miss) is logged to lookup_log.

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, ''); // strip spaces, punctuation, everything but letters/digits
}

function logLookup(env, ctx, word, wasHit, entryType) {
  const promise = env.DB.prepare(
    `INSERT INTO lookup_log (word, was_hit, entry_type) VALUES (?, ?, ?)`
  ).bind(word, wasHit ? 1 : 0, entryType || null).run()
    .catch((err) => {
      // Logging failures should never break the actual lookup response.
      console.error('lookup_log insert failed', err);
    });

  if (ctx && typeof ctx.waitUntil === 'function') {
    ctx.waitUntil(promise);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawInput = (url.searchParams.get('word') || '').trim();
  const normalizedInput = normalize(rawInput);
  const missStreak = parseInt(url.searchParams.get('miss_streak') || '0', 10);

  if (!normalizedInput) {
    return Response.json({ hit: false, message: 'nothing typed.' }, { status: 400 });
  }

  // 1. Try matching a hobby project by normalized title — this is
  // what makes new projects "just work" with no manual key to add.
  const { results: projects } = await env.DB.prepare(
    `SELECT id, title FROM hobby_projects WHERE is_visible = 1`
  ).all();

  const matchedProject = projects.find((p) => normalize(p.title) === normalizedInput);

  if (matchedProject) {
    logLookup(env, context, normalizedInput, true, 'hobby_project');
    return Response.json({
      hit: true,
      type: 'hobby_project',
      word: rawInput,
      dictionaryKey: normalize(matchedProject.title),
      fact: null,
      quote: null,
    });
  }

  // 2. Fall back to the easter-egg dictionary, matched the same way.
  const { results: entries } = await env.DB.prepare(
    `SELECT id, word, fact, entry_type, icon, animation_key FROM dictionary_entries WHERE is_visible = 1`
  ).all();

  const entry = entries.find((e) => normalize(e.word) === normalizedInput);

  if (!entry) {
    logLookup(env, context, normalizedInput, false, null);

    const tier = missStreak >= 5 ? 'rare' : 'common';
    const { results } = await env.DB.prepare(
      `SELECT text FROM miss_responses WHERE response_tier = ? ORDER BY RANDOM() LIMIT 1`
    ).bind(tier).all();

    const message = results[0]?.text || '...nothing here.';
    return Response.json({ hit: false, message });
  }

  logLookup(env, context, normalizedInput, true, entry.entry_type);

  // Animation entries don't need a quote — the fact line is shown
  // briefly in the typewriter slot, then the animation fires.
  if (entry.entry_type === 'animation') {
    return Response.json({
      hit: true,
      type: 'animation',
      word: entry.word,
      fact: entry.fact,
      animationKey: entry.animation_key,
    });
  }

  const { results: quotes } = await env.DB.prepare(
    `SELECT quote FROM dictionary_quotes WHERE dictionary_entry_id = ? ORDER BY RANDOM() LIMIT 1`
  ).bind(entry.id).all();

  const quote = quotes[0]?.quote || null;

  return Response.json({
    hit: true,
    type: entry.entry_type, // 'easter_egg' | 'hobby_project'
    word: entry.word,
    fact: entry.fact,
    quote,
    icon: entry.icon,
  });
}
