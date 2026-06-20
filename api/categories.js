import sql from './_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM categories ORDER BY "group", name`;
    return res.json(rows);
  }
  if (req.method === 'POST') {
    const { id, name, group, tint } = req.body;
    const rows = await sql`
      INSERT INTO categories (id, name, "group", tint)
      VALUES (${id}, ${name}, ${group || 'raw'}, ${tint || '#666'})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }
  res.status(405).json({ error: 'Method not allowed' });
}
