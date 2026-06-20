// Root app — full-bleed inventory prototype (single variation).
// Tweaks panel exposes primary color.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "primaryColor": "#d97757"
}/*EDITMODE-END*/;

const PRIMARY_OPTIONS = [
  '#d97757', // nutmeg (default)
  '#e6b54a', // amber
  '#5fbf8a', // green
  '#5b9eff', // cobalt
  '#b783e8', // lilac
  '#e8746a', // coral
];

// View switch — flips between бараа материал (stock) ба борлуулалт (sales).
const ViewCtx = React.createContext(null);
const useView = () => React.useContext(ViewCtx);

function ViewSwitch() {
  const { view, setView } = useView();
  const opts = [
    { id: 'stock', label: 'Бараа материал' },
    { id: 'sales', label: 'Борлуулалт' },
  ];
  return (
    <div style={{ display: 'inline-flex', gap: 2, padding: 3,
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid var(--border)', borderRadius: 11 }}>
      {opts.map((o) => {
        const active = view === o.id;
        return (
          <button key={o.id} onClick={() => setView(o.id)}
            style={{
              padding: '7px 14px', borderRadius: 8, cursor: 'pointer', border: 'none',
              background: active ? 'var(--pri)' : 'transparent',
              color: active ? 'var(--priInk)' : 'var(--ink)',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
              transition: 'background .12s, color .12s',
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}
window.ViewSwitch = ViewSwitch;

// Жижигхэн, эвтэйхэн зохиогчийн тэмдэг — буланд.
function MadeBy() {
  const [h, setH] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        position: 'fixed', right: 14, bottom: 12, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '6px 11px 6px 9px', borderRadius: 999,
        background: 'rgba(12,15,20,.72)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--border)',
        fontFamily: 'inherit', fontSize: 11, color: 'var(--dim)',
        letterSpacing: '.02em', userSelect: 'none', pointerEvents: 'auto',
        boxShadow: h ? '0 6px 22px rgba(0,0,0,.35)' : 'none',
        transition: 'box-shadow .15s, transform .15s',
        transform: h ? 'translateY(-1px)' : 'none',
      }}>
      <span style={{
        width: 16, height: 16, borderRadius: 5, background: 'var(--pri)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: 'var(--priInk)',
      }}>T</span>
      <span>made by <span style={{ color: 'var(--ink)', fontWeight: 600 }}>tselmeg</span></span>
    </div>
  );
}
window.MadeBy = MadeBy;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = React.useState('stock');

  return (
    <InvProvider>
    <SalesProvider>
    <ViewCtx.Provider value={{ view, setView }}>
      <div style={{
        ...themeVars(t.primaryColor),
        position: 'fixed', inset: 0, overflow: 'hidden',
      }}>
        {view === 'stock' ? <InventoryApp /> : <ProductSalesApp />}
      </div>

      <MadeBy />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Үндсэн өнгө" />
        <TweakColor
          label="Primary"
          value={t.primaryColor}
          options={PRIMARY_OPTIONS}
          onChange={(v) => setTweak('primaryColor', v)}
        />
      </TweaksPanel>
    </ViewCtx.Provider>
    </SalesProvider>
    </InvProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
