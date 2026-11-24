// Fast static check (under 1 s, no browser): config is valid, every listed
// section exists and follows the contract. Run: node scripts/check.mjs
import { readFile, access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const problems = [];
const fail = m => problems.push(m);

let cfg;
try { cfg = JSON.parse(await readFile(path.join(root, 'config.json'), 'utf8')); }
catch (e) { fail('config.json: ' + e.message); }

if (cfg) {
  if (!Array.isArray(cfg.sections)) fail('config.json: "sections" must be a list (it may be empty)');
  const seen = new Set();
  for (const id of cfg.sections || []) {
    if (seen.has(id)) fail(`config.json: section "${id}" is listed twice`);
    seen.add(id);
    const file = path.join(root, 'sections', id + '.js');
    try { await access(file); } catch { fail(`sections/${id}.js is listed but missing`); continue; }
    try {
      const mod = (await import(pathToFileURL(file).href)).default;
      if (!mod) fail(`sections/${id}.js has no default export`);
      else {
        if (typeof mod.mount !== 'function') fail(`sections/${id}.js: mount() missing`);
        if (typeof mod.update !== 'function') fail(`sections/${id}.js: update() missing`);
        if (mod.watch && !Array.isArray(mod.watch)) fail(`sections/${id}.js: watch must be a list`);
      }
    } catch (e) { fail(`sections/${id}.js does not load: ${e.message}`); }
  }
  const s = cfg.settings || {};
  if (s.range != null && ![7, 14, 30, 90].includes(s.range)) fail('config.json: settings.range must be 7, 14, 30 or 90');
  if (s.metric != null && !['revenue', 'orders', 'aov', 'conv'].includes(s.metric)) fail('config.json: unknown settings.metric');
}
try { await import(pathToFileURL(path.join(root, 'js/core.js')).href); } catch (e) { fail('js/core.js does not load: ' + e.message); }

if (problems.length) { console.error('check failed:\n- ' + problems.join('\n- ')); process.exit(1); }
console.log(`check ok: ${cfg.sections.length} sections${cfg.sections.length ? ' (' + cfg.sections.join(', ') + ')' : ' (blank surface)'}`);
