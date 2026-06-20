// InventoryApp — full-bleed dark inventory prototype.
// Top: brand + search + add CTA. KPI strip with live totals. Category pills,
// sort control, then a responsive card grid. Cards have stepper +/-, inline
// quantity editing (click the number), min-stock indicator, and hover delete.

function InventoryApp() {
  const inv = useInv();
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('all');
  const [sort, setSort] = React.useState('name'); // default: Нэр А–Я
  const [modal, setModal] = React.useState(false);

  const matches = React.useCallback((p) => {
    if (!p) return false;
    const needle = q.trim().toLowerCase();
    if (cat !== 'all' && inv.groupOf(p) !== cat) return false;
    if (needle && !p.name.toLowerCase().includes(needle)) return false;
    return true;
  }, [q, cat, inv]);

  // Frozen display order: recomputed ONLY when sort / filter / product-set
  // changes — NOT on every qty edit. Adjusting stock no longer reshuffles cards.
  const [order, setOrder] = React.useState([]);
  React.useEffect(() => {
    const list = inv.products.filter(matches);
    const sorters = {
      low: (a, b) => a.qty / Math.max(1, a.min) - b.qty / Math.max(1, b.min),
      'qty-asc': (a, b) => a.qty - b.qty,
      'qty-desc': (a, b) => b.qty - a.qty,
      name: (a, b) => a.name.localeCompare(b.name, 'mn')
    };
    setOrder([...list].sort(sorters[sort] || sorters.name).map((p) => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, q, cat, inv.products.length]);

  const filtered = React.useMemo(() => {
    const byId = {};inv.products.forEach((p) => byId[p.id] = p);
    const out = order.map((id) => byId[id]).filter(matches);
    // Safety: include any matching product not yet in the frozen order.
    inv.products.forEach((p) => {if (matches(p) && !order.includes(p.id)) out.push(p);});
    return out;
  }, [order, inv.products, matches]);

  const stats = React.useMemo(() => ({
    count: inv.products.length,
    lowCount: inv.products.filter((p) => p.qty <= p.min).length,
    value: inv.products.reduce((a, p) => a + p.qty * p.price, 0),
    units: inv.products.reduce((a, p) => a + p.qty, 0)
  }), [inv.products]);

  const isMobile = useIsMobile();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Marquee strip. */}
      <div style={{
        background: '#0a0c10', borderBottom: '1px solid var(--border)',
        padding: isMobile ? '7px 16px' : '8px 28px', fontSize: 11, color: 'var(--dim)',
        textAlign: 'center', letterSpacing: '.06em'
      }}>
        Бараа материалын бүртгэл · бодит нөөц шууд харагдана · өөрчлөлт түүхэнд бичигдэнэ
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
          <Brand />
          <ViewSwitch />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SearchField value={q} onChange={setQ} width={isMobile ? '100%' : 300} />
          <PriBtn onClick={() => setModal(true)}><PlusIcon /> {isMobile ? 'Нэмэх' : 'Шинэ бараа'}</PriBtn>
        </div>
      </div>

      {/* Workspace — scrolls. */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1480, margin: '0 auto',
          padding: isMobile ? '18px 14px 34px' : '28px 28px 40px' }}>

          {/* Heading + stats strip. */}
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-end', flexWrap: 'wrap', gap: 16,
            marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.015em' }}>
                Барааны бүртгэл
              </div>
              <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 4 }}>
                Кофе шопын бүх төрлийн нөөцийг нэг дороос удирд.
              </div>
            </div>
            <StatsStrip stats={stats} />
          </div>

          {/* Filters row. */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 12, marginBottom: 16, flexWrap: 'wrap'
          }}>
            <CategoryPills value={cat} onChange={setCat} products={inv.products} />
            <SortControl value={sort} onChange={setSort} />
          </div>

          {filtered.length === 0 ? <Empty onAdd={() => setModal(true)} /> :
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16
          }}>
              {filtered.map((p) => <BigCard key={p.id} product={p} />)}
            </div>
          }
        </div>
      </div>

      <AddProductModal open={modal} onClose={() => setModal(false)}
      defaultGroup={cat !== 'all' ? cat : null} />
    </div>);

}

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <BeanMark />
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-.01em' }}>
        oasis<span style={{ color: 'var(--pri)' }}>.coffee</span>
      </div>
    </div>);

}

function BeanMark() {
  // Coffee-bean glyph — a circle split by a curved seam. Tints with --pri.
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 9, background: 'var(--pri)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <ellipse cx="8" cy="8" rx="5.4" ry="6.2"
        transform="rotate(-22 8 8)"
        stroke="var(--priInk)" strokeWidth="1.4" fill="none" />
        <path d="M5.5 3.5 Q 8 8 10.5 12.5" stroke="var(--priInk)"
        strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    </div>);

}

function StatsStrip({ stats }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <StatTile label="Нийт бараа" value={stats.count} unit="төрөл" />
      <StatTile label="Нийт нөөц" value={stats.units} unit="ширхэг" />
      <StatTile label="Бага нөөц" value={stats.lowCount} unit="бараа"
      tone={stats.lowCount > 0 ? 'danger' : 'ok'} />
      <StatTile label="Нөөцийн үнэлгээ" value={fmtMNT(stats.value)} mono={false} />
    </div>);

}

function StatTile({ label, value, unit, tone, mono = true }) {
  const color = tone === 'danger' ? 'var(--danger)' :
  tone === 'ok' ? 'var(--ok)' : 'var(--ink)';
  return (
    <div style={{
      padding: '10px 16px', background: 'var(--panel)',
      border: '1px solid var(--border)', borderRadius: 10, minWidth: 130
    }}>
      <div style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase',
        letterSpacing: '.06em', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <div style={{
          fontSize: 18, fontWeight: 700, color, lineHeight: 1,
          fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em'
        }}>{value}</div>
        {unit && <div style={{ fontSize: 11, color: 'var(--dim)' }}>{unit}</div>}
      </div>
    </div>);

}

function SortControl({ value, onChange }) {
  const opts = [
  { id: 'name', label: 'Нэр А–Я' },
  { id: 'low', label: 'Бага нөөц эхэлж' },
  { id: 'qty-asc', label: 'Нөөц ↑' },
  { id: 'qty-desc', label: 'Нөөц ↓' }];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--mute)', textTransform: 'uppercase',
        letterSpacing: '.06em', fontWeight: 600 }}>Эрэмблэх</span>
      <div style={{ display: 'inline-flex', gap: 2, padding: 3,
        background: 'rgba(255,255,255,.04)',
        border: '1px solid var(--border)', borderRadius: 10 }}>
        {opts.map((o) => {
          const active = value === o.id;
          return (
            <button key={o.id} onClick={() => onChange(o.id)}
            style={{
              padding: '6px 11px', borderRadius: 7, cursor: 'pointer',
              border: 'none', background: active ? 'var(--pri)' : 'transparent',
              color: active ? 'var(--priInk)' : 'var(--ink)',
              fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
              transition: 'background .12s, color .12s'
            }}>{o.label}</button>);

        })}
      </div>
    </div>);

}

function BigCard({ product }) {
  const inv = useInv();
  const cat = inv.catById[product.cat];
  const low = product.qty <= product.min;
  // Бодит үлдэгдэл: бааз нэгжээр (гр/мл/ш). Нээлттэй сав + бүтэн савууд.
  const size = parseSize(product.unit).amt;
  const baseU = baseLabel(product.unit);
  const openR = product.open ?? size;
  const totalBase = Math.max(0, (product.qty - 1) * size + openR);
  const nf = (n) => new Intl.NumberFormat('mn-MN').format(Math.round(n));
  const openPct = size > 0 ? Math.max(0, Math.min(1, openR / size)) : 0;
  const [hover, setHover] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');

  const startEdit = () => {setDraft(String(product.qty));setEditing(true);};
  const commitEdit = () => {
    inv.setQty(product.id, draft);
    setEditing(false);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {setHover(false);setConfirm(false);}}
      style={{
        background: 'var(--panel)', borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${low ? 'rgba(232,116,106,.35)' :
        hover ? 'var(--borderHi)' : 'var(--border)'}`,
        transition: 'border .12s, transform .12s, box-shadow .12s',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? '0 12px 32px rgba(0,0,0,.25)' : 'none',
        position: 'relative', display: 'flex', flexDirection: 'column'
      }}>
      <ProductArt product={product} cat={cat} height={180} />

      {/* Top-right hover delete with confirm-step. */}
      <div style={{
        position: 'absolute', top: 10, right: 10, opacity: hover ? 1 : 0,
        transition: 'opacity .12s', display: 'flex', gap: 4
      }}>
        <IconBtn danger title="Устгах" onClick={(e) => {
          e.stopPropagation();
          if (confirm) inv.removeProduct(product.id);else setConfirm(true);
        }}>
          {confirm ?
          <span style={{ fontSize: 11, fontWeight: 700, padding: '0 6px' }}>OK?</span> :
          <TrashIcon />}
        </IconBtn>
      </div>

      {low &&
      <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <Badge tone="danger" dot>Бага нөөц</Badge>
        </div>
      }

      <div style={{ padding: '14px 14px 14px', display: 'flex',
        flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' }}>
          {product.name}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--dim)',
          fontFamily: 'JetBrains Mono, monospace' }}>
          {fmtMNT(product.price)}
          <span style={{ opacity: .55 }}> / {product.unit}</span>
        </div>

        {/* Бодит үлдэгдэл — бааз нэгжээр. */}
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10,
          background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase',
              letterSpacing: '.06em', fontWeight: 600 }}>Үлдэгдэл</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: low ? 'var(--danger)' : 'var(--ink)' }}>{nf(totalBase)}</span>
              <span style={{ fontSize: 12, color: 'var(--dim)' }}> {baseU}</span>
            </span>
          </div>
          {/* Нээлттэй савын үлдэгдэл. */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5,
              color: 'var(--dim)', marginBottom: 4 }}>
              <span>Нээлттэй сав</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{nf(openR)} / {nf(size)} {baseU}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: openPct * 100 + '%',
                background: low ? 'var(--danger)' : 'var(--pri)',
                transition: 'width .25s' }} />
            </div>
          </div>
        </div>

        {/* Байх ёстой (min) vs одоо байгаа (qty) + stepper. */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-end', marginTop: 'auto',
          paddingTop: 14, gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase',
              letterSpacing: '.06em', marginBottom: 3,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span>Савны тоо</span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', color: 'var(--mute)',
                textTransform: 'none', letterSpacing: 0
              }}>байх ёстой {product.min}</span>
            </div>
            {editing ?
            <input
              type="number" autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();else
                if (e.key === 'Escape') setEditing(false);
              }}
              style={{
                width: 70, padding: '0 6px', height: 26,
                fontSize: 22, fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                background: 'rgba(255,255,255,.06)',
                border: '1px solid var(--pri)', borderRadius: 6,
                color: 'var(--ink)', outline: 'none',
                fontVariantNumeric: 'tabular-nums'
              }} /> :

            <button onClick={startEdit} title="Тоог шууд бичих"
            style={{
              background: 'transparent', border: 'none', padding: 0,
              cursor: 'text', color: low ? 'var(--danger)' : 'var(--ink)',
              fontSize: 22, fontWeight: 700, lineHeight: 1,
              fontFamily: 'JetBrains Mono, monospace',
              fontVariantNumeric: 'tabular-nums',
              borderBottom: '1px dashed transparent',
              transition: 'border-color .12s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = 'var(--borderHi)'}
            onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}>
                {product.qty}
              </button>
            }
          </div>
          <Stepper
            value={product.qty} low={low}
            onMinus={() => inv.bump(product.id, -1)}
            onPlus={() => inv.bump(product.id, +1)} />
          
        </div>
      </div>
    </div>);

}

function Empty({ onAdd }) {
  return (
    <div style={{
      padding: '80px 20px', textAlign: 'center',
      border: '1px dashed var(--border)', borderRadius: 14,
      color: 'var(--dim)'
    }}>
      <div style={{ fontSize: 14, marginBottom: 12 }}>Хайлтад тохирох бараа алга</div>
      <GhostBtn onClick={onAdd}><PlusIcon /> Шинэ бараа нэмэх</GhostBtn>
    </div>);

}

window.InventoryApp = InventoryApp;