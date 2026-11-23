import * as core from './core.js';

const app = document.getElementById('app');
const v = new URL(import.meta.url).searchParams.get('v') || Date.now();

async function boot() {
  const cfg = await (await fetch('/config.json?v=' + v, { cache: 'no-store' })).json();
  document.title = (cfg.title || 'Dashboard') + ' dashboard';
  const store = core.createStore(cfg.settings || {});
  const mounted = [];
  for (const id of cfg.sections) {
    const host = document.createElement('section');
    host.dataset.section = id;
    app.appendChild(host);
    try {
      const mod = (await import('../sections/' + id + '.js?v=' + v)).default;
      if (mod.css) { const st = document.createElement('style'); st.dataset.for = id; st.textContent = mod.css; document.head.appendChild(st); }
      const ctx = { el: host, core, store, cfg, get state() { return store.get(); }, set: p => store.set(p) };
      mod.mount(ctx);
      mod.update(ctx, Object.keys(store.get()));
      mounted.push({ id, mod, ctx, host });
    } catch (e) {
      host.innerHTML = '<div class="err">Section “' + core.esc(id) + '” failed to load: ' + core.esc(e.message) + '</div>';
      console.error(e);
    }
  }
  store.subscribe((state, changed) => {
    for (const m of mounted) {
      try { m.mod.update(m.ctx, changed); } catch (e) { console.error(m.id, e); }
      const watch = m.mod.watch || [];
      if (changed.some(k => watch.includes(k))) { m.host.classList.remove('pulse'); void m.host.offsetWidth; m.host.classList.add('pulse'); }
    }
  });
  app.addEventListener('animationend', e => e.target.classList?.remove('pulse'));
  window.__dash = { store, sections: mounted.map(m => m.id) };
}
boot().catch(e => { app.innerHTML = '<div class="err">Dashboard failed to start: ' + core.esc(e.message) + '</div>'; console.error(e); });
