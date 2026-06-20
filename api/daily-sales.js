import sql from './_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { from, to } = req.query;
    let rows;
    if (from && to) {
      rows = await sql`SELECT * FROM daily_sales WHERE date >= ${from} AND date <= ${to} ORDER BY date DESC`;
    } else {
      rows = await sql`SELECT * FROM daily_sales ORDER BY date DESC LIMIT 200`;
    }
    return res.json(rows);
  }
  if (req.method === 'PUT') {
    const { date, sales_product_id, count } = req.body;
    const rows = await sql`
      INSERT INTO daily_sales (date, sales_product_id, count)
      VALUES (${date}, ${sales_product_id}, ${count})
      ON CONFLICT (date, sales_product_id) DO UPDATE SET count = ${count}
      RETURNING *
    `;
    return res.json(rows[0]);
  }
  res.status(405).json({ error: 'Method not allowed' });
}
