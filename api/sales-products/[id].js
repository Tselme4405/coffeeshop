import sql from '../_db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    await sql`DELETE FROM sales_recipes WHERE sales_product_id = ${id}`;
    await sql`DELETE FROM sales_products WHERE id = ${id}`;
    return res.json({ ok: true });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
