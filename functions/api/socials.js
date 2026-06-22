// GET /api/socials
// Returns all visible social links, ordered for display.
// Write endpoints (POST/PUT/DELETE) will be added here later
// when the admin portal is built — same file, same table.

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, label, url, icon, sort_order
     FROM socials
     WHERE is_visible = 1
     ORDER BY sort_order ASC`
  ).all();

  return Response.json(results, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  });
}
