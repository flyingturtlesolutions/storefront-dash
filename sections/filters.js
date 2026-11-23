export default {
  watch: [],
  css: `
.f-wrap{display:flex;flex-direction:column;gap:8px}
.f-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
.f-ttl{font-size:16px;font-weight:500}
.f-sw{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-2);cursor:pointer}
.f-x{border:0;background:none;padding:0;cursor:pointer;color:inherit;display:inline-flex}`,
  mount(ctx) {
    const { el, core } = ctx;
    el.innerHTML = `<div class="f-wrap">
<div class="f-row"><span class="f-ttl"></span><span class="dsp f-span"></span></div>
<div class="f-row" role="group" aria-label="Filters">
<span class="seg f-range" role="group" aria-label="Date range">${core.RANGES.map(r => `<button data-r="${r}">${r}d</button>`).join('')}</span>
<select class="f-reg" aria-label="Region"><option value="ALL">All regions</option>${core.REG.map(r => `<option value="${r.k}">${r.n}</option>`).join('')}</select>
<span class="chip on f-cat" hidden><span class="f-catn"></span><button class="f-x" aria-label="Clear category filter"><i class="ti ti-x" aria-hidden="true"></i></button></span>
<label class="f-sw"><input type="checkbox" class="f-cmp"> Compare to previous period</label>
</div></div>`;
    el.querySelector('.f-ttl').textContent = ctx.cfg.title || 'Dashboard';
    el.querySelector('.f-range').addEventListener('click', e => { const b = e.target.closest('button'); if (b) ctx.set({ range: +b.dataset.r }); });
    el.querySelector('.f-reg').addEventListener('change', e => ctx.set({ region: e.target.value }));
    el.querySelector('.f-cmp').addEventListener('change', e => ctx.set({ compare: e.target.checked }));
    el.querySelector('.f-x').addEventListener('click', () => ctx.set({ category: null }));
  },
  update(ctx) {
    const { el, core, state: S } = ctx;
    el.querySelectorAll('.f-range button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.r === S.range)));
    el.querySelector('.f-reg').value = S.region;
    el.querySelector('.f-cmp').checked = S.compare;
    const [a, b] = core.win(S, false);
    el.querySelector('.f-span').textContent = core.lab(a) + ' – ' + core.lab(b - 1);
    el.querySelector('.f-cat').hidden = !S.category;
    if (S.category) el.querySelector('.f-catn').textContent = S.category;
  }
};
