# Working in storefront-dash

Pushing to `main` deploys to production on Netlify (no build step, about 7 s).
Every change follows the routine for its tier. Pick the lowest tier that fits.

## Change tiers

| Tier | What changes | Checks before push |
|---|---|---|
| 1. Settings and layout | `config.json` only (defaults, title, section order, add or remove a listed section) | `node scripts/check.mjs` |
| 2. One section | One file in `sections/` (and `config.json` if it is new) | `check.mjs`, then `node scripts/smoke.cjs` |
| 3. Shared | `js/core.js`, `js/app.js`, `styles.css`, or the section contract | `check.mjs`, `smoke.cjs`, plus a targeted test of each section that uses what changed |

Run checks in one shell call, and push only if they pass.
`smoke.cjs` needs `puppeteer-core` installed outside the repo (`npm i puppeteer-core`
in a tools folder, then `NODE_PATH=<tools>/node_modules`). The site itself stays
dependency-free.

## Confirming the deploy

1. Push, then wait 12 s (`sleep 12`) — not longer.
2. Call the Netlify connector `get-project` for site `c4da02f7-ce0f-45d8-b994-7f853e446f14`.
   Ready means `currentDeploy.state` is `ready` and the deploy's `commit_ref` is the pushed commit
   (`get-deploy-for-site` with the current deploy id).
3. If it is not there yet, wait 5 s and check once more. If it failed, read the
   deploy's `error_message`, fix forward, and push again.

## Code rules

- Keep changes inside the section the request is about. Touch shared files only
  when the change truly crosses sections (tier 3).
- Follow the section contract in README.md. Sections talk to each other only
  through `ctx.set()` and the state; never query another section's DOM.
- Insert text that comes from data into the DOM with `textContent` or
  `core.esc()`, never raw.
- Plain ES modules, no build step, no runtime dependencies.
- Edit `config.json` by hand-style minimal edits, keeping its formatting, so the
  diff shows only what changed.

## Commits and replies

- Commit subject: imperative, under 60 characters, naming the section
  (for example "kpis: add sparkline"). Body only when the reason is not obvious.
- Reply to the user in two or three lines for tier 1 and 2: what changed, that it
  is live (or what failed), and anything they should check. No step-by-step recap.
