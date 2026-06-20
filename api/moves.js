import sql from './_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM moves ORDER BY at DESC LIMIT 100`;
    return res.json(rows);
  }
  if (req.method === 'POST') {
    const { id, pid, type, delta, at, who } = req.body;
    const rows = await sql`
      INSERT INTO moves (id, pid, type, delta, at, who)
      VALUES (${id}, ${pid}, ${type}, ${delta}, ${at || Date.now()}, ${who || 'Гар оруулга'})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }
  res.status(405).json({ error: 'Method not allowed' });
}
