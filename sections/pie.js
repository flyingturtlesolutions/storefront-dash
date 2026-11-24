// Share of the total by the table's breakdown dimension (category or region).
// Colors follow the entity in a fixed order, so filtering never repaints a slice.
const COLOR = { Apparel: 1, Footwear: 2, Accessories: 3, Home: 4, NA: 1, EU: 2, APAC: 3 };
const ADDITIVE = ['revenue', 'orders'];
let SL = null;

export default {
  watch: ['range', 'region', 'category', 'metric', 'by'],
  css: `
.pi{--p1:#2a78d6;--p2:#eb6834;--p3:#1baf7a;--p4:#eda100}
@media (prefers-color-scheme:dark){.pi{--p1:#3987e5;--p2:#d95926;--p3:#199e70;--p4:#c98500}}
.pi-body{display:flex;flex-wrap:wrap;align-items:center;gap:16px 28px}
.pi-plot{position:relative;flex:none;width:200px;height:200px}
.pi-plot svg{display:block;overflow:visible}
.pi-plot path{cursor:pointer;transition:opacity .15s}
.pi-lg{flex:1;min-width:220px;display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}
.pi-it{display:grid;grid-template-columns:12px 1fr auto 52px;align-items:center;gap:10px;width:100%;padding:6px 8px;border:0;border-radius:6px;background:none;text-align:left;font-size:13px;cursor:pointer}
.pi-it:hover{background:var(--neutral)}
.pi-it[aria-pressed="true"]{background:var(--accent-bg)}
.pi-it[aria-pressed="true"] .pi-n{font-weight:500;color:var(--accent-text)}
.pi-sw{width:12px;height:12px;border-radius:3px}
.pi-v,.pi-p{text-align:right;font-variant-numeric:tabular-nums}
.pi-p{color:var(--text-2)}
.pi-note{font-size:12px;color:var(--text-3)}`,
  mount(ctx) {
    const { el } = ctx;
    el.innerHTML = `<div class="card pi">
<div class="hd"><span class="t pi-t"></span><span class="gap"></span><span class="dsp">Click a slice to filter</span></div>
<div class="pi-body"><div class="pi-plot" role="img"></div><ul class="pi-lg"></ul></div>
<div class="pi-note" hidden></div></div>`;
    const plot = el.querySelector('.pi-plot');
    const toggle = k => {
      const S = ctx.state;
      if (S.by === 'category') ctx.set({ category: S.category === k ? null : k });
      else ctx.set({ region: S.region === k ? 'ALL' : k });
    };
    el.querySelector('.pi-lg').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) toggle(b.dataset.k); });
    plot.addEventListener('click', e => { const p = e.target.closest('path[data-k]'); if (p) toggle(p.dataset.k); });
    plot.addEventListener('pointermove', e => { const p = e.target.closest('path[data-k]'); if (p) tip(el, p.dataset.k, e); else untip(el); });
    plot.addEventListener('pointerleave', () => untip(el));
  },
  update(ctx) {
    const { el, core, state: S } = ctx;
    const m = ADDITIVE.includes(S.metric) ? S.metric : 'revenue';
    const rows = core.groups({ ...S, metric: m }, S.by);
    const total = rows.reduce((a, r) => a + r.v, 0) || 1;
    const sel = S.by === 'category' ? S.category : (S.region === 'ALL' ? null : S.region);
    const dim = S.by === 'category' ? 'category' : 'region';
    el.querySelector('.pi-t').textContent = core.MET[m].n + ' share by ' + dim;
    const note = el.querySelector('.pi-note');
    note.hidden = m === S.metric;
    note.textContent = m === S.metric ? '' : core.MET[S.metric].n + ' isn’t a total that splits into parts, so this shows revenue share.';

    const cx = 100, cy = 100, r = 96, f = v => v.toFixed(2);
    let a0 = -Math.PI / 2, h = '<svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">';
    SL = {};
    for (const row of rows) {
      const frac = row.v / total, a1 = a0 + frac * 2 * Math.PI, mid = (a0 + a1) / 2;
      const off = sel === row.k ? 6 : 0, ox = Math.cos(mid) * off, oy = Math.sin(mid) * off;
      const x0 = cx + ox + r * Math.cos(a0), y0 = cy + oy + r * Math.sin(a0), x1 = cx + ox + r * Math.cos(a1), y1 = cy + oy + r * Math.sin(a1);
      const d = frac >= 0.9999
        ? `M${cx} ${cy - r}A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}Z`
        : `M${f(cx + ox)} ${f(cy + oy)}L${f(x0)} ${f(y0)}A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${f(x1)} ${f(y1)}Z`;
      const faded = sel && sel !== row.k ? ' opacity=".35"' : '';
      if (frac > 0) h += `<path d="${d}" data-k="${row.k}" style="fill:var(--p${COLOR[row.k] || 1});stroke:var(--surface);stroke-width:2;stroke-linejoin:round"${faded}/>`;
      SL[row.k] = { n: row.n, v: core.fv(m, row.v), p: (frac * 100).toFixed(1) + '%' };
      a0 = a1;
    }
    const plot = el.querySelector('.pi-plot');
    plot.innerHTML = h + '</svg><div class="tip pi-tip" hidden></div>';
    plot.setAttribute('aria-label', core.MET[m].n + ' share by ' + dim + ': ' + rows.map(r => r.n + ' ' + SL[r.k].p).join(', ') + '.');

    el.querySelector('.pi-lg').innerHTML = rows.map(row =>
      `<li><button class="pi-it" data-k="${row.k}" aria-pressed="${sel === row.k}"><span class="pi-sw" style="background:var(--p${COLOR[row.k] || 1})"></span><span class="pi-n">${core.esc(row.n)}</span><span class="pi-v">${SL[row.k].v}</span><span class="pi-p">${SL[row.k].p}</span></button></li>`
    ).join('');
  }
};

function tip(el, k, e) {
  const s = SL && SL[k]; if (!s) return;
  const plot = el.querySelector('.pi-plot'), t = el.querySelector('.pi-tip'), r = plot.getBoundingClientRect();
  t.textContent = '';
  const d = document.createElement('div'); d.className = 'd'; d.textContent = s.n;
  const row = document.createElement('div'); row.className = 'r';
  const b = document.createElement('b'); b.textContent = s.v;
  const sp = document.createElement('span'); sp.textContent = s.p + ' of total';
  row.append(b, sp); t.append(d, row);
  t.hidden = false;
  t.style.left = Math.min(e.clientX - r.left + 12, r.width - 20) + 'px';
  t.style.top = Math.max(0, e.clientY - r.top - 20) + 'px';
}
function untip(el) { const t = el.querySelector('.pi-tip'); if (t) t.hidden = true; }
