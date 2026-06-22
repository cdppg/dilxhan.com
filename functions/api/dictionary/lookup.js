// GET /api/dictionary/lookup?word=coffee
// Looks up a single word against the dictionary.
//
// Response shapes:
//   HIT (easter_egg):    { hit: true, type: "easter_egg", word, fact, quote, icon }
//   HIT (hobby_project): { hit: true, type: "hobby_project", word, fact, quote }
//   MISS:                { hit: false, message }
//
// "miss_streak" query param (optional, sent by frontend) lets the
// frontend tell us how many consecutive misses the user is on, so
// we can decide whether to serve a rare alt-response. The frontend
// owns the counter (it's just UI state); this endpoint just reacts
// to it for response selection.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const rawWord = (url.searchParams.get('word') || '').trim().toLowerCase();
  const missStreak = parseInt(url.searchParams.get('miss_streak') || '0', 10);

  if (!rawWord) {
    return Response.json({ hit: false, message: 'nothing typed.' }, { status: 400 });
  }

  const entry = await env.DB.prepare(
    `SELECT id, word, fact, entry_type, icon
     FROM dictionary_entries
     WHERE word = ? AND is_visible = 1`
  ).bind(rawWord).first();

  if (!entry) {
    const tier = missStreak >= 5 ? 'rare' : 'common';
    const { results } = await env.DB.prepare(
      `SELECT text FROM miss_responses WHERE response_tier = ? ORDER BY RANDOM() LIMIT 1`
    ).bind(tier).all();

    const message = results[0]?.text || '...nothing here.';
    return Response.json({ hit: false, message });
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
    icon: entry.icon, // only relevant for easter_egg type
  });
}
