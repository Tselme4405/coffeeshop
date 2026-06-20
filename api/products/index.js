import sql from '../_db.js';

function parseSize(unit) {
  const m = String(unit || '').match(/([\d.]+)\s*(kg|g|l|ml|ш|oz)?/i);
  let n = m ? parseFloat(m[1]) : 1;
  let u = (m && m[2] ? m[2] : 'ш').toLowerCase();
  if (u === 'kg') n *= 1000;
  if (u === 'l') n *= 1000;
  if (!n || isNaN(n)) n = 1;
  return n;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM products ORDER BY created_at DESC`;
    return res.json(rows);
  }
  if (req.method === 'POST') {
    const { id, name, cat, group, unit, price, qty, min, img } = req.body;
    const open = parseSize(unit);
    const rows = await sql`
      INSERT INTO products (id, name, cat, "group", unit, price, qty, min, img, "open")
      VALUES (${id}, ${name}, ${cat}, ${group || null}, ${unit || '1ш'}, ${price || 0}, ${qty || 0}, ${min || 5}, ${img || null}, ${open})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }
  res.status(405).json({ error: 'Method not allowed' });
}
