import sql from './db.js';

async function setup() {
  console.log('Creating tables...');

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "group" TEXT NOT NULL DEFAULT 'raw',
      tint TEXT NOT NULL DEFAULT '#666'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cat TEXT REFERENCES categories(id),
      "group" TEXT,
      unit TEXT NOT NULL DEFAULT '1ш',
      price INTEGER NOT NULL DEFAULT 0,
      qty INTEGER NOT NULL DEFAULT 0,
      min INTEGER NOT NULL DEFAULT 5,
      img TEXT,
      "open" REAL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS moves (
      id TEXT PRIMARY KEY,
      pid TEXT REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('in', 'out')),
      delta INTEGER NOT NULL,
      at BIGINT NOT NULL,
      who TEXT DEFAULT 'Гар оруулга'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sales_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      size TEXT,
      price INTEGER NOT NULL DEFAULT 0,
      tint TEXT DEFAULT '#666',
      base INTEGER DEFAULT 0,
      img TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sales_recipes (
      id SERIAL PRIMARY KEY,
      sales_product_id TEXT REFERENCES sales_products(id) ON DELETE CASCADE,
      pid TEXT REFERENCES products(id) ON DELETE CASCADE,
      amount REAL NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_sales (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      sales_product_id TEXT REFERENCES sales_products(id) ON DELETE CASCADE,
      count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(date, sales_product_id)
    )
  `;

  console.log('All tables created.');
}

setup().catch((err) => { console.error(err); process.exit(1); });
