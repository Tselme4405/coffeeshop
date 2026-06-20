const API = '/api';

const DEFAULT_GROUPS = [
  { id: 'raw',    name: 'Түүхий эд' },
  { id: 'supply', name: 'Дагалдах хэрэгсэл' },
];

// Parse a container/unit label into a base amount + base unit.
//   "700ml" -> {amt:700, base:'ml'}   "1L" -> {amt:1000, base:'ml'}
//   "2kg"  -> {amt:2000, base:'g'}    "50ш" -> {amt:50, base:'ш'}
function parseSize(unit) {
  const m = String(unit || '').match(/([\d.]+)\s*(kg|g|l|ml|ш|oz)?/i);
  let n = m ? parseFloat(m[1]) : 1;
  let u = (m && m[2] ? m[2] : 'ш').toLowerCase();
  if (u === 'kg') { n *= 1000; u = 'g'; }
  if (u === 'l')  { n *= 1000; u = 'ml'; }
  if (!n || isNaN(n)) n = 1;
  return { amt: n, base: u };
}
const BASE_LABEL = { g: 'гр', ml: 'мл', 'ш': 'ш', oz: 'oz' };
const baseLabel = (unit) => BASE_LABEL[parseSize(unit).base] || parseSize(unit).base;
window.parseSize = parseSize; window.baseLabel = baseLabel;

const InvCtx = React.createContext(null);

function InvProvider({ children }) {
  const [categories, setCategories] = React.useState([]);
  const [products, setProducts]     = React.useState([]);
  const [moves, setMoves]           = React.useState([]);
  const [loading, setLoading]       = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch(API + '/categories').then((r) => r.json()),
      fetch(API + '/products').then((r) => r.json()),
      fetch(API + '/moves').then((r) => r.json()),
    ]).then(([cats, prods, mvs]) => {
      setCategories(cats);
      setProducts(prods.map((p) => ({ ...p, open: p.open ?? parseSize(p.unit).amt })));
      setMoves(mvs);
      setLoading(false);
    }).catch((err) => { console.error('API fetch error:', err); setLoading(false); });
  }, []);

  const catById = React.useMemo(() => {
    const m = {}; categories.forEach((c) => (m[c.id] = c)); return m;
  }, [categories]);

  // A product's top-level group: explicit `group`, else derived from its cat.
  const groupOf = (p) => p.group || catById[p.cat]?.group || 'raw';

  const addMove = (pid, delta, who = 'Гар оруулга') => {
    const move = {
      id: 'm' + Date.now() + Math.random().toString(36).slice(2, 6),
      pid, type: delta >= 0 ? 'in' : 'out', delta, at: Date.now(), who,
    };
    setMoves((ms) => [move, ...ms]);
    fetch(API + '/moves', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(move),
    }).catch(console.error);
  };

  const syncProduct = (pid, updates) => {
    fetch(API + '/products/' + pid, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(console.error);
  };

  const bump = (pid, by) => {
    setProducts((ps) => ps.map((p) => {
      if (p.id !== pid) return p;
      const next = Math.max(0, p.qty + by);
      if (next === p.qty) return p;
      addMove(pid, next - p.qty);
      syncProduct(pid, { qty: next });
      return { ...p, qty: next };
    }));
  };

  const setQty = (pid, qty) => {
    setProducts((ps) => ps.map((p) => {
      if (p.id !== pid) return p;
      const next = Math.max(0, Number(qty) || 0);
      if (next === p.qty) return p;
      addMove(pid, next - p.qty);
      syncProduct(pid, { qty: next });
      return { ...p, qty: next };
    }));
  };

  // Deduct `amount` base units (g/ml/ш) for a sale, rolling over containers.
  const consume = (pid, amount, who = 'Борлуулалт') => {
    if (!(amount > 0)) return;
    setProducts((ps) => ps.map((p) => {
      if (p.id !== pid) return p;
      const size = parseSize(p.unit).amt || 1;
      let open = p.open ?? size, qty = p.qty, need = amount;
      const startQty = qty;
      let guard = 0;
      while (need > 0 && qty > 0 && guard++ < 100000) {
        if (need <= open) { open -= need; need = 0; }
        else { need -= open; qty -= 1; open = qty > 0 ? size : 0; }
      }
      if (startQty - qty > 0) addMove(pid, -(startQty - qty), who);
      syncProduct(pid, { qty, open });
      return { ...p, qty, open };
    }));
  };

  const replenish = (pid, amount) => {
    if (!(amount > 0)) return;
    setProducts((ps) => ps.map((p) => {
      if (p.id !== pid) return p;
      const size = parseSize(p.unit).amt || 1;
      let open = (p.open ?? size) + amount, qty = p.qty;
      while (open > size) { open -= size; qty += 1; }
      syncProduct(pid, { qty, open });
      return { ...p, qty, open };
    }));
  };

  const addProduct = (data) => {
    const id = 'p' + Date.now();
    const product = {
      id,
      name:  data.name?.trim() || 'Шинэ бараа',
      cat:   data.cat || null,
      group: data.group || DEFAULT_GROUPS[0].id,
      unit:  data.unit  || '1ш',
      price: Number(data.price) || 0,
      qty:   Number(data.qty)   || 0,
      min:   Number(data.min)   || 5,
      img:   data.img   || null,
      open:  parseSize(data.unit || '1ш').amt,
    };
    setProducts((ps) => [product, ...ps]);
    if (product.qty > 0) addMove(id, product.qty, 'Шинээр бүртгэв');
    fetch(API + '/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    }).catch(console.error);
  };

  const removeProduct = (pid) => {
    setProducts((ps) => ps.filter((p) => p.id !== pid));
    fetch(API + '/products/' + pid, { method: 'DELETE' }).catch(console.error);
  };

  const value = { groups: DEFAULT_GROUPS, categories, catById, groupOf, products, moves, loading, bump, setQty, consume, replenish, addProduct, removeProduct };
  return <InvCtx.Provider value={value}>{children}</InvCtx.Provider>;
}

const useInv = () => React.useContext(InvCtx);

// Currency formatter — Mongolian tögrög, no decimals.
const fmtMNT = (n) => new Intl.NumberFormat('mn-MN').format(Math.round(n)) + '₮';

// Relative time helper for the movement feed.
const fmtAgo = (ts) => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return s + 'с өмнө';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' мин өмнө';
  const h = Math.round(m / 60);
  if (h < 24) return h + ' цаг өмнө';
  return Math.round(h / 24) + ' өдөр өмнө';
};

// Per-product art block. If the product has an `img` URL/data-URI, render the
// photo (object-fit: contain on a tinted backdrop so transparent/white-bg
// product shots look like merchandise). Otherwise fall back to a hash-tinted
// stripe placeholder so seeded items without art still look intentional.
function ProductArt({ product, cat, height = 160, big = false }) {
  const tint = cat?.tint || '#666';
  if (product.img) {
    return (
      <div style={{
        position: 'relative', width: '100%', height, overflow: 'hidden',
        background: '#fafafa',
      }}>
        <img src={product.img} alt={product.name}
             style={{
               position: 'absolute', inset: 0, width: '100%', height: '100%',
               objectFit: 'contain', objectPosition: 'center',
               padding: 10, boxSizing: 'border-box',
               display: 'block',
             }} />
        <div style={{
          position: 'absolute', left: 10, bottom: 8,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          color: '#fff', letterSpacing: '.04em',
          background: 'rgba(15,18,24,.78)', padding: '2px 7px', borderRadius: 4,
        }}>{product.unit}</div>
      </div>
    );
  }
  // Hash-based hue jitter so cards of the same category don't all look identical.
  let h = 0; for (let i = 0; i < product.id.length; i++) h = (h * 31 + product.id.charCodeAt(i)) >>> 0;
  const rot = (h % 90) - 45;
  const initial = (product.name.match(/[А-ЯA-Z]/) || [product.name[0] || '?'])[0];
  return (
    <div style={{
      position: 'relative', width: '100%', height, overflow: 'hidden',
      background: `linear-gradient(135deg, ${tint}33, ${tint}10)`,
    }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .35 }}>
        <defs>
          <pattern id={`s-${product.id}`} width="6" height="6" patternUnits="userSpaceOnUse"
                   patternTransform={`rotate(${rot})`}>
            <line x1="0" y1="0" x2="0" y2="6" stroke={tint} strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#s-${product.id})`} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: big ? 64 : 36,
        color: tint, opacity: .55, letterSpacing: -1,
      }}>{initial}</div>
      <div style={{
        position: 'absolute', left: 10, bottom: 8, fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10, color: 'rgba(255,255,255,.55)', letterSpacing: '.04em',
      }}>{product.unit}</div>
    </div>
  );
}

Object.assign(window, { InvProvider, InvCtx, useInv, fmtMNT, fmtAgo, ProductArt });
