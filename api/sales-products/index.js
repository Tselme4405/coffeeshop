import sql from '../_db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const products = await sql`SELECT * FROM sales_products ORDER BY name`;
    const recipes = await sql`SELECT * FROM sales_recipes ORDER BY sales_product_id`;
    const result = products.map((p) => ({
      ...p,
      recipe: recipes.filter((r) => r.sales_product_id === p.id).map((r) => ({ pid: r.pid, amount: r.amount })),
    }));
    return res.json(result);
  }
  if (req.method === 'POST') {
    const { id, name, size, price, tint, base, img, recipe } = req.body;
    const rows = await sql`
      INSERT INTO sales_products (id, name, size, price, tint, base, img)
      VALUES (${id}, ${name}, ${size || null}, ${price || 0}, ${tint || '#666'}, ${base || 0}, ${img || null})
      RETURNING *
    `;
    if (recipe?.length) {
      for (const r of recipe) {
        await sql`
          INSERT INTO sales_recipes (sales_product_id, pid, amount)
          VALUES (${id}, ${r.pid}, ${r.amount})
        `;
      }
    }
    return res.status(201).json({ ...rows[0], recipe: recipe || [] });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
