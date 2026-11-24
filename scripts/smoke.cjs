// Browser smoke test: serves this folder, loads the page in headless Chrome,
// fails on page errors or broken sections, then exercises the main controls.
// Run: node scripts/smoke.cjs   (needs puppeteer-core and a Chrome binary;
// set CHROME=/path/to/chrome and NODE_PATH if they live elsewhere)
const http = require('http'), fs = require('fs'), path = require('path');
let puppeteer;
try { puppeteer = require('puppeteer-core'); }
catch { console.error('smoke: install puppeteer-core outside the repo (npm i puppeteer-core) and set NODE_PATH'); process.exit(2); }

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }).end(buf);
  });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('page error: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|ERR_INTERNET|ERR_PROXY/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => { if (r.url().startsWith(url)) errors.push('failed request: ' + r.url()); });
  page.on('response', r => { if (r.url().startsWith(url) && r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
  await page.setViewport({ width: 1000, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__dash, { timeout: 5000 }).catch(() => errors.push('dashboard never started'));

  const info = await page.evaluate(() => ({
    listed: window.__dash?.sections || [],
    hosts: [...document.querySelectorAll('[data-section]')].map(e => e.dataset.section),
    broken: [...document.querySelectorAll('[data-section] .err')].map(e => e.textContent),
    empty: [...document.querySelectorAll('[data-section]')].filter(e => !e.children.length).map(e => e.dataset.section)
  }));
  info.broken.forEach(b => errors.push('section error: ' + b));
  info.empty.forEach(s => errors.push('section rendered nothing: ' + s));

  const act = async (label, fn) => { try { await fn(); } catch (e) { errors.push(`${label}: ${e.message}`); } };
  const has = s => info.hosts.includes(s);
  if (has('kpis')) await act('kpi click', () => page.click('[data-section=kpis] [data-m=orders]'));
  if (has('filters')) {
    await act('range click', () => page.click('[data-section=filters] [data-r="90"]'));
    await act('region select', () => page.select('[data-section=filters] select', 'EU'));
  }
  if (has('table')) await act('table row click', () => page.click('[data-section=table] tr.row button'));
  const state = await page.evaluate(() => window.__dash?.store.get());
  if (has('kpis') && state?.metric !== 'orders') errors.push('kpi click did not change the metric');
  if (has('filters') && state?.region !== 'EU') errors.push('region select did not change the region');

  await browser.close(); server.close();
  if (errors.length) { console.error('smoke failed:\n- ' + errors.join('\n- ')); process.exit(1); }
  console.log(`smoke ok: ${info.hosts.join(', ')}`);
})().catch(e => { console.error('smoke crashed: ' + e.message); server.close(); process.exit(1); });
