export default {
  watch: [],
  css: `
.ab{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:2px;font-size:12px;color:var(--text-2)}
.ab-ok{color:var(--success)}`,
  mount(ctx) {
    const { el } = ctx;
    el.innerHTML = '<div class="ab"><span class="ab-v"></span><span class="ab-q"></span><span class="ab-ok" role="status" aria-live="polite"></span></div>';
    const copy = async q => {
      const text = q + ' [dashboard view: ' + ctx.core.view(ctx.state) + ']', ok = el.querySelector('.ab-ok');
      try { await navigator.clipboard.writeText(text); ok.textContent = 'Copied. Paste it into your Claude chat.'; }
      catch { ok.textContent = 'Copy failed. Question: ' + text; }
      clearTimeout(ctx.t); ctx.t = setTimeout(() => { ok.textContent = ''; }, 4000);
    };
    el.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) copy(b.dataset.q); });
    window.addEventListener('dash:ask', e => copy(e.detail));
  },
  update(ctx) {
    const { el, core, state: S } = ctx, l = core.MET[S.metric].l;
    el.querySelector('.ab-v').textContent = 'Copy a question for Claude. View: ' + core.view(S);
    const qs = ['Summarize this view', 'What’s dragging ' + l + ' down?', 'Which region is growing fastest?'];
    el.querySelector('.ab-q').innerHTML = qs.map(q => `<button class="chip" data-q="${core.esc(q)}"><i class="ti ti-copy" aria-hidden="true"></i>${core.esc(q)}</button>`).join(' ');
  }
};
