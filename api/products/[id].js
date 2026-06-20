import sql from '../_db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name, cat, group, unit, price, qty, min, img, open } = req.body;
    const rows = await sql`
      UPDATE products SET
        name = COALESCE(${name ?? null}, name),
        cat = COALESCE(${cat ?? null}, cat),
        "group" = COALESCE(${group ?? null}, "group"),
        unit = COALESCE(${unit ?? null}, unit),
        price = COALESCE(${price ?? null}, price),
        qty = COALESCE(${qty ?? null}, qty),
        min = COALESCE(${min ?? null}, min),
        img = COALESCE(${img ?? null}, img),
        "open" = COALESCE(${open ?? null}, "open")
      WHERE id = ${id}
      RETURNING *
    `;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json(rows[0]);
  }
  if (req.method === 'DELETE') {
    await sql`DELETE FROM products WHERE id = ${id}`;
    return res.json({ ok: true });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
