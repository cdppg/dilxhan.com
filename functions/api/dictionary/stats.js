// GET /api/dictionary/stats
// Read-only view into lookup_log: most-tried words, hits vs misses.
// Not linked anywhere in the UI — visit directly when you want to
// see what people are typing, to decide what's worth adding next.
//
// Optional query params:
//   ?misses_only=1   only show words that never hit (gaps to fill)
//   ?limit=50        cap result count (default 50, max 200)

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const missesOnly = url.searchParams.get('misses_only') === '1';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  const query = missesOnly
    ? `SELECT word, COUNT(*) as tries, SUM(was_hit) as hits
       FROM lookup_log
       GROUP BY word
       HAVING hits = 0
       ORDER BY tries DESC
       LIMIT ?`
    : `SELECT word, COUNT(*) as tries, SUM(was_hit) as hits
       FROM lookup_log
       GROUP BY word
       ORDER BY tries DESC
       LIMIT ?`;

  const { results } = await env.DB.prepare(query).bind(limit).all();

  return Response.json({
    results,
    note: 'misses_only=1 to see words with zero hits; limit=N to adjust count (max 200).',
  });
}
