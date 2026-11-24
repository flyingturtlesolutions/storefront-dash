let RH = [], RG = null, RHV = null, timer = null, LW = 0;

export default {
  watch: ['region', 'category'],
  css: `
.rp-live{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--live)}
.rp-dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:rpbl 1.6s infinite}
@keyframes rpbl{0%,100%{opacity:1}50%{opacity:.3}}
@media (prefers-reduced-motion:reduce){.rp-dot{animation:none}}`,
  mount(ctx) {
    const { el, core } = ctx, R = core.rng(11);
    const tod = m => { const x = new Date(m * 60000), h = x.getHours() + x.getMinutes() / 60; return 1 + .55 * Math.sin(2 * Math.PI * (h - 14) / 24); };
    ctx.rk = m => tod(m) * (.55 + .9 * R()) * (R() < .04 ? 1.8 : 1);
    const m0 = Math.floor(Date.now() / 60000);
    RH = []; for (let i = 59; i >= 0; i--) RH.push({ m: m0 - i, k: ctx.rk(m0 - i) });
    el.innerHTML = `<div class="card">
<div class="hd"><span class="t">Revenue per minute</span><span class="rp-live"><span class="rp-dot" aria-hidden="true"></span>Live</span><span class="gap"></span><span class="dsp rp-s"></span></div>
<div class="plot rp-plot" role="img" aria-label="Revenue per minute over the last 60 minutes"></div></div>`;
    const plot = el.querySelector('.rp-plot');
    plot.addEventListener('pointermove', e => { if (!RG) return; const r = plot.getBoundingClientRect(), k = r.width ? RG.W / r.width : 1; hover(el, Math.floor(((e.clientX - r.left) * k - RG.L) / RG.band)); });
    plot.addEventListener('pointerleave', () => unhover(el));
    const ro = new ResizeObserver(() => { const w = plot.clientWidth; if (w && w !== LW) { LW = w; draw(ctx); } });
    ro.observe(plot);
    clearInterval(timer);
    timer = setInterval(() => {
      if (document.hidden) return;
      const m = Math.floor(Date.now() / 60000);
      while (RH[RH.length - 1].m < m) { const nm = RH[RH.length - 1].m + 1; RH.push({ m: nm, k: ctx.rk(nm) }); if (RH.length > 60) RH.shift(); }
      draw(ctx);
    }, 2000);
    ctx.signal?.addEventListener('abort', () => { clearInterval(timer); ro.disconnect(); });
  },
  update(ctx, changed) { if (!changed || changed.some(k => ['region', 'category'].includes(k)) || !RG) draw(ctx); }
};

const hm = m => { const x = new Date(m * 60000); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
const fm = v => v >= 100 ? '$' + Math.round(v).toLocaleString('en-US') : '$' + v.toFixed(2);

function base(core, S) {
  let t = 0;
  for (let d = core.N - 7; d < core.N; d++) for (const x of core.BYD[d]) if ((S.region === 'ALL' || x.r === S.region) && (!S.category || x.c === S.category)) t += x.v;
  return t / 7 / 1440;
}

function draw(ctx) {
  const { el, core, state: S } = ctx, plot = el.querySelector('.rp-plot');
  const W = plot.clientWidth || 640, H = 140, L = 50, R = 12, T = 8, B = 22, b = base(core, S), n = RH.length, fr = (Date.now() % 60000) / 60000;
  const vals = RH.map((r, i) => r.k * b * (i === n - 1 ? fr : 1)), full = vals.slice(0, -1);
  const sc = core.nice(0, Math.max(...RH.map(r => r.k * b)), 3), band = (W - L - R) / n, bw = Math.min(24, Math.max(2, band - 2)), yb = H - B;
  const y = v => T + (H - T - B) * (1 - v / sc.b), f = v => v.toFixed(1);
  let h = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  sc.t.forEach((t, i) => { const yy = f(y(t)); h += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" style="stroke:var(${i ? '--border' : '--border-2'})"/><text x="${L - 8}" y="${yy}" dy="4" text-anchor="end" font-size="11" style="fill:var(--text-3);font-variant-numeric:tabular-nums">$${+t.toFixed(2)}</text>`; });
  [[L, hm(RH[0].m), 'start'], [L + 30.5 * band, hm(RH[30].m), 'middle'], [W - R, 'Now', 'end']].forEach(([xx, t, a]) => { h += `<text x="${f(xx)}" y="${H - 6}" font-size="11" text-anchor="${a}" style="fill:var(--text-3)">${t}</text>`; });
  h += '<g class="rp-hb"></g>';
  vals.forEach((v, i) => {
    const x0 = L + i * band + (band - bw) / 2, x1 = x0 + bw, yt = y(v), r = Math.min(4, bw / 2, yb - yt);
    if (yb - yt < .5) return;
    h += `<path d="M${f(x0)} ${yb}V${f(yt + r)}Q${f(x0)} ${f(yt)} ${f(x0 + r)} ${f(yt)}H${f(x1 - r)}Q${f(x1)} ${f(yt)} ${f(x1)} ${f(yt + r)}V${yb}Z" style="fill:var(--s1)"${i === n - 1 ? ' fill-opacity=".4"' : ''}/>`;
  });
  h += '</svg><div class="tip rp-tip" hidden></div>';
  plot.innerHTML = h;
  const avg = full.reduce((a, c) => a + c, 0) / full.length, last = full[full.length - 1];
  el.querySelector('.rp-s').textContent = 'Last minute ' + fm(last) + ' · 60-min avg ' + fm(avg);
  plot.setAttribute('aria-label', 'Revenue per minute over the last 60 minutes. Last full minute ' + fm(last) + ', average ' + fm(avg) + '.');
  RG = { L, band, n, vals, W, T, yb };
  if (RHV != null) hover(el, RHV);
}

function hover(el, i) {
  const g = RG; if (!g) return; i = Math.max(0, Math.min(g.n - 1, i)); RHV = i;
  const x0 = g.L + i * g.band, tip = el.querySelector('.rp-tip');
  el.querySelector('.rp-hb').innerHTML = `<rect x="${x0.toFixed(1)}" y="${g.T}" width="${g.band.toFixed(1)}" height="${g.yb - g.T}" style="fill:var(--neutral)"/>`;
  tip.textContent = '';
  const d = document.createElement('div'); d.className = 'd'; d.textContent = hm(RH[i].m) + (i === g.n - 1 ? ' · in progress' : '');
  const r = document.createElement('div'); r.className = 'r';
  const bb = document.createElement('b'); bb.textContent = fm(g.vals[i]);
  const sp = document.createElement('span'); sp.textContent = i === g.n - 1 ? 'so far' : 'per minute';
  r.append(bb, sp); tip.append(d, r);
  tip.hidden = false; const tw = tip.offsetWidth; let lx = x0 + g.band + 8; if (lx + tw > g.W) lx = x0 - 8 - tw; tip.style.left = Math.max(0, lx) + 'px';
}
function unhover(el) { RHV = null; const hb = el.querySelector('.rp-hb'), tip = el.querySelector('.rp-tip'); if (hb) hb.innerHTML = ''; if (tip) tip.hidden = true; }
