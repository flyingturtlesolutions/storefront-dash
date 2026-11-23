export default {
  watch: ['by', 'sort'],
  css: `
.tb{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px}
.tb th,.tb td{height:34px;padding:0 6px;text-align:left;border-top:.5px solid var(--border);font-weight:400}
.tb th{height:28px;border-top:0;font-size:12px;color:var(--text-2)}
.tb .n{text-align:right;font-variant-numeric:tabular-nums}
.tb th button{padding:0;border:0;background:none;font-size:12px;cursor:pointer;white-space:nowrap;color:inherit}
.tb th button:hover{color:var(--text)}
.tb tr.row{cursor:pointer}
.tb tr.row:hover td{background:var(--neutral)}
.tb tr.sel td{background:var(--accent-bg)}
.tb .nm{padding:0;border:0;background:none;font-size:13px;text-align:left;cursor:pointer}
.tb tr.sel .nm{font-weight:500;color:var(--accent-text)}
.tb td.bc{padding-right:0}
.tb .b2{height:6px;min-width:2px;border-radius:0 4px 4px 0;background:var(--s1)}
.tb .dlt{font-size:12px}
@media (max-width:520px){.tb .bc{display:none}.tb{table-layout:auto}}`,
  mount(ctx) {
    const { el } = ctx;
    el.innerHTML = `<div class="card">
<div class="hd"><span class="t">Breakdown by</span>
<span class="seg tb-by" role="group" aria-label="Breakdown dimension"><button data-by="category">Category</button><button data-by="region">Region</button></span>
<span class="gap"></span><span class="dsp">Click a row to filter</span></div><div class="tb-body"></div></div>`;
    el.querySelector('.tb-by').addEventListener('click', e => { const b = e.target.closest('button'); if (b) ctx.set({ by: b.dataset.by }); });
    el.querySelector('.tb-body').addEventListener('click', e => {
      const S = ctx.state, s = e.target.closest('[data-sort]');
      if (s) { const k = s.dataset.sort; ctx.set({ sort: { k, d: S.sort.k === k ? -S.sort.d : -1 } }); return; }
      const r = e.target.closest('tr.row'); if (!r) return; const k = r.dataset.k;
      if (S.by === 'category') ctx.set({ category: S.category === k ? null : k }); else ctx.set({ region: S.region === k ? 'ALL' : k });
    });
  },
  update(ctx) {
    const { el, core, state: S } = ctx, m = S.metric, g = core.groups(S, S.by), k = S.sort.k, dr = S.sort.d;
    el.querySelectorAll('.tb-by button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.by === S.by)));
    g.sort((a, b) => { const d = k === 'delta' ? b.rel - a.rel : b.v - a.v; return dr === -1 ? d : -d; });
    const mx = Math.max(...g.map(r => r.v)) || 1, cur = S.by === 'category' ? S.category : S.region;
    const ar = c => k === c ? ` <i class="ti ti-arrow-${dr === -1 ? 'down' : 'up'}" aria-hidden="true"></i>` : '';
    const aria = c => k === c ? (dr === -1 ? 'descending' : 'ascending') : 'none';
    const focus = document.activeElement?.dataset?.fid;
    let h = `<table class="tb"><colgroup><col style="width:${S.compare ? 30 : 38}%"><col style="width:${S.compare ? 22 : 24}%">${S.compare ? '<col style="width:22%">' : ''}<col></colgroup>
<thead><tr><th>${S.by === 'region' ? 'Region' : 'Category'}</th><th class="n" aria-sort="${aria('value')}"><button data-sort="value" data-fid="s-value">${core.MET[m].n}${ar('value')}</button></th>${S.compare ? `<th class="n" aria-sort="${aria('delta')}"><button data-sort="delta" data-fid="s-delta">Change${ar('delta')}</button></th>` : ''}<th class="bc"></th></tr></thead><tbody>`;
    for (const r of g) {
      const sel = cur === r.k, x = core.fd(m, r.v, r.p);
      h += `<tr class="row${sel ? ' sel' : ''}" data-k="${r.k}"><td><button class="nm" data-fid="r-${r.k}" aria-pressed="${sel}">${core.esc(r.n)}</button></td><td class="n">${core.fv(m, r.v)}</td>${S.compare ? `<td class="n"><span class="dlt ${x.s > 0 ? 'up' : x.s < 0 ? 'dn' : ''}">${x.t}</span></td>` : ''}<td class="bc"><div class="b2" style="width:${Math.max(1, Math.round(r.v / mx * 100))}%"></div></td></tr>`;
    }
    el.querySelector('.tb-body').innerHTML = h + '</tbody></table>';
    if (focus) el.querySelector(`[data-fid="${focus}"]`)?.focus({ preventScroll: true });
  }
};
