// GET /api/dictionary/prefix?q=cof
// Lightweight check used WHILE TYPING (not on submit) to decide
// whether to show a faint "something's here" ghost hint.
// Returns only a boolean + icon, never the fact/quote (no spoilers).

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const prefix = (url.searchParams.get('q') || '').trim().toLowerCase();

  if (!prefix || prefix.length < 2) {
    return Response.json({ matches: false });
  }

  const entry = await env.DB.prepare(
    `SELECT icon FROM dictionary_entries
     WHERE word LIKE ? AND is_visible = 1
     LIMIT 1`
  ).bind(`${prefix}%`).first();

  return Response.json({
    matches: !!entry,
    icon: entry?.icon || null,
  });
}
