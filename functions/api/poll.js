// ============================================================
// /api/poll — 👁️සේ poll vote API
//
// GET  /api/poll  → returns all vote counts for all questions
// POST /api/poll  → increments a vote for one question/choice
// ============================================================

export async function onRequest(context) {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // ── GET: return all vote counts ───────────────────────────
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        'SELECT question_id, choice, count FROM poll_votes ORDER BY question_id'
      ).all();

      // Shape: { "question-id": { 0: N, 1: M }, ... }
      const data = {};
      for (const row of results) {
        if (!data[row.question_id]) data[row.question_id] = { 0: 0, 1: 0 };
        data[row.question_id][row.choice] = row.count;
      }

      return Response.json(data, { headers });
    } catch (e) {
      console.error('[poll GET]', e);
      return Response.json({ error: 'DB error' }, { status: 500, headers });
    }
  }

  // ── POST: increment one vote ──────────────────────────────
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const { questionId, choice } = body;

      if (
        !questionId ||
        typeof questionId !== 'string' ||
        (choice !== 0 && choice !== 1)
      ) {
        return Response.json({ error: 'Invalid input' }, { status: 400, headers });
      }

      // Sanitise — only allow alphanumeric + hyphens, max 100 chars
      const safeId = questionId.replace(/[^a-z0-9-]/gi, '').substring(0, 100);

      await env.DB.prepare(`
        INSERT INTO poll_votes (question_id, choice, count)
        VALUES (?, ?, 1)
        ON CONFLICT (question_id, choice)
        DO UPDATE SET count = count + 1
      `).bind(safeId, choice).run();

      return Response.json({ success: true }, { headers });
    } catch (e) {
      console.error('[poll POST]', e);
      return Response.json({ error: 'DB error' }, { status: 500, headers });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
}
