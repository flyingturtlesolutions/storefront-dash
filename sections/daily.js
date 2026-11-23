let G = null, HV = null, LW = 0;

export default {
  watch: ['range', 'region', 'category', 'metric', 'compare'],
  css: `.dl-lgd{display:inline-flex;align-items:center;gap:14px;font-size:12px;color:var(--text-2)}`,
  mount(ctx) {
    const { el } = ctx;
    el.innerHTML = `<div class="card">
<div class="hd"><span class="t dl-t"></span><span class="dl-lgd"></span><span class="gap"></span>
<button class="chip on dl-ask" hidden><i class="ti ti-message-circle" aria-hidden="true"></i><span></span></button></div>
<div class="plot dl-plot" tabindex="0" role="group" aria-roledescription="chart" aria-label="Daily trend. Use left and right arrow keys to read each day, Enter to pick a day."></div>
<div class="sr-only dl-live" aria-live="polite"></div></div>`;
    const plot = el.querySelector('.dl-plot');
    const idxAt = cx => { const r = plot.getBoundingClientRect(), k = r.width ? G.W / r.width : 1; return Math.round(((cx - r.left) * k - G.L) / (G.W - G.L - G.R) * (G.n - 1)); };
    const clamp = i => Math.max(0, Math.min(G.n - 1, i));
    const pickDay = i => { const d = G.lo + i, S = ctx.state; ctx.set({ day: S.day === d ? null : d }); };
    plot.addEventListener('pointermove', e => G && hover(ctx, clamp(idxAt(e.clientX))));
    plot.addEventListener('pointerleave', () => unhover(el));
    plot.addEventListener('click', e => G && pickDay(clamp(idxAt(e.clientX))));
    plot.addEventListener('keydown', e => {
      if (!G) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); const i = clamp(HV == null ? G.n - 1 : HV + (e.key === 'ArrowRight' ? 1 : -1)); hover(ctx, i);
        el.querySelector('.dl-live').textContent = ctx.core.lab(G.lo + i) + ': ' + ctx.core.fv(G.m, G.cur[i]);
      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (HV != null) pickDay(HV); }
      else if (e.key === 'Escape') unhover(el);
    });
    el.querySelector('.dl-ask').addEventListener('click', () => {
      const S = ctx.state; if (S.day != null) window.dispatchEvent(new CustomEvent('dash:ask', { detail: 'What happened on ' + ctx.core.lab(S.day) + '?' }));
    });
    new ResizeObserver(() => { const w = plot.clientWidth; if (w && w !== LW) { LW = w; draw(ctx); } }).observe(plot);
  },
  update(ctx) { draw(ctx); }
};

function draw(ctx) {
  const { el, core, state: S } = ctx, plot = el.querySelector('.dl-plot');
  const m = S.metric, cur = core.series(S, false), prv = core.series(S, true), n = cur.length;
  const W = plot.clientWidth || 640, H = 200, L = 50, R = 12, T = 10, B = 24, w = core.win(S, false);
  const all = cur.concat(S.compare ? prv : []), mx = Math.max(...all), mn = Math.min(...all), zero = m === 'revenue' || m === 'orders';
  const sc = core.nice(zero ? 0 : Math.max(0, mn - (mx - mn) * .2), mx + (mx - mn) * .06, 4);
  const x = i => L + (W - L - R) * (n > 1 ? i / (n - 1) : .5), y = v => T + (H - T - B) * (1 - (v - sc.a) / (sc.b - sc.a));
  const f = v => v.toFixed(1), path = a => a.map((v, i) => (i ? 'L' : 'M') + f(x(i)) + ' ' + f(y(v))).join('');
  let h = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  sc.t.forEach((t, i) => { const yy = f(y(t)); h += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" style="stroke:var(${i ? '--border' : '--border-2'})"/><text x="${L - 8}" y="${yy}" dy="4" text-anchor="end" font-size="11" style="fill:var(--text-3);font-variant-numeric:tabular-nums">${core.ct(m, t)}</text>`; });
  const cnt = W < 480 ? 3 : W < 560 ? 4 : 5, stp = Math.max(1, Math.ceil((n - 1) / (cnt - 1))), ix = [];
  for (let j = 0; j < n; j += stp) ix.push(j);
  if (ix[ix.length - 1] !== n - 1) { if (n - 1 - ix[ix.length - 1] < stp / 2) ix[ix.length - 1] = n - 1; else ix.push(n - 1); }
  ix.forEach(i => { h += `<text x="${f(x(i))}" y="${H - 6}" font-size="11" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}" style="fill:var(--text-3)">${core.lab(w[0] + i)}</text>`; });
  if (S.compare) h += `<path d="${path(prv)}" fill="none" style="stroke:var(--muted-line)" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" stroke-linecap="round"/>`;
  h += `<path d="${path(cur)}L${f(x(n - 1))} ${f(y(sc.a))}L${f(x(0))} ${f(y(sc.a))}Z" style="fill:var(--s1)" fill-opacity=".1"/>`;
  h += `<path d="${path(cur)}" fill="none" style="stroke:var(--s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const dot = 'style="fill:var(--s1);stroke:var(--surface);stroke-width:2"';
  if (n <= 14) cur.forEach((v, i) => { h += `<circle cx="${f(x(i))}" cy="${f(y(v))}" r="4" ${dot}/>`; });
  else h += `<circle cx="${f(x(n - 1))}" cy="${f(y(cur[n - 1]))}" r="4" ${dot}/>`;
  const di = S.day != null ? S.day - w[0] : -1;
  if (di >= 0 && di < n) h += `<line x1="${f(x(di))}" x2="${f(x(di))}" y1="${T}" y2="${H - B}" style="stroke:var(--border-3)"/><circle cx="${f(x(di))}" cy="${f(y(cur[di]))}" r="8" fill="none" style="stroke:var(--s1)" stroke-opacity=".35" stroke-width="2"/><circle cx="${f(x(di))}" cy="${f(y(cur[di]))}" r="5" ${dot}/>`;
  h += '<g class="dl-hv"></g></svg><div class="tip dl-tip" hidden></div>';
  plot.innerHTML = h;
  G = { W, L, R, T, H, B, n, lo: w[0], cur, prv, x, y, m }; HV = null;
  el.querySelector('.dl-t').textContent = core.MET[m].n + ', daily';
  el.querySelector('.dl-lgd').innerHTML = '<span><span class="k"></span>This period</span>' + (S.compare ? '<span><span class="k p"></span>Previous period</span>' : '');
  const ask = el.querySelector('.dl-ask'); ask.hidden = S.day == null;
  if (S.day != null) ask.lastElementChild.textContent = 'Ask about ' + core.lab(S.day);
}

function hover(ctx, i) {
  const { el, core, state: S } = ctx, g = G; HV = i;
  const xx = g.x(i), m = g.m, v = g.cur[i], p = g.prv[i], d = g.lo + i, pd = d - S.range;
  const ring = c => `style="stroke:var(--surface);stroke-width:2;fill:var(${c})"`;
  el.querySelector('.dl-hv').innerHTML = `<line x1="${xx.toFixed(1)}" x2="${xx.toFixed(1)}" y1="${g.T}" y2="${g.H - g.B}" style="stroke:var(--border-3)"/>` + (S.compare ? `<circle cx="${xx.toFixed(1)}" cy="${g.y(p).toFixed(1)}" r="5" ${ring('--muted-line')}/>` : '') + `<circle cx="${xx.toFixed(1)}" cy="${g.y(v).toFixed(1)}" r="5" ${ring('--s1')}/>`;
  const tip = el.querySelector('.dl-tip'); tip.textContent = '';
  const add = (cls, txt) => { const e = document.createElement('div'); e.className = cls; if (txt) e.textContent = txt; tip.appendChild(e); return e; };
  add('d', core.WD[core.dt(d).getDay()] + ', ' + core.lab(d));
  const row = (key, b, s, color) => { const r = add('r'); if (key != null) { const k = document.createElement('span'); k.className = 'k' + key; r.appendChild(k); } const bb = document.createElement('b'); bb.textContent = b; if (color) bb.style.color = color; const ss = document.createElement('span'); ss.textContent = s; r.append(bb, ss); };
  row('', core.fv(m, v), 'This period');
  if (S.compare) { row(' p', core.fv(m, p), core.lab(pd)); const x2 = core.fd(m, v, p); row(null, x2.t, 'vs ' + core.lab(pd), x2.s > 0 ? 'var(--success)' : x2.s < 0 ? 'var(--danger)' : ''); }
  add('h', 'Click to pick this day');
  tip.hidden = false; const tw = tip.offsetWidth; let lx = xx + 14; if (lx + tw > g.W) lx = xx - 14 - tw; tip.style.left = Math.max(0, lx) + 'px';
}
function unhover(el) { HV = null; const hv = el.querySelector('.dl-hv'), tip = el.querySelector('.dl-tip'); if (hv) hv.innerHTML = ''; if (tip) tip.hidden = true; }
