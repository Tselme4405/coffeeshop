import express from 'express';
import cors from 'cors';
import sql from './db.js';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// ─── Categories ──────────────────────────────────────────────

app.get('/api/categories', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM categories ORDER BY "group", name`;
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { id, name, group, tint } = req.body;
    const rows = await sql`
      INSERT INTO categories (id, name, "group", tint)
      VALUES (${id}, ${name}, ${group || 'raw'}, ${tint || '#666'})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Products ────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM products ORDER BY created_at DESC`;
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const { id, name, cat, group, unit, price, qty, min, img } = req.body;
    const open = parseSize(unit);
    const rows = await sql`
      INSERT INTO products (id, name, cat, "group", unit, price, qty, min, img, "open")
      VALUES (${id}, ${name}, ${cat}, ${group || null}, ${unit || '1ш'}, ${price || 0}, ${qty || 0}, ${min || 5}, ${img || null}, ${open})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
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
      WHERE id = ${req.params.id}
      RETURNING *
    `;
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await sql`DELETE FROM products WHERE id = ${req.params.id}`;
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Moves ───────────────────────────────────────────────────

app.get('/api/moves', async (req, res) => {
  try {
    const rows = await sql`SELECT * FROM moves ORDER BY at DESC LIMIT 100`;
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/moves', async (req, res) => {
  try {
    const { id, pid, type, delta, at, who } = req.body;
    const rows = await sql`
      INSERT INTO moves (id, pid, type, delta, at, who)
      VALUES (${id}, ${pid}, ${type}, ${delta}, ${at || Date.now()}, ${who || 'Гар оруулга'})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Sales Products ──────────────────────────────────────────

app.get('/api/sales-products', async (req, res) => {
  try {
    const products = await sql`SELECT * FROM sales_products ORDER BY name`;
    const recipes = await sql`SELECT * FROM sales_recipes ORDER BY sales_product_id`;
    const result = products.map((p) => ({
      ...p,
      recipe: recipes.filter((r) => r.sales_product_id === p.id).map((r) => ({ pid: r.pid, amount: r.amount })),
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sales-products', async (req, res) => {
  try {
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
    res.status(201).json({ ...rows[0], recipe: recipe || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Daily Sales ─────────────────────────────────────────────

app.get('/api/daily-sales', async (req, res) => {
  try {
    const { from, to } = req.query;
    let rows;
    if (from && to) {
      rows = await sql`SELECT * FROM daily_sales WHERE date >= ${from} AND date <= ${to} ORDER BY date DESC`;
    } else {
      rows = await sql`SELECT * FROM daily_sales ORDER BY date DESC LIMIT 200`;
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/daily-sales', async (req, res) => {
  try {
    const { date, sales_product_id, count } = req.body;
    const rows = await sql`
      INSERT INTO daily_sales (date, sales_product_id, count)
      VALUES (${date}, ${sales_product_id}, ${count})
      ON CONFLICT (date, sales_product_id) DO UPDATE SET count = ${count}
      RETURNING *
    `;
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Helpers ─────────────────────────────────────────────────

function parseSize(unit) {
  const m = String(unit || '').match(/([\d.]+)\s*(kg|g|l|ml|ш|oz)?/i);
  let n = m ? parseFloat(m[1]) : 1;
  let u = (m && m[2] ? m[2] : 'ш').toLowerCase();
  if (u === 'kg') { n *= 1000; }
  if (u === 'l') { n *= 1000; }
  if (!n || isNaN(n)) n = 1;
  return n;
}

// ─── Start ───────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Coffee Shop API running on http://localhost:${PORT}`);
});
