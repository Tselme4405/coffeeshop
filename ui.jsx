// Shared atoms: theme styles, modal, stepper, top-bar pieces.

// Theme is exposed via CSS variables on each artboard root so the Tweaks panel
// can swap the primary color without remounting components.
const baseTheme = {
  bg:        '#0e1116',
  panel:     '#171b22',
  panel2:    '#1d222b',
  border:    'rgba(255,255,255,.08)',
  borderHi:  'rgba(255,255,255,.16)',
  text:      '#e7eaf0',
  textDim:   'rgba(231,234,240,.65)',
  textMute:  'rgba(231,234,240,.42)',
  danger:    '#e8746a',
  warn:      '#e6b54a',
  ok:        '#5fbf8a',
};

const themeVars = (primary) => ({
  '--ink':     baseTheme.text,
  '--dim':     baseTheme.textDim,
  '--mute':    baseTheme.textMute,
  '--bg':      baseTheme.bg,
  '--panel':   baseTheme.panel,
  '--panel2':  baseTheme.panel2,
  '--border':  baseTheme.border,
  '--borderHi':baseTheme.borderHi,
  '--danger':  baseTheme.danger,
  '--warn':    baseTheme.warn,
  '--ok':      baseTheme.ok,
  '--pri':     primary,
  '--priInk':  '#fff',
  fontFamily:  'Inter, ui-sans-serif, system-ui, sans-serif',
  color:       baseTheme.text,
  background:  baseTheme.bg,
});

// Stepper used by every variation: minus / number / plus, locks at 0, sets a
// hover halo, and shows a red ring when at/under the configured min stock.
function Stepper({ value, onMinus, onPlus, low, size = 'md' }) {
  const dim = size === 'sm' ? 26 : size === 'lg' ? 36 : 30;
  const fs  = size === 'sm' ? 12 : size === 'lg' ? 16 : 13;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: 'rgba(255,255,255,.04)',
      border: `1px solid ${low ? 'var(--danger)' : 'var(--border)'}`,
      borderRadius: 999, padding: 2,
    }}>
      <StepBtn size={dim} onClick={onMinus} disabled={value <= 0}>−</StepBtn>
      <span style={{
        minWidth: dim + 8, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace',
        fontSize: fs, fontWeight: 600, color: low ? 'var(--danger)' : 'var(--ink)',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</span>
      <StepBtn size={dim} onClick={onPlus}>+</StepBtn>
    </div>
  );
}

function StepBtn({ size, onClick, disabled, children }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: hover && !disabled ? 'var(--pri)' : 'transparent',
        color: hover && !disabled ? 'var(--priInk)' : disabled ? 'var(--mute)' : 'var(--ink)',
        fontSize: 14, fontWeight: 600, lineHeight: 1, transition: 'background .12s, color .12s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
      }}>
      {children}
    </button>
  );
}

// Pill used for low-stock / counts.
function Badge({ tone = 'mute', children, dot }) {
  const colors = {
    mute:   { bg: 'rgba(255,255,255,.06)', fg: 'var(--dim)' },
    danger: { bg: 'rgba(232,116,106,.16)', fg: 'var(--danger)' },
    warn:   { bg: 'rgba(230,181,74,.14)',  fg: 'var(--warn)' },
    ok:     { bg: 'rgba(95,191,138,.14)',  fg: 'var(--ok)' },
    pri:    { bg: 'color-mix(in oklab, var(--pri) 18%, transparent)', fg: 'var(--pri)' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
      borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: '.02em',
      background: colors.bg, color: colors.fg,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: 'currentColor' }} />}
      {children}
    </span>
  );
}

// Borderless icon button.
function IconBtn({ onClick, title, children, danger }) {
  const [h, setH] = React.useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
        background: h ? (danger ? 'rgba(232,116,106,.18)' : 'rgba(255,255,255,.07)') : 'transparent',
        color: danger ? 'var(--danger)' : 'var(--dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .12s, color .12s', padding: 0,
      }}>
      {children}
    </button>
  );
}

// Primary CTA. Background uses --pri so Tweaks recolor it for free.
function PriBtn({ onClick, children, size = 'md', full }) {
  const [h, setH] = React.useState(false);
  const pad = size === 'sm' ? '7px 12px' : size === 'lg' ? '12px 22px' : '9px 16px';
  const fs  = size === 'sm' ? 12 : size === 'lg' ? 14 : 13;
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: pad, fontSize: fs, fontWeight: 600, borderRadius: 10,
        border: 'none', cursor: 'pointer', background: 'var(--pri)',
        color: 'var(--priInk)', display: 'inline-flex', alignItems: 'center',
        gap: 7, transition: 'transform .08s, filter .12s', filter: h ? 'brightness(1.08)' : 'none',
        width: full ? '100%' : 'auto', justifyContent: 'center',
        fontFamily: 'inherit', letterSpacing: '.01em',
      }}>{children}</button>
  );
}

function GhostBtn({ onClick, children, size = 'md' }) {
  const [h, setH] = React.useState(false);
  const pad = size === 'sm' ? '7px 12px' : '9px 16px';
  const fs  = size === 'sm' ? 12 : 13;
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: pad, fontSize: fs, fontWeight: 500, borderRadius: 10,
        border: `1px solid ${h ? 'var(--borderHi)' : 'var(--border)'}`,
        cursor: 'pointer', background: h ? 'rgba(255,255,255,.04)' : 'transparent',
        color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 7,
        transition: 'border .12s, background .12s', fontFamily: 'inherit',
      }}>{children}</button>
  );
}

// Search field — used in A and B's top bars.
// Дэлгэцийн өргөнөөр гар утас эсэхийг мэдрэгч.
function useIsMobile(bp = 720) {
  const [m, setM] = React.useState(
    () => typeof window !== 'undefined' && window.innerWidth <= bp);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp}px)`);
    const on = () => setM(mq.matches); on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [bp]);
  return m;
}

function SearchField({ value, onChange, placeholder = 'Бараа хайх...', width = 280 }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '8px 12px', width, transition: 'border .12s',
    }}
    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--borderHi)')}
    onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}>
      <SearchIcon />
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13,
        }} />
      {value && (
        <button onClick={() => onChange('')} title="Цэвэрлэх"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                   color: 'var(--mute)', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
      )}
    </div>
  );
}

// Top-level group filter pill row (Бүгд / Түүхий эд / Дагалдах хэрэгсэл).
// `value` is a group id or 'all'.
function CategoryPills({ value, onChange, products }) {
  const inv = useInv();
  const counts = React.useMemo(() => {
    const m = { all: products.length };
    inv.groups.forEach((g) => (m[g.id] = 0));
    products.forEach((p) => {
      const g = inv.groupOf(p);
      if (g) m[g] = (m[g] || 0) + 1;
    });
    return m;
  }, [products, inv.groups, inv.groupOf]);
  const all = [{ id: 'all', name: 'Бүгд' }, ...inv.groups];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {all.map((c) => {
        const active = value === c.id;
        return (
          <button key={c.id} onClick={() => onChange(c.id)}
            style={{
              padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
              background: active ? 'var(--pri)' : 'transparent',
              color: active ? 'var(--priInk)' : 'var(--ink)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: 7,
              transition: 'background .12s, border .12s, color .12s',
            }}>
            {c.name}
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              opacity: active ? .8 : .55,
            }}>{counts[c.id] || 0}</span>
          </button>
        );
      })}
    </div>
  );
}

// Lightweight icons — kept inline so individual artboards can scale them with
// font-size if needed.
function SearchIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         stroke="currentColor" strokeWidth="1.6" style={{ color: 'var(--mute)' }}>
      <circle cx="7" cy="7" r="5" /><path d="M14 14l-3.2-3.2" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
function ChevronRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}
function TrashIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 5h10M6 5V3.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V5M5 5l.7 8a1 1 0 0 0 1 .9h2.6a1 1 0 0 0 1-.9L11 5" />
    </svg>
  );
}
function EditIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z" />
    </svg>
  );
}
function ArrowUp({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 10V2M2.5 5.5L6 2l3.5 3.5" />
    </svg>
  );
}
function ArrowDown({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 2v8M2.5 6.5L6 10l3.5-3.5" />
    </svg>
  );
}

// "Add product" modal — uses portal-like absolute positioning inside the
// artboard rather than the document body so the dialog stays scoped to each
// variation's frame.
function AddProductModal({ open, onClose, defaultGroup }) {
  const inv = useInv();
  const firstGroup = defaultGroup && defaultGroup !== 'all' ? defaultGroup : inv.groups[0].id;
  const [name, setName]   = React.useState('');
  const [group, setGroup] = React.useState(firstGroup);
  const [unit, setUnit]   = React.useState('1L');
  const [price, setPrice] = React.useState('');
  const [qty, setQty]     = React.useState('');
  const [min, setMin]     = React.useState('5');
  const [img, setImg]     = React.useState(null);

  React.useEffect(() => {
    if (open) {
      const g = defaultGroup && defaultGroup !== 'all' ? defaultGroup : inv.groups[0].id;
      setName(''); setGroup(g); setUnit('1L'); setPrice(''); setQty(''); setMin('5'); setImg(null);
    }
  }, [open, defaultGroup]);

  if (!open) return null;
  const submit = () => {
    if (!name.trim()) return;
    inv.addProduct({ name, group, unit, price, qty, min, img });
    onClose();
  };

  const onPickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImg(r.result);
    r.readAsDataURL(f);
  };

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, background: 'rgba(8,10,14,.6)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(420px, 100%)', maxHeight: '90vh', overflow: 'auto',
        background: 'var(--panel)', borderRadius: 16,
        border: '1px solid var(--border)', padding: 22,
        boxShadow: '0 24px 80px rgba(0,0,0,.55)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Шинэ бараа нэмэх</div>
            <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>Бараа материалд бүртгэгдэнэ.</div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--dim)', fontSize: 18,
            cursor: 'pointer', width: 28, height: 28, borderRadius: 8,
          }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Барааны зураг">
            <ImagePicker value={img} onChange={setImg} onPickFile={onPickFile} />
          </Field>
          <Field label="Барааны нэр">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="жнь. Гүзээлзгэнэ сироп" style={inputCss} />
          </Field>
          <Field label="Бүлэг">
            <div style={{ display: 'flex', gap: 6 }}>
              {inv.groups.map((g) => (
                <button key={g.id} onClick={() => setGroup(g.id)}
                  style={{
                    flex: 1, padding: '9px 12px', borderRadius: 9, cursor: 'pointer',
                    border: `1px solid ${group === g.id ? 'transparent' : 'var(--border)'}`,
                    background: group === g.id ? 'var(--pri)' : 'transparent',
                    color: group === g.id ? 'var(--priInk)' : 'var(--ink)',
                    fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                    transition: 'background .12s, border .12s, color .12s',
                  }}>{g.name}</button>
              ))}
            </div>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Хэмжээ (нэгж)"><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="1L / 1kg / 50ш" style={inputCss} /></Field>
            <Field label="Үнэ (₮)"><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" style={inputCss} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Одоо хэд байгаа"><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" style={inputCss} /></Field>
            <Field label="Хэдэн байх ёстой"><input type="number" value={min} onChange={(e) => setMin(e.target.value)} placeholder="5" style={inputCss} /></Field>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <GhostBtn onClick={onClose}>Болих</GhostBtn>
          <PriBtn onClick={submit}>Нэмэх</PriBtn>
        </div>
      </div>
    </div>
  );
}

const inputCss = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'rgba(255,255,255,.03)',
  color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
};

// Image upload field for the add-product modal. Reads files as data-URIs so
// new products survive only for the session — the prototype doesn't persist
// uploads to disk. Drag-and-drop is supported.
function ImagePicker({ value, onChange, onPickFile }) {
  const inputRef = React.useRef(null);
  const [drag, setDrag] = React.useState(false);
  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange(r.result);
    r.readAsDataURL(f);
  };
  return (
    <div
      onClick={() => inputRef.current && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        gap: 12, padding: 10, borderRadius: 10, cursor: 'pointer',
        border: `1px dashed ${drag ? 'var(--pri)' : 'var(--border)'}`,
        background: drag ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.02)',
        transition: 'border .12s, background .12s',
      }}>
      <div style={{
        width: 64, height: 64, borderRadius: 8, flex: '0 0 64px',
        background: value ? '#fff' : 'rgba(255,255,255,.04)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {value
          ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8.5" cy="10" r="1.5" />
              <path d="M21 16l-5-5L7 20" />
            </svg>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>
          {value ? 'Зураг хадгалагдсан' : 'Зураг сонгох эсвэл чирж оруулна уу'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--mute)', marginTop: 2 }}>
          {value ? 'Дарж солих, эсвэл устгах' : 'PNG, JPG · 2MB хүртэл'}
        </div>
      </div>
      {value && (
        <button onClick={(e) => { e.stopPropagation(); onChange(null); }}
          title="Зураг арилгах"
          style={{
            background: 'transparent', border: 'none', color: 'var(--dim)',
            cursor: 'pointer', fontSize: 16, padding: '4px 8px', borderRadius: 6,
          }}>×</button>
      )}
      <input ref={inputRef} type="file" accept="image/*"
        onChange={onPickFile} style={{ display: 'none' }} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, color: 'var(--dim)', fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
      {children}
    </label>
  );
}

// Filter helper — shared across the three variations so the same search +
// category state filters identically.
function useFiltered() {
  const inv = useInv();
  const [q, setQ]   = React.useState('');
  const [cat, setC] = React.useState('all');
  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return inv.products.filter((p) => {
      if (cat !== 'all' && p.cat !== cat) return false;
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [inv.products, q, cat]);
  return { q, setQ, cat, setC, filtered };
}

Object.assign(window, {
  themeVars, Stepper, Badge, IconBtn, PriBtn, GhostBtn, useIsMobile,
  SearchField, CategoryPills, AddProductModal, Field, useFiltered,
  SearchIcon, PlusIcon, ChevronRight, TrashIcon, EditIcon, ArrowUp, ArrowDown,
});
