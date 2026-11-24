# storefront-dash

A storefront dashboard split into independent sections, deployed on Netlify.
Changes are made section by section: editing one file in `sections/` redeploys
only that file.

## Layout

| Path | What it is |
|---|---|
| `config.json` | Title, starting filters (`settings`) and the ordered list of sections |
| `js/core.js` | Shared sample data, number formatting, helpers and the state store |
| `js/app.js` | Loads `config.json`, mounts each section, sends state changes to all of them |
| `sections/*.js` | One file per section |
| `styles.css` | Shared light and dark theme and common components |

## Section contract

Each file in `sections/` default-exports:

```js
export default {
  watch: ['region'],        // state keys that make this section's box pulse when they change
  css: `...`,               // styles for this section only
  mount(ctx) {},            // build the DOM once inside ctx.el and attach events
  update(ctx, changed) {},  // redraw from ctx.state; `changed` lists the keys that changed
  unmount(ctx) {}           // optional: extra cleanup when the section is removed or reloaded
};
```

`ctx` gives a section `el` (its own box), `state` (read-only current state),
`set(patch)` (request a state change), `core` (shared helpers), `cfg` and
`signal`, an AbortSignal that fires when the section is removed or reloaded.
Anything that outlives the section's own box (a `window` listener, a timer, a
ResizeObserver) must stop on `signal`, for example
`addEventListener('x', fn, { signal: ctx.signal })`.
A section never touches another section's DOM. If a section throws, only its
box shows an error.

To add a section, create `sections/<name>.js` and add `<name>` to
`config.json` `sections`. To remove one, take it out of that list.

## Live reload

Each Netlify deploy runs `scripts/version.mjs`, which writes `version.json`
with a hash of every file. Open pages check it every 10 seconds (paused while
the tab is hidden) and reload only what changed:

| Changed | Open page |
|---|---|
| One section file | That section is swapped in place; filters stay |
| Section list in `config.json` | Sections are added, removed or reordered |
| `settings` in `config.json` | Nothing; applies on the next fresh load |
| `index.html`, `styles.css`, `js/*` | Full reload, current filters restored |

Add `?poll=2000` to the URL to check every 2 seconds instead.

## Running locally

Any static file server works, for example `python3 -m http.server` in this
folder. Run `node scripts/version.mjs` first if you want live reload locally.
