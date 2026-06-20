// Борлуулалтын бүртгэл — shake / smoothie зэрэг бэлэн бүтээгдэхүүний
// өдөр тутмын зарагдсан тоог бүртгэдэг дэлгэц. Бараа материалын бүртгэлтэй
// ижил визуал хэлээр зохиосон.

// ---- date helpers (local time, тогтвортой түлхүүр) -----------------------
const _two = (n) => String(n).padStart(2, '0');
const dKey = (d) => `${d.getFullYear()}-${_two(d.getMonth() + 1)}-${_two(d.getDate())}`;
const dFrom = (key) => {const [y, m, day] = key.split('-').map(Number);return new Date(y, m - 1, day);};
const dAdd = (key, n) => {const d = dFrom(key);d.setDate(d.getDate() + n);return dKey(d);};
const MN_WEEK = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
const MN_MONTHS = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
const dayNum = (key) => String(dFrom(key).getDate());
const weekday = (key) => MN_WEEK[dFrom(key).getDay()];
const longDate = (key) => {const d = dFrom(key);return `${MN_MONTHS[d.getMonth()]} ${d.getDate()}, ${MN_WEEK[d.getDay()]}`;};

const SALES_API = 'http://localhost:3001/api';

const SalesCtx = React.createContext(null);

function SalesProvider({ children }) {
  const inv = useInv();
  const [products, setProducts] = React.useState([]);
  const [sales, setSales] = React.useState({});
  const today = React.useMemo(() => dKey(new Date()), []);

  React.useEffect(() => {
    fetch(SALES_API + '/sales-products').then((r) => r.json())
      .then((prods) => setProducts(prods)).catch(console.error);
    fetch(SALES_API + '/daily-sales').then((r) => r.json())
      .then((rows) => {
        const map = {};
        rows.forEach((r) => {
          if (!map[r.date]) map[r.date] = {};
          map[r.date][r.sales_product_id] = r.count;
        });
        setSales(map);
      }).catch(console.error);
  }, []);

  const soldOn = (pid, date) => sales[date] && sales[date][pid] || 0;

  // Борлуулалт өөрчлөгдөхөд орцоор бараа материалыг хасах / буцаах.
  const applyInventory = (pid, deltaCups) => {
    if (!deltaCups) return;
    const prod = products.find((p) => p.id === pid);
    if (!prod || !prod.recipe) return;
    prod.recipe.forEach((r) => {
      const total = r.amount * Math.abs(deltaCups);
      if (deltaCups > 0) inv.consume(r.pid, total, 'Борлуулалт · ' + prod.name);else
      inv.replenish(r.pid, total);
    });
  };

  const syncDailySale = (date, pid, count) => {
    fetch(SALES_API + '/daily-sales', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, sales_product_id: pid, count }),
    }).catch(console.error);
  };

  const setSold = (date, pid, qty) => {
    const next = Math.max(0, Number(qty) || 0);
    const prev = soldOn(pid, date);
    applyInventory(pid, next - prev);
    setSales((s) => ({ ...s, [date]: { ...(s[date] || {}), [pid]: next } }));
    syncDailySale(date, pid, next);
  };
  const bumpSold = (date, pid, by) => {
    const cur = soldOn(pid, date);
    const next = Math.max(0, cur + by);
    applyInventory(pid, next - cur);
    setSales((s) => ({ ...s, [date]: { ...(s[date] || {}), [pid]: next } }));
    syncDailySale(date, pid, next);
  };

  const addProduct = (data) => {
    const id = 'd' + Date.now();
    const product = {
      id,
      name: data.name?.trim() || 'Шинэ бүтээгдэхүүн',
      size: data.size || 'дунд',
      price: Number(data.price) || 0,
      tint: data.tint || '#d97757',
      img: data.img || null,
      recipe: (data.recipe || []).filter((r) => r.pid && r.amount > 0)
    };
    setProducts((ps) => [product, ...ps]);
    fetch(SALES_API + '/sales-products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    }).catch(console.error);
  };
  const removeProduct = (pid) => {
    setProducts((ps) => ps.filter((p) => p.id !== pid));
    fetch(SALES_API + '/sales-products/' + pid, { method: 'DELETE' }).catch(console.error);
  };

  const value = { products, today, soldOn, setSold, bumpSold, addProduct, removeProduct };
  return <SalesCtx.Provider value={value}>{children}</SalesCtx.Provider>;
}
const useSales = () => React.useContext(SalesCtx);

// ==========================================================================
function ProductSalesApp() {
  const sales = useSales();
  const isMobile = useIsMobile();
  const [q, setQ] = React.useState('');
  const [date, setDate] = React.useState(sales.today);
  const [modal, setModal] = React.useState(false);

  const windowDays = React.useMemo(() => {
    const arr = [];for (let i = 6; i >= 0; i--) arr.push(dAdd(date, -i));return arr;
  }, [date]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return sales.products.filter((p) => !needle || p.name.toLowerCase().includes(needle));
  }, [sales.products, q]);

  // 7 хоногийн график тэнхлэгийг жигдрүүлэх дэлхийн max.
  const globalMax = React.useMemo(() => {
    let m = 1;
    sales.products.forEach((p) => windowDays.forEach((k) => {m = Math.max(m, sales.soldOn(p.id, k));}));
    return m;
  }, [sales, windowDays]);

  const stats = React.useMemo(() => {
    let units = 0,revenue = 0,best = null,bestQ = -1,week = 0;
    sales.products.forEach((p) => {
      const day = sales.soldOn(p.id, date);
      units += day;revenue += day * p.price;
      if (day > bestQ) {bestQ = day;best = p;}
      windowDays.forEach((k) => week += sales.soldOn(p.id, k));
    });
    return { units, revenue, best: bestQ > 0 ? best : null, week };
  }, [sales, date, windowDays]);

  const isToday = date === sales.today;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Marquee strip. */}
      <div style={{
        background: '#0a0c10', borderBottom: '1px solid var(--border)',
        padding: '8px 28px', fontSize: 11, color: 'var(--dim)',
        textAlign: 'center', letterSpacing: '.06em'
      }}>
        Борлуулалтын бүртгэл · өдөр бүрийн зарагдсан тоог оруул · 7 хоногийн чиг хандлага шууд харагдана
      </div>

      {/* Top nav. */}
      <div style={{
        display: 'flex', alignItems: isMobile ? 'stretch' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between', gap: isMobile ? 10 : 0,
        padding: isMobile ? '12px 16px' : '14px 28px',
        borderBottom: '1px solid var(--border)',
        background: '#0c0f14', flex: '0 0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14,
          justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
          <SalesBrand />
          <ViewSwitch />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SearchField value={q} onChange={setQ} placeholder="Бүтээгдэхүүн хайх..." width={isMobile ? '100%' : 300} />
          <PriBtn onClick={() => setModal(true)}><PlusIcon /> {isMobile ? 'Нэмэх' : 'Шинэ бүтээгдэхүүн'}</PriBtn>
        </div>
      </div>

      {/* Workspace — scrolls. */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1480, margin: '0 auto',
          padding: isMobile ? '18px 14px 34px' : '28px 28px 40px' }}>

          {/* Heading + day nav. */}
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-end', flexWrap: 'wrap', gap: 16,
            marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.015em' }}>
                Өдрийн борлуулалт
              </div>
              <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 4 }}>
                Тухайн өдөрт хэдэн shake, smoothie зарагдсаныг бүртгэ.
              </div>
            </div>
            <DayNav date={date} setDate={setDate} today={sales.today} />
          </div>

          {/* Stats strip. */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
            <SalesStat label={isToday ? 'Өнөөдрийн борлуулалт' : 'Тухайн өдрийн борлуулалт'}
            value={stats.units} unit="ширхэг" tone="pri" />
            <SalesStat label="Тухайн өдрийн орлого" value={fmtMNT(stats.revenue)} mono={false} />
            <SalesStat label="Хамгийн их зарагдсан"
            value={stats.best ? stats.best.name : '—'} unit={stats.best ? '' : ''} mono={false} small />
            <SalesStat label="7 хоногийн дүн" value={stats.week} unit="ширхэг" />
          </div>

          {/* Борлуулалтын тойм — хүн өөрөө хугацаагаа сонгож шүүнэ. */}
          <SalesInsights sales={sales} today={sales.today} anchorDate={date} />

          {filtered.length === 0 ? <SalesEmpty onAdd={() => setModal(true)} /> :
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16
          }}>
              {filtered.map((p) =>
            <SalesCard key={p.id} product={p} date={date}
            windowDays={windowDays} globalMax={globalMax} />
            )}
            </div>
          }
        </div>
      </div>

      <SalesProductModal open={modal} onClose={() => setModal(false)} />
    </div>);

}

function SalesBrand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, background: 'var(--pri)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
        stroke="var(--priInk)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h8l-.8 6.2a1 1 0 0 1-1 .8H5.8a1 1 0 0 1-1-.8z" />
          <path d="M5.4 6c0-2 1.2-3.2 2.6-3.2S10.6 4 10.6 6" />
        </svg>
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.01em' }}>
        oasis<span style={{ color: 'var(--pri)' }}>.coffee</span>
      </div>
    </div>);

}

// Өдөр сонгогч: сүүлийн 7 хоног pill-ээр + ◀▶ долоо хоног ухрах/урагшлах + хуанли.
function DayNav({ date, setDate, today }) {
  const [anchor, setAnchor] = React.useState(today); // баруун талын (хамгийн сүүлийн) өдөр
  // Сонгосон огноо харагдах цонхонд байхгүй бол anchor-ийг түүн рүү шилжүүлнэ.
  React.useEffect(() => {
    const start = dAdd(anchor, -6);
    if (date > anchor || date < start) setAnchor(date > today ? today : date);
  }, [date]);

  const days = React.useMemo(() => {
    const a = [];for (let i = 6; i >= 0; i--) a.push(dAdd(anchor, -i));return a;
  }, [anchor]);
  const inStrip = days.includes(date);
  const yest = dAdd(today, -1);
  const atLatest = anchor >= today;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <WeekArrow dir="left" title="Өмнөх 7 хоног"
      onClick={() => setAnchor(dAdd(anchor, -7))} />

      <div style={{
        display: 'inline-flex', gap: 4, padding: 4,
        background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
        borderRadius: 14, overflowX: 'auto', maxWidth: '100%'
      }}>
        {days.map((k) => {
          const sel = k === date;
          const label = k === today ? 'Өнөөдөр' : k === yest ? 'Өчигдөр' : weekday(k);
          return (
            <button key={k} onClick={() => setDate(k)} title={longDate(k)}
            style={{
              minWidth: 50, padding: '7px 9px', borderRadius: 10, border: 'none',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, fontFamily: 'inherit',
              background: sel ? 'var(--pri)' : 'transparent',
              color: sel ? 'var(--priInk)' : 'var(--ink)',
              transition: 'background .12s, color .12s'
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.03em',
                opacity: sel ? .9 : .6 }}>{label}</span>
              <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1,
                fontFamily: 'JetBrains Mono, monospace' }}>{dayNum(k)}</span>
            </button>);

        })}
      </div>

      <WeekArrow dir="right" title="Дараагийн 7 хоног" disabled={atLatest}
      onClick={() => !atLatest && setAnchor(dAdd(anchor, +7) > today ? today : dAdd(anchor, +7))} />

      <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      title="Өөр өдөр сонгох">
        <input type="date" value={date} max={today}
        onChange={(e) => e.target.value && setDate(e.target.value)}
        style={{
          colorScheme: 'dark', padding: '11px 12px', borderRadius: 12,
          border: `1px solid ${inStrip ? 'var(--border)' : 'var(--pri)'}`,
          background: inStrip ? 'rgba(255,255,255,.04)' : 'rgba(217,119,87,.15)',
          color: 'var(--ink)', fontFamily: 'inherit', fontSize: 12, outline: 'none',
          cursor: 'pointer'
        }} />
      </label>
    </div>);

}

function WeekArrow({ onClick, dir, disabled, title }) {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick} disabled={disabled} title={title}
    onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{
      width: 38, height: 56, borderRadius: 12, padding: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: '1px solid var(--border)',
      background: h && !disabled ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.04)',
      color: disabled ? 'var(--mute)' : 'var(--ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: dir === 'left' ? 'none' : 'scaleX(-1)' }}>
        <path d="M10 3L5 8l5 5" />
      </svg>
    </button>);

}

function SalesStat({ label, value, unit, tone, mono = true, small }) {
  const color = tone === 'pri' ? 'var(--pri)' : 'var(--ink)';
  return (
    <div style={{
      padding: '10px 16px', background: 'var(--panel)',
      border: '1px solid var(--border)', borderRadius: 10, minWidth: 140,
      maxWidth: small ? 220 : 'none'
    }}>
      <div style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase',
        letterSpacing: '.06em', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <div style={{
          fontSize: small ? 14 : 18, fontWeight: 700, color, lineHeight: 1.15,
          fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: small ? 190 : 'none'
        }}>{value}</div>
        {unit && <div style={{ fontSize: 11, color: 'var(--dim)' }}>{unit}</div>}
      </div>
    </div>);

}

// ---- analytics panel (хүн өөрөө хугацаагаа сонгоно) ------------------------
function SalesInsights({ sales, today, anchorDate }) {
  const [open, setOpen] = React.useState(true);
  // Default: сонгосон өдрөөс өмнөх 7 хоног.
  const [from, setFrom] = React.useState(dAdd(anchorDate, -6));
  const [to, setTo]     = React.useState(anchorDate);
  const [touched, setTouched] = React.useState(false);

  // Хэрэв хүн өөрөө хугацаа сонгоогүй бол өдрийн сонголтыг дагана.
  React.useEffect(() => {
    if (!touched) { setFrom(dAdd(anchorDate, -6)); setTo(anchorDate); }
  }, [anchorDate, touched]);

  const days = React.useMemo(() => {
    let a = from, b = to; if (a > b) { const t = a; a = b; b = t; }
    const out = []; let k = a, guard = 0;
    while (k <= b && guard++ < 400) { out.push(k); k = dAdd(k, 1); }
    return out;
  }, [from, to]);

  const { perProduct, daily, totalUnits, totalRev, bestDay, avg } = React.useMemo(() => {
    const perProduct = sales.products.map((p) => {
      let units = 0; days.forEach((k) => (units += sales.soldOn(p.id, k)));
      return { p, units, revenue: units * p.price };
    }).sort((a, b) => b.units - a.units);
    const daily = days.map((k) => {
      let u = 0, r = 0;
      sales.products.forEach((p) => { const q = sales.soldOn(p.id, k); u += q; r += q * p.price; });
      return { key: k, units: u, revenue: r };
    });
    const totalUnits = perProduct.reduce((a, x) => a + x.units, 0);
    const totalRev   = perProduct.reduce((a, x) => a + x.revenue, 0);
    const bestDay = daily.reduce((m, d) => (d.units > m.units ? d : m), daily[0] || { units: 0 });
    const avg = totalUnits / (days.length || 1);
    return { perProduct, daily, totalUnits, totalRev, bestDay, avg };
  }, [sales, days]);

  const dayMax = Math.max(1, ...daily.map((d) => d.units));
  const rankMax = Math.max(1, ...perProduct.map((x) => x.units));
  const top = perProduct.filter((x) => x.units > 0).slice(0, 6);
  const nf = (n) => new Intl.NumberFormat('mn-MN').format(Math.round(n));
  const leader = top[0];
  const dense = days.length > 12;   // олон өдөр бол шошголыг храгуулахгүй.

  const setRange = (f, t) => { setTouched(true); setFrom(f); setTo(t); };
  const monthStart = () => { const d = dFrom(today); return dKey(new Date(d.getFullYear(), d.getMonth(), 1)); };

  const rangeText = days.length
    ? (() => {
        const a = dFrom(days[0]), b = dFrom(days[days.length - 1]);
        return a.getMonth() === b.getMonth()
          ? `${MN_MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}`
          : `${MN_MONTHS[a.getMonth()]} ${a.getDate()} – ${MN_MONTHS[b.getMonth()]} ${b.getDate()}`;
      })()
    : '';

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px', marginBottom: 22
    }}>
      {/* Header — товчоор хураана/дэлгэнэ. */}
      <button onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          color: 'var(--ink)', textAlign: 'left', fontFamily: 'inherit',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,.06)',
            transition: 'transform .15s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6l5 5 5-5" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>
              Борлуулалтын тойм
            </div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2,
                          fontFamily: 'JetBrains Mono, monospace' }}>
              {rangeText} · {days.length} өдөр
            </div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {open
            ? 'Хураах'
            : <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {nf(totalUnits)}ш · {fmtMNT(totalRev)}
              </span>}
        </span>
      </button>

      {!open ? null : <React.Fragment>
      {/* Хугацаа шүүгч: Эхлэх – Дуусах + бэлэн хугацаа. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap',
                    marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <RangeDate label="Эхлэх өдөр" value={from} max={to > today ? today : to}
                   onChange={(v) => setRange(v, to)} />
        <RangeDate label="Дуусах өдөр" value={to} min={from} max={today}
                   onChange={(v) => setRange(from, v)} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          <RangePreset onClick={() => setRange(dAdd(today, -6), today)}>Сүүлийн 7 хоног</RangePreset>
          <RangePreset onClick={() => setRange(dAdd(today, -29), today)}>Сүүлийн 30 хоног</RangePreset>
          <RangePreset onClick={() => setRange(monthStart(), today)}>Энэ сар</RangePreset>
        </div>
      </div>

      {/* Summary mini-tiles. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12, marginBottom: 18, marginTop: 18 }}>
        <MiniTile label="Энэ хугацаанд зарсан" value={nf(totalUnits)} unit="ширхэг" tone="pri" />
        <MiniTile label="Хугацааны орлого" value={fmtMNT(totalRev)} mono={false} />
        <MiniTile label="Өдрийн дундаж" value={nf(avg)} unit="ш / өдөр" />
        <MiniTile label="Хамгийн их зарсан өдөр"
        value={bestDay && bestDay.units ? longDate(bestDay.key).replace(/,.*/, '') : '—'}
        unit={bestDay && bestDay.units ? `${bestDay.units}ш` : ''} mono={false} small />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Daily totals chart. */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
            Өдөр бүр хэдэн ширхэг зарсан бэ?
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 16, lineHeight: 1.4 }}>
            Багана өндөр байх тусам тэр өдөр илүү их зарагдсан. Тоо нь зарагдсан ширхэг.
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: dense ? 3 : 8, height: 130,
                        overflowX: 'auto' }}>
            {daily.map((d) => {
              const isT = d.key === today;
              return (
                <div key={d.key} style={{ flex: '1 0 auto', minWidth: dense ? 14 : 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 6, height: '100%' }}>
                  {!dense &&
                  <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700, color: d.units ? (isT ? 'var(--pri)' : 'var(--ink)') : 'var(--mute)' }}>
                    {d.units}<span style={{ fontSize: 9, color: 'var(--mute)', fontWeight: 400 }}>ш</span>
                  </div>}
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div title={`${longDate(d.key)} — ${d.units} ширхэг · ${fmtMNT(d.revenue)}`} style={{
                      width: '100%', borderRadius: dense ? 2 : 5, minWidth: dense ? 8 : 0,
                      height: `${Math.max(4, d.units / dayMax * 100)}%`,
                      background: isT ? 'var(--pri)' : 'rgba(255,255,255,.16)',
                      transition: 'height .2s'
                    }} />
                  </div>
                  {!dense &&
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600,
                      color: isT ? 'var(--pri)' : 'var(--dim)' }}>
                      {isT ? 'Өнөөдөр' : weekday(d.key)}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                      color: isT ? 'var(--pri)' : 'var(--mute)', fontWeight: 600 }}>
                      {dayNum(d.key)}
                    </div>
                  </div>}
                  {dense &&
                  <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                    color: isT ? 'var(--pri)' : 'var(--mute)' }}>{dayNum(d.key)}</div>}
                </div>);

            })}
          </div>
        </div>

        {/* Leaderboard. */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--mute)', textTransform: 'uppercase',
              letterSpacing: '.06em', fontWeight: 600 }}>
              Хамгийн их зарагдсан (7 хоног)
            </div>
            {leader &&
            <div style={{ fontSize: 11, color: 'var(--pri)', fontWeight: 600 }}>
                🥇 {leader.p.name}
              </div>
            }
          </div>
          {top.length === 0 ?
          <div style={{ fontSize: 12, color: 'var(--mute)', padding: '20px 0' }}>
              Энэ 7 хоногт борлуулалт бүртгэгдээгүй байна.
            </div> :

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {top.map((x, i) =>
            <div key={x.p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 18, fontSize: 12, fontWeight: 700, color: 'var(--mute)',
                fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
                    {i + 1}
                  </div>
                  <div style={{ width: 9, height: 9, borderRadius: 3, background: x.p.tint, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.p.name}</span>
                      <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {x.units}<span style={{ color: 'var(--dim)', fontWeight: 400 }}>ш</span>
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 3,
                    background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${x.units / rankMax * 100}%`,
                      background: x.p.tint, transition: 'width .25s' }} />
                      </div>
                      <span style={{ fontSize: 10.5, color: 'var(--dim)',
                    fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                        {fmtMNT(x.revenue)}
                      </span>
                    </div>
                  </div>
                </div>
            )}
            </div>
          }
        </div>
      </div>
      </React.Fragment>}
    </div>);

}

function MiniTile({ label, value, unit, tone, mono = true, small }) {
  const color = tone === 'pri' ? 'var(--pri)' : 'var(--ink)';
  return (
    <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,.03)',
      border: '1px solid var(--border)', borderRadius: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase',
        letterSpacing: '.06em', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <div style={{
          fontSize: small ? 15 : 20, fontWeight: 700, color, lineHeight: 1.1,
          fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{value}</div>
        {unit && <div style={{ fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap' }}>{unit}</div>}
      </div>
    </div>);

}

// Хугацааны огноо сонгогч (Эхлэх / Дуусах).
function RangeDate({ label, value, onChange, min, max }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase',
                     letterSpacing: '.06em', fontWeight: 600 }}>{label}</span>
      <input type="date" value={value} min={min} max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        style={{
          colorScheme: 'dark', padding: '9px 11px', borderRadius: 10,
          border: '1px solid var(--border)', background: 'rgba(255,255,255,.04)',
          color: 'var(--ink)', fontFamily: 'inherit', fontSize: 12.5, outline: 'none',
          cursor: 'pointer',
        }} />
    </label>
  );
}

// Бэлэн хугацааны товч (Сүүлийн 7 хоног гэх мэт).
function RangePreset({ onClick, children }) {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: '8px 12px', borderRadius: 9, cursor: 'pointer',
        border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
        background: h ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)',
        color: 'var(--ink)', transition: 'background .12s', whiteSpace: 'nowrap',
      }}>{children}</button>
  );
}

// ---- product card --------------------------------------------------------
function SalesCard({ product, date, windowDays, globalMax }) {
  const sales = useSales();
  const inv = useInv();
  const qty = sales.soldOn(product.id, date);
  const [hover, setHover] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const history = windowDays.map((k) => ({
    key: k, qty: sales.soldOn(product.id, k), selected: k === date
  }));
  const revenue = qty * product.price;

  const startEdit = () => {setDraft(String(qty));setEditing(true);};
  const commitEdit = () => {sales.setSold(date, product.id, draft);setEditing(false);};

  const art = { ...product, unit: product.size };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {setHover(false);setConfirm(false);}}
      style={{
        background: 'var(--panel)', borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${hover ? 'var(--borderHi)' : 'var(--border)'}`,
        transition: 'border .12s, transform .12s, box-shadow .12s',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? '0 12px 32px rgba(0,0,0,.25)' : 'none',
        position: 'relative', display: 'flex', flexDirection: 'column'
      }}>
      <ProductArt product={art} cat={{ tint: product.tint }} height={150} />

      <div style={{
        position: 'absolute', top: 10, right: 10, opacity: hover ? 1 : 0,
        transition: 'opacity .12s'
      }}>
        <IconBtn danger title="Устгах" onClick={(e) => {
          e.stopPropagation();
          if (confirm) sales.removeProduct(product.id);else setConfirm(true);
        }}>
          {confirm ?
          <span style={{ fontSize: 11, fontWeight: 700, padding: '0 6px' }}>OK?</span> :
          <TrashIcon />}
        </IconBtn>
      </div>

      <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.name}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dim)',
          fontFamily: 'JetBrains Mono, monospace' }}>
          {fmtMNT(product.price)}<span style={{ opacity: .55 }}> / {product.size}</span>
        </div>

        {/* Нэг ширхэг зарагдахад хасагдах бараа материал. */}
        <RecipeChips recipe={product.recipe} inv={inv} />

        {/* 7 хоногийн график. */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase',
            letterSpacing: '.06em', marginBottom: 7 }}>Сүүлийн 7 хоног</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 52 }}>
            {history.map((h) =>
            <div key={h.key} style={{ flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 5 }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div title={`${h.qty} ширхэг`} style={{
                  width: '100%', borderRadius: 3,
                  height: Math.max(3, h.qty / globalMax * 38),
                  background: h.selected ? 'var(--pri)' : 'rgba(255,255,255,.13)',
                  transition: 'height .15s, background .12s'
                }} />
                </div>
                <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                color: h.selected ? 'var(--pri)' : 'var(--mute)', fontWeight: 600
              }}>{dayNum(h.key)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Тухайн өдрийн зарагдсан тоо + stepper. */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end', marginTop: 'auto',
          paddingTop: 14, gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase',
              letterSpacing: '.06em', marginBottom: 3 }}>
              {date === sales.today ? 'Өнөөдөр зарсан' : 'Тухайн өдөр зарсан'}
            </div>
            {editing ?
            <input type="number" autoFocus value={draft}
            onChange={(e) => setDraft(e.target.value)} onBlur={commitEdit}
            onKeyDown={(e) => {if (e.key === 'Enter') commitEdit();else if (e.key === 'Escape') setEditing(false);}}
            style={{
              width: 70, padding: '0 6px', height: 26, fontSize: 22, fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace', background: 'rgba(255,255,255,.06)',
              border: '1px solid var(--pri)', borderRadius: 6, color: 'var(--ink)',
              outline: 'none', fontVariantNumeric: 'tabular-nums'
            }} /> :

            <button onClick={startEdit} title="Тоог шууд бичих"
            style={{
              background: 'transparent', border: 'none', padding: 0, cursor: 'text',
              color: 'var(--ink)', fontSize: 22, fontWeight: 700, lineHeight: 1,
              fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums',
              borderBottom: '1px dashed transparent', transition: 'border-color .12s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = 'var(--borderHi)'}
            onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}>
                {qty}
              </button>
            }
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4,
              fontFamily: 'JetBrains Mono, monospace' }}>
              {fmtMNT(revenue)}
            </div>
          </div>
          <Stepper
            value={qty}
            onMinus={() => sales.bumpSold(date, product.id, -1)}
            onPlus={() => sales.bumpSold(date, product.id, +1)} />
          
        </div>
      </div>
    </div>);

}

// Рецептийн chips: "15гр Гүзээлзгэнэ сироп" гэх мэт.
function RecipeChips({ recipe, inv, compact }) {
  if (!recipe || recipe.length === 0) return null;
  const rows = recipe.
  map((r) => ({ r, p: inv.products.find((x) => x.id === r.pid) })).
  filter((x) => x.p);
  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: compact ? 0 : 12 }}>
      {!compact &&
      <div style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase',
        letterSpacing: '.06em', marginBottom: 7 }}>
          1 ширхэгт хасагдах нөөц
        </div>
      }
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {rows.map(({ r, p }) => {
          const low = p.qty <= p.min;
          return (
            <span key={r.pid} title={`${p.name} · ${p.qty} ${p.unit} үлдээтэй`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 7, fontSize: 11,
              background: 'rgba(255,255,255,.045)',
              border: `1px solid ${low ? 'rgba(232,116,106,.5)' : 'var(--border)'}`
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 2,
                background: inv.catById[p.cat]?.tint || '#888' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                color: low ? '#e8746a' : 'var(--ink)' }}>
                {r.amount}{baseLabel(p.unit)}
              </span>
              <span style={{ color: 'var(--dim)', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                {p.name}
              </span>
            </span>);

        })}
      </div>
    </div>);

}

function SalesEmpty({ onAdd }) {
  return (
    <div style={{
      padding: '80px 20px', textAlign: 'center',
      border: '1px dashed var(--border)', borderRadius: 14, color: 'var(--dim)'
    }}>
      <div style={{ fontSize: 14, marginBottom: 12 }}>Бүтээгдэхүүн олдсонгүй</div>
      <GhostBtn onClick={onAdd}><PlusIcon /> Шинэ бүтээгдэхүүн нэмэх</GhostBtn>
    </div>);

}

// ---- add product modal ---------------------------------------------------
const TINT_SWATCHES = ['#e8746a', '#e6b54a', '#5fbf8a', '#5b9eff', '#b783e8', '#d97757', '#8b5a3c', '#c9a96e'];

function SalesProductModal({ open, onClose }) {
  const sales = useSales();
  const inv = useInv();
  const [name, setName] = React.useState('');
  const [size, setSize] = React.useState('дунд');
  const [price, setPrice] = React.useState('');
  const [tint, setTint] = React.useState(TINT_SWATCHES[0]);
  const [img, setImg] = React.useState(null);
  const [recipe, setRecipe] = React.useState([]); // [{pid, amount}]

  React.useEffect(() => {
    if (open) {setName('');setSize('дунд');setPrice('');setTint(TINT_SWATCHES[0]);setImg(null);setRecipe([]);}
  }, [open]);

  if (!open) return null;
  const submit = () => {
    if (!name.trim()) return;
    sales.addProduct({ name, size, price, tint, img, recipe });
    onClose();
  };
  const onPickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();r.onload = () => setImg(r.result);r.readAsDataURL(f);
  };

  const addRow = () => setRecipe((rs) => [...rs, { pid: '', amount: '' }]);
  const setRow = (i, patch) => setRecipe((rs) => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
  const removeRow = (i) => setRecipe((rs) => rs.filter((_, j) => j !== i));

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(8,10,14,.6)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      padding: 16
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(480px, 100%)', maxHeight: '88vh', overflow: 'auto', background: 'var(--panel)', borderRadius: 16,
        border: '1px solid var(--border)', padding: 22,
        boxShadow: '0 24px 80px rgba(0,0,0,.55)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Шинэ бүтээгдэхүүн нэмэх</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>Орцын бараа материалыг заавал автомат хасна.</div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 18,
            cursor: 'pointer', width: 28, height: 28, borderRadius: 8
          }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Бүтээгдэхүүний зураг">
            <ImagePicker value={img} onChange={setImg} onPickFile={onPickFile} />
          </Field>
          <Field label="Нэр">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="жнь. Гүзээлзгэнэ Smoothie" style={inputCss} />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Хэмжээ"><input value={size} onChange={(e) => setSize(e.target.value)} placeholder="дунд / том" style={inputCss} /></Field>
            <Field label="Үнэ (₮)"><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" style={inputCss} /></Field>
          </div>
          <Field label="Өнгө">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TINT_SWATCHES.map((c) =>
              <button key={c} onClick={() => setTint(c)} title={c}
              style={{
                width: 28, height: 28, borderRadius: 8, cursor: 'pointer', background: c,
                border: tint === c ? '2px solid var(--ink)' : '2px solid transparent',
                boxShadow: tint === c ? '0 0 0 2px var(--bg) inset' : 'none'
              }} />
              )}
            </div>
          </Field>

          {/* Орц — бараа материалын зарцуулалт. */}
          <RecipeBuilder rows={recipe} inv={inv} addRow={addRow} setRow={setRow} removeRow={removeRow} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onClose}>Болих</GhostBtn>
          <PriBtn onClick={submit}>Нэмэх</PriBtn>
        </div>
      </div>
    </div>);

}

// Орц бүртгэх builder: бараа материал сонгоод хэдийг хасахыг заана.
function RecipeBuilder({ rows, inv, addRow, setRow, removeRow }) {
  // бараа материалыг бүлэгээр нь жагсаах.
  const byGroup = inv.groups.map((g) => ({
    g, items: inv.products.filter((p) => inv.groupOf(p) === g.id)
  }));
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Орц (бараа материал)</div>
        <GhostBtn size="sm" onClick={addRow}><PlusIcon /> Нэмэх</GhostBtn>
      </div>
      <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>
        Нэг ширхэг зарагдахад хэдий хэмжээ зарцуулахаа бичнэ · борлуулахад өөрөө хасагдана.
      </div>

      {rows.length === 0 &&
      <div style={{ padding: '14px', border: '1px dashed var(--border)', borderRadius: 10,
        fontSize: 12, color: 'var(--mute)', textAlign: 'center' }}>
          Орц нэмэхгүй бол бараа материал хасагдахгүй.
        </div>
      }

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => {
          const p = inv.products.find((x) => x.id === r.pid);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 92px 30px',
              gap: 8, alignItems: 'center' }}>
              <select value={r.pid} onChange={(e) => setRow(i, { pid: e.target.value })}
              style={{ ...inputCss, colorScheme: 'dark', cursor: 'pointer' }}>
                <option value="">Бараа сонгох...</option>
                {byGroup.map(({ g, items }) =>
                <optgroup key={g.id} label={g.name}>
                    {items.map((it) =>
                  <option key={it.id} value={it.id}>{it.name}</option>
                  )}
                  </optgroup>
                )}
              </select>
              <div style={{ position: 'relative' }}>
                <input type="number" value={r.amount}
                onChange={(e) => setRow(i, { amount: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="0" style={{ ...inputCss, paddingRight: 30, textAlign: 'right' }} />
                <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 11, color: 'var(--mute)', pointerEvents: 'none' }}>
                  {p ? baseLabel(p.unit) : ''}
                </span>
              </div>
              <IconBtn danger title="Хасах" onClick={() => removeRow(i)}><TrashIcon /></IconBtn>
            </div>);

        })}
      </div>

      {/* Хасагдах нөөцийн урьдчилсан preview. */}
      <RecipePreview rows={rows} inv={inv} />
    </div>);

}

function RecipePreview({ rows, inv }) {
  const valid = rows.map((r) => ({ r, p: inv.products.find((x) => x.id === r.pid) })).
  filter((x) => x.p && x.r.amount > 0);
  if (valid.length === 0) return null;
  return (
    <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10,
      background: 'rgba(217,119,87,.08)', border: '1px solid rgba(217,119,87,.28)' }}>
      <div style={{ fontSize: 11, color: 'var(--pri)', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
        1 ширхэг зарагдахад хасагдах нь
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {valid.map(({ r, p }) => {
          const size = parseSize(p.unit).amt;
          const cur = (p.qty - 1) * size + (p.open ?? size); // үлдэгдэл base нэгжээр
          const after = Math.max(0, cur - r.amount);
          return (
            <div key={r.pid} style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontSize: 12, gap: 10 }}>
              <span style={{ color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--dim)',
                whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(cur)}<span style={{ opacity: .5 }}> → </span>
                <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{Math.round(after)}</span>
                <span style={{ opacity: .6 }}> {baseLabel(p.unit)}</span>
              </span>
            </div>);

        })}
      </div>
    </div>);

}

Object.assign(window, { SalesProvider, SalesCtx, useSales, ProductSalesApp });