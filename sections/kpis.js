export default {
  watch: ['range', 'region', 'category', 'compare'],
  css: `
.kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.kp-t{display:block;width:100%;padding:10px 12px;text-align:left;background:var(--neutral);border:2px solid transparent;border-radius:var(--radius);line-height:1.3;cursor:pointer}
.kp-t:hover{border-color:var(--border-2)}
.kp-t[aria-pressed="true"]{background:var(--surface);border-color:var(--accent-border)}
.kp-t span{display:block}
.kp-l{font-size:13px;color:var(--text-2)}
.kp-v{font-size:24px;font-weight:500;line-height:1.35}
.kp-d{font-size:12px;color:var(--text-2)}
.kp-d.up{color:var(--success)}
.kp-d.dn{color:var(--danger)}
.kp-d .vs{display:inline;color:var(--text-2)}`,
  mount(ctx) {
    ctx.el.innerHTML = '<div class="kp"></div>';
    ctx.el.addEventListener('click', e => { const t = e.target.closest('.kp-t'); if (t) ctx.set({ metric: t.dataset.m }); });
  },
  update(ctx) {
    const { el, core, state: S } = ctx, cur = core.sum(core.pick(S, false)), prv = core.sum(core.pick(S, true));
    const focus = document.activeElement?.dataset?.m;
    el.querySelector('.kp').innerHTML = core.MK.map(m => {
      const v = core.val(cur, m), p = core.val(prv, m), x = core.fd(m, v, p);
      const delta = S.compare ? `<span class="kp-d ${x.s > 0 ? 'up' : x.s < 0 ? 'dn' : ''}"><i class="ti ti-${x.s > 0 ? 'arrow-up-right' : x.s < 0 ? 'arrow-down-right' : 'minus'}" aria-hidden="true"></i> ${x.t} <span class="vs">vs prev. ${S.range}d</span></span>` : '<span class="kp-d">&nbsp;</span>';
      return `<button class="kp-t" data-m="${m}" aria-pressed="${S.metric === m}"><span class="kp-l">${core.MET[m].n}</span><span class="kp-v">${core.fv(m, v)}</span>${delta}</button>`;
    }).join('');
    if (focus) el.querySelector(`[data-m="${focus}"]`)?.focus({ preventScroll: true });
  }
};
