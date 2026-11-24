import * as core from './core.js';

// Loads config.json, mounts each section, and keeps open pages current:
// every POLL_MS it reads version.json (written at each deploy) and reloads only
// what changed. A section file change swaps that section in place, a section
// list change adds, removes or reorders boxes, and a shared file change reloads
// the page with the current filters restored. Settings changes never touch an
// open page. Without version.json (local runs) live reload is simply off.

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);
const POLL_MS = Math.max(1000, +params.get('poll') || 10000);
const SHARED = ['index.html', 'styles.css', 'js/app.js', 'js/core.js'];
const RESTORE_KEY = 'dash:restore';

let cfg, store, version = null;
const live = new Map(); // id -> { mod, ctx, host, abort }

const status = document.createElement('div');
status.className = 'sr-only';
status.setAttribute('role', 'status');
document.body.appendChild(status);
const toast = document.createElement('div');
toast.className = 'dash-toast';
toast.hidden = true;
document.body.appendChild(toast);
const style = document.createElement('style');
style.textContent = '.dash-toast{position:fixed;right:16px;bottom:16px;z-index:10;padding:6px 12px;border-radius:8px;background:var(--popover);border:.5px solid var(--border-2);font-size:12px;color:var(--text-2)}';
document.head.appendChild(style);

function announce(msg) {
  status.textContent = msg;
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(announce.t);
  announce.t = setTimeout(() => { toast.hidden = true; }, 3000);
}

async function getJSON(url) {
  const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
  if (!r.ok) throw new Error(url + ' returned ' + r.status);
  return r.json();
}

const fileV = f => (version && version.files[f]) || String(Date.now());

function makeHost(id) {
  const host = document.createElement('section');
  host.dataset.section = id;
  return host;
}

async function mountSection(id, host) {
  const old = live.get(id);
  if (old) unmountSection(id, { keepHost: true });
  host.innerHTML = '';
  const abort = new AbortController();
  try {
    const mod = (await import('../sections/' + id + '.js?v=' + fileV('sections/' + id + '.js'))).default;
    document.head.querySelector(`style[data-for="${id}"]`)?.remove();
    if (mod.css) {
      const st = document.createElement('style');
      st.dataset.for = id;
      st.textContent = mod.css;
      document.head.appendChild(st);
    }
    const ctx = { el: host, core, store, cfg, signal: abort.signal, get state() { return store.get(); }, set: p => store.set(p) };
    mod.mount(ctx);
    mod.update(ctx, Object.keys(store.get()));
    live.set(id, { mod, ctx, host, abort });
  } catch (e) {
    abort.abort();
    host.innerHTML = '<div class="err">Section “' + core.esc(id) + '” failed to load: ' + core.esc(e.message) + '</div>';
    live.set(id, { mod: null, ctx: null, host, abort });
    console.error(e);
  }
}

function unmountSection(id, { keepHost = false } = {}) {
  const s = live.get(id);
  if (!s) return;
  try { s.mod?.unmount?.(s.ctx); } catch (e) { console.error(id, e); }
  s.abort.abort();
  document.head.querySelector(`style[data-for="${id}"]`)?.remove();
  if (!keepHost) s.host.remove();
  live.delete(id);
}

function pulse(host) { host.classList.remove('pulse'); void host.offsetWidth; host.classList.add('pulse'); }

async function applySections(list) {
  for (const id of [...live.keys()]) if (!list.includes(id)) unmountSection(id);
  for (const id of list) {
    if (!live.has(id)) {
      const host = makeHost(id);
      app.appendChild(host);
      await mountSection(id, host);
    }
  }
  list.forEach(id => app.appendChild(live.get(id).host));
}

async function checkForUpdate() {
  if (document.hidden || !version) return;
  let next;
  try { next = await getJSON('/version.json'); } catch { return; }
  if (next.id === version.id) return;
  const changed = Object.keys({ ...version.files, ...next.files }).filter(f => version.files[f] !== next.files[f]);

  if (changed.some(f => SHARED.includes(f))) {
    try { sessionStorage.setItem(RESTORE_KEY, JSON.stringify(store.get())); } catch { /* storage unavailable */ }
    location.reload();
    return;
  }

  const prevList = cfg.sections.slice();
  version = next;
  const notes = [];
  if (changed.includes('config.json')) {
    const nextCfg = await getJSON('/config.json');
    cfg.sections = nextCfg.sections;
    cfg.title = nextCfg.title;
    document.title = (cfg.title || 'Dashboard') + ' dashboard';
    if (JSON.stringify(prevList) !== JSON.stringify(cfg.sections)) {
      const added = cfg.sections.filter(id => !prevList.includes(id));
      const removed = prevList.filter(id => !cfg.sections.includes(id));
      await applySections(cfg.sections);
      added.forEach(id => pulse(live.get(id).host));
      if (added.length) notes.push('added ' + added.join(', '));
      if (removed.length) notes.push('removed ' + removed.join(', '));
      if (!added.length && !removed.length) notes.push('reordered sections');
    }
  }
  for (const f of changed) {
    const m = f.match(/^sections\/(.+)\.js$/);
    if (m && live.has(m[1]) && prevList.includes(m[1])) {
      await mountSection(m[1], live.get(m[1]).host);
      pulse(live.get(m[1]).host);
      notes.push('updated ' + m[1]);
    }
  }
  if (notes.length) announce('Dashboard ' + notes.join(', '));
}

async function boot() {
  try { version = await getJSON('/version.json'); } catch { version = null; console.info('Live reload off: no version.json'); }
  cfg = await getJSON('/config.json');
  document.title = (cfg.title || 'Dashboard') + ' dashboard';
  let restored = null;
  try { restored = JSON.parse(sessionStorage.getItem(RESTORE_KEY) || 'null'); sessionStorage.removeItem(RESTORE_KEY); } catch { /* ignore */ }
  store = core.createStore({ ...(cfg.settings || {}), ...(restored || {}) });

  store.subscribe((state, changed) => {
    for (const [id, s] of live) {
      if (!s.mod) continue;
      try { s.mod.update(s.ctx, changed); } catch (e) { console.error(id, e); }
      if (changed.some(k => (s.mod.watch || []).includes(k))) pulse(s.host);
    }
  });
  app.addEventListener('animationend', e => e.target.classList?.remove('pulse'));

  await applySections(cfg.sections);
  if (restored) announce('Dashboard updated');

  if (version) {
    setInterval(checkForUpdate, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdate(); });
  }
  window.__dash = { store, get sections() { return [...live.keys()]; }, get version() { return version && version.id; }, checkForUpdate };
}

boot().catch(e => { app.innerHTML = '<div class="err">Dashboard failed to start: ' + core.esc(e.message) + '</div>'; console.error(e); });
