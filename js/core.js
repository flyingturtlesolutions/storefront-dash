export const N = 180;
export const RANGES = [7, 14, 30, 90];
export const REG = [
  { k: 'NA', n: 'North America', s: 1, c: 1, p: 1.08 },
  { k: 'EU', n: 'Europe', s: 0.78, c: 0.96, p: 1 },
  { k: 'APAC', n: 'Asia-Pacific', s: 0.62, c: 0.9, p: 0.92 }
];
export const CAT = [
  { k: 'Apparel', s: 1, c: 0.03, p: 58 },
  { k: 'Footwear', s: 0.8, c: 0.026, p: 104 },
  { k: 'Accessories', s: 0.7, c: 0.036, p: 36 },
  { k: 'Home', s: 0.6, c: 0.022, p: 92 }
];
export const MET = {
  revenue: { n: 'Revenue', l: 'revenue' },
  orders: { n: 'Orders', l: 'orders' },
  aov: { n: 'Avg. order value', l: 'average order value' },
  conv: { n: 'Conversion', l: 'conversion rate' }
};
export const MK = ['revenue', 'orders', 'aov', 'conv'];
const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const END = new Date(); END.setHours(12, 0, 0, 0); END.setDate(END.getDate() - 1);
export function dt(d) { const x = new Date(END); x.setDate(x.getDate() - (N - 1 - d)); return x; }
export function lab(d) { const x = dt(d); return MN[x.getMonth()] + ' ' + x.getDate(); }

export const BYD = (() => {
  const WK = [1.1, .96, .94, .97, 1, 1.04, 1.12], R = rng(7), out = [];
  for (let d = 0; d < N; d++) {
    out[d] = []; const wk = WK[dt(d).getDay()];
    for (const r of REG) for (const c of CAT) {
      let s = 2600 * r.s * c.s * (1 + .0012 * d) * wk * (.92 + .16 * R()), cv = c.c * r.c * (.95 + .1 * R());
      if (r.k === 'EU' && c.k === 'Footwear' && d >= N - 14) { const f = Math.min(1, (d - (N - 14)) / 10); cv *= 1 - .5 * f; s *= 1 - .06 * f; }
      if (r.k === 'APAC' && c.k === 'Home' && d >= N - 24) s *= 1 + .5 * Math.min(1, (d - (N - 24)) / 10);
      const o = Math.round(s * cv);
      out[d].push({ d, r: r.k, c: c.k, s: Math.round(s), o, v: Math.round(o * c.p * r.p * (.94 + .12 * R())) });
    }
  }
  return out;
})();

export function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export function rn(k) { const r = REG.find(x => x.k === k); return r ? r.n : 'All regions'; }
export function win(S, prev, rg) { rg = rg || S.range; const hi = N - (prev ? rg : 0); return [hi - rg, hi]; }
function keep(S, x, skip) { return (skip === 'region' || S.region === 'ALL' || x.r === S.region) && (skip === 'category' || !S.category || x.c === S.category); }
export function pick(S, prev, skip) { const [a, b] = win(S, prev), out = []; for (let d = a; d < b; d++) for (const x of BYD[d]) if (keep(S, x, skip)) out.push(x); return out; }
export function sum(a) { const t = { s: 0, o: 0, v: 0 }; for (const x of a) { t.s += x.s; t.o += x.o; t.v += x.v; } return t; }
export function val(t, m) { return m === 'revenue' ? t.v : m === 'orders' ? t.o : m === 'aov' ? (t.o ? t.v / t.o : 0) : (t.s ? t.o / t.s : 0); }
export function series(S, prev) { const [a, b] = win(S, prev), out = []; for (let d = a; d < b; d++) out.push(val(sum(BYD[d].filter(x => keep(S, x))), S.metric)); return out; }
export function groups(S, dim) {
  const cur = pick(S, false, dim), prv = pick(S, true, dim), f = dim === 'region' ? 'r' : 'c';
  return (dim === 'region' ? REG : CAT).map(g => {
    const v = val(sum(cur.filter(x => x[f] === g.k)), S.metric), p = val(sum(prv.filter(x => x[f] === g.k)), S.metric);
    return { k: g.k, n: g.n || g.k, v, p, rel: p ? (v - p) / p : 0 };
  });
}
export function fv(m, v) {
  if (m === 'revenue') return v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'k' : '$' + Math.round(v);
  if (m === 'orders') return v >= 1e4 ? (v / 1e3).toFixed(1) + 'k' : Math.round(v).toLocaleString('en-US');
  if (m === 'aov') return '$' + v.toFixed(2);
  return (v * 100).toFixed(2) + '%';
}
export function fd(m, v, p) {
  const x = m === 'conv' ? (v - p) * 100 : (p ? (v - p) / p * 100 : 0), thr = m === 'conv' ? .005 : .05, s = Math.abs(x) < thr ? 0 : x > 0 ? 1 : -1;
  const a = Math.abs(x).toFixed(m === 'conv' ? 2 : 1) + (m === 'conv' ? ' pp' : '%');
  return { t: s === 0 ? '0.0' + (m === 'conv' ? '0 pp' : '%') : (s > 0 ? '+' : '−') + a, a, s };
}
export function ct(m, v) {
  if (m === 'revenue') return v >= 1e6 ? '$' + (+(v / 1e6).toFixed(1)) + 'M' : v >= 1e3 ? '$' + (+(v / 1e3).toFixed(1)) + 'k' : '$' + v;
  if (m === 'orders') return v >= 1e3 ? (+(v / 1e3).toFixed(1)) + 'k' : String(v);
  if (m === 'aov') return '$' + (+v.toFixed(1));
  return (+(v * 100).toFixed(2)) + '%';
}
export function nice(lo, hi, n) {
  if (hi <= lo) hi = lo + 1;
  const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag,
    st = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag,
    a = Math.floor(lo / st + 1e-9) * st, b = Math.ceil(hi / st - 1e-9) * st, t = [];
  for (let v = a; v <= b + st / 2; v += st) t.push(+v.toFixed(10));
  return { a, b, t };
}
export function view(S) {
  return 'last ' + S.range + ' days · ' + rn(S.region).toLowerCase() + (S.category ? ' · ' + S.category : '') + ' · ' + MET[S.metric].l + (S.day != null ? ' · ' + lab(S.day) : '');
}

export function createStore(initial) {
  let state = { sort: { k: 'value', d: -1 }, day: null, ...initial };
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      const changed = Object.keys(patch).filter(k => JSON.stringify(state[k]) !== JSON.stringify(patch[k]));
      if (!changed.length) return [];
      state = { ...state, ...patch };
      if (state.day != null && (state.day < N - state.range || state.day >= N)) state = { ...state, day: null };
      subs.forEach(fn => fn(state, changed));
      return changed;
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  };
}
