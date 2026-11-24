// Team roster: 10 people x 8 columns, shown only for the selected roles.
// Role selection lives in shared state (`roles`) so other sections can follow it.
const ROLES = ['Engineer', 'Designer', 'Product', 'Analyst'];
const PEOPLE = [
  { name: 'Amara Okafor', role: 'Engineer', team: 'Checkout', loc: 'Lagos', tasks: 7, util: 0.92, active: 0, status: 'available' },
  { name: 'Ben Hartley', role: 'Engineer', team: 'Search', loc: 'London', tasks: 11, util: 1.18, active: 1, status: 'overloaded' },
  { name: 'Chen Wei', role: 'Designer', team: 'Checkout', loc: 'Singapore', tasks: 4, util: 0.64, active: 0, status: 'available' },
  { name: 'Diego Ramos', role: 'Product', team: 'Growth', loc: 'Madrid', tasks: 6, util: 0.85, active: 2, status: 'available' },
  { name: 'Elif Demir', role: 'Analyst', team: 'Growth', loc: 'Istanbul', tasks: 9, util: 1.05, active: 0, status: 'overloaded' },
  { name: 'Farah Siddiqui', role: 'Engineer', team: 'Platform', loc: 'Toronto', tasks: 3, util: 0.41, active: 5, status: 'away' },
  { name: 'Gabe Moreau', role: 'Designer', team: 'Search', loc: 'Paris', tasks: 8, util: 0.97, active: 0, status: 'available' },
  { name: 'Hana Sato', role: 'Analyst', team: 'Platform', loc: 'Tokyo', tasks: 5, util: 0.72, active: 1, status: 'available' },
  { name: 'Isaac Byrne', role: 'Product', team: 'Search', loc: 'Dublin', tasks: 10, util: 1.12, active: 0, status: 'overloaded' },
  { name: 'Jo Lindqvist', role: 'Engineer', team: 'Growth', loc: 'Stockholm', tasks: 0, util: 0, active: 9, status: 'away' }
];
const COLS = [
  { k: 'name', n: 'Name', w: 18 },
  { k: 'role', n: 'Role', w: 10 },
  { k: 'team', n: 'Team', w: 10, hideNarrow: true },
  { k: 'loc', n: 'Location', w: 11, hideNarrow: true },
  { k: 'tasks', n: 'Tasks', w: 9, num: true },
  { k: 'util', n: 'Load', w: 17, num: true },
  { k: 'active', n: 'Last active', w: 11, num: true, hideNarrow: true },
  { k: 'status', n: 'Status', w: 14 }
];
const STATUS = {
  available: { n: 'Available', i: 'circle-check', c: 'var(--success)' },
  overloaded: { n: 'Over capacity', i: 'alert-triangle', c: 'var(--danger)' },
  away: { n: 'Away', i: 'moon', c: 'var(--text-3)' }
};
let sort = { k: 'util', d: -1 };

export default {
  watch: ['roles'],
  css: `
.ro-roles{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.ro-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:14px;border:.5px solid var(--border-2);background:transparent;color:var(--text-2);font-size:12px;cursor:pointer}
.ro-chip[aria-pressed="true"]{background:var(--accent-bg);border-color:transparent;color:var(--accent-text);font-weight:500}
.ro-chip .c{font-variant-numeric:tabular-nums;opacity:.8}
.ro-all{padding:0 4px;border:0;background:none;font-size:12px;color:var(--accent-text);cursor:pointer;text-decoration:underline;text-underline-offset:2px}
.ro-sum{font-size:13px;color:var(--text-2);margin:10px 0 4px}
.ro-sum b{font-weight:500;color:var(--danger)}
.ro{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px}
.ro th,.ro td{height:38px;padding:0 8px;text-align:left;border-top:.5px solid var(--border);font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ro th{height:30px;border-top:0;font-size:12px;color:var(--text-2)}
.ro .n{text-align:right;font-variant-numeric:tabular-nums}
.ro th button{padding:0;border:0;background:none;font-size:12px;color:inherit;cursor:pointer}
.ro th button:hover{color:var(--text)}
.ro td.nm{font-weight:500}
.ro-load{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.ro-bar{flex:none;width:64px;height:6px;border-radius:3px;background:var(--accent-bg);overflow:hidden}
.ro-bar i{display:block;height:100%;border-radius:3px;background:var(--s1)}
.ro-bar.over{background:rgba(226,75,74,.18)}
.ro-bar.over i{background:var(--danger)}
.ro-st{display:inline-flex;align-items:center;gap:5px}
.ro-st i{font-size:14px}
.ro-empty{padding:24px 8px;text-align:center;color:var(--text-2);font-size:13px}
@media (max-width:640px){.ro{table-layout:auto}.ro .hn{display:none}.ro-bar{display:none}.ro th,.ro td{padding:0 6px}.ro td:last-child{white-space:normal;line-height:1.3}}`,
  mount(ctx) {
    ctx.el.innerHTML = `<div class="card">
<div class="hd"><span class="t">Team</span><span class="gap"></span><div class="ro-roles" role="group" aria-label="Roles to show"></div></div>
<div class="ro-sum" role="status"></div><div class="ro-body"></div></div>`;
    ctx.el.addEventListener('click', e => {
      const chip = e.target.closest('[data-role]');
      if (chip) {
        const cur = selected(ctx.state), r = chip.dataset.role;
        ctx.set({ roles: cur.includes(r) ? cur.filter(x => x !== r) : ROLES.filter(x => x === r || cur.includes(x)) });
        return;
      }
      if (e.target.closest('.ro-all')) { ctx.set({ roles: ROLES.slice() }); return; }
      const h = e.target.closest('[data-sort]');
      if (h) { const k = h.dataset.sort; sort = { k, d: sort.k === k ? -sort.d : (typeof PEOPLE[0][k] === 'string' ? 1 : -1) }; this.update(ctx); }
    });
  },
  update(ctx) {
    const { el, core } = ctx, sel = selected(ctx.state);
    const focus = document.activeElement?.dataset?.role || document.activeElement?.dataset?.sort;
    el.querySelector('.ro-roles').innerHTML = ROLES.map(r =>
      `<button class="ro-chip" data-role="${r}" aria-pressed="${sel.includes(r)}">${r} <span class="c">${PEOPLE.filter(p => p.role === r).length}</span></button>`
    ).join('') + (sel.length < ROLES.length ? '<button class="ro-all">Show all</button>' : '');

    const rows = PEOPLE.filter(p => sel.includes(p.role)).sort((a, b) => {
      const x = a[sort.k], y = b[sort.k];
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.d;
    });
    const over = rows.filter(p => p.util > 1).length, hidden = PEOPLE.length - rows.length;
    el.querySelector('.ro-sum').innerHTML = `${rows.length} of ${PEOPLE.length} people` +
      (over ? ` · <b>${over} over capacity</b>` : '') + (hidden ? ` · ${hidden} hidden by role filter` : '');

    if (!rows.length) { el.querySelector('.ro-body').innerHTML = '<div class="ro-empty">No roles selected. Pick a role above to see people.</div>'; }
    else {
      const ar = k => sort.k === k ? ` <i class="ti ti-arrow-${sort.d === -1 ? 'down' : 'up'}" aria-hidden="true"></i>` : '';
      const aria = k => sort.k === k ? (sort.d === -1 ? 'descending' : 'ascending') : 'none';
      let h = '<table class="ro"><colgroup>' + COLS.map(c => `<col class="${c.hideNarrow ? 'hn' : ''}" style="width:${c.w}%">`).join('') + '</colgroup><thead><tr>' +
        COLS.map(c => `<th class="${c.num ? 'n ' : ''}${c.hideNarrow ? 'hn' : ''}" aria-sort="${aria(c.k)}"><button data-sort="${c.k}">${c.n}${ar(c.k)}</button></th>`).join('') + '</tr></thead><tbody>';
      for (const p of rows) {
        const st = STATUS[p.status], pct = Math.round(p.util * 100), o = p.util > 1;
        h += `<tr><td class="nm">${core.esc(p.name)}</td><td>${core.esc(p.role)}</td><td class="hn">${core.esc(p.team)}</td><td class="hn">${core.esc(p.loc)}</td>` +
          `<td class="n">${p.tasks}</td>` +
          `<td class="n"><span class="ro-load"><span>${pct}%</span><span class="ro-bar${o ? ' over' : ''}" aria-hidden="true"><i style="width:${Math.min(100, pct)}%"></i></span></span></td>` +
          `<td class="n hn">${p.active === 0 ? 'Today' : p.active === 1 ? 'Yesterday' : p.active + ' days ago'}</td>` +
          `<td><span class="ro-st"><i class="ti ti-${st.i}" style="color:${st.c}" aria-hidden="true"></i>${st.n}</span></td></tr>`;
      }
      el.querySelector('.ro-body').innerHTML = h + '</tbody></table>';
    }
    if (focus) el.querySelector(`[data-role="${focus}"],[data-sort="${focus}"]`)?.focus({ preventScroll: true });
  }
};

function selected(S) { return Array.isArray(S.roles) ? S.roles : ROLES.slice(); }
