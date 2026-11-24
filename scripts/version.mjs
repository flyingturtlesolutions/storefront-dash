// Build step: writes version.json with a short hash of every file the page
// loads, so open dashboards can tell exactly what changed and reload only that.
// Netlify runs this on each deploy (see netlify.toml). Run locally the same way.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = ['index.html', 'styles.css', 'config.json', 'js/app.js', 'js/core.js'];
for (const f of (await readdir(path.join(root, 'sections'))).sort()) if (f.endsWith('.js')) files.push('sections/' + f);

const hashes = {};
for (const f of files) hashes[f] = createHash('sha1').update(await readFile(path.join(root, f))).digest('hex').slice(0, 10);
const cfg = JSON.parse(await readFile(path.join(root, 'config.json'), 'utf8'));
const id = createHash('sha1').update(JSON.stringify(hashes)).digest('hex').slice(0, 10);

await writeFile(path.join(root, 'version.json'), JSON.stringify({
  id,
  commit: (process.env.COMMIT_REF || 'local').slice(0, 7),
  builtAt: new Date().toISOString(),
  sections: cfg.sections,
  files: hashes
}, null, 2) + '\n');
console.log(`version.json ${id}: ${files.length} files`);
