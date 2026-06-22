// GET /api/hobby-projects
// Returns all visible hobby project tiles, ordered for display.

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, title, description, url, icon, dictionary_key, sort_order
     FROM hobby_projects
     WHERE is_visible = 1
     ORDER BY sort_order ASC`
  ).all();

  return Response.json(results, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
