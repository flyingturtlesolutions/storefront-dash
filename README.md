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
  update(ctx, changed) {}   // redraw from ctx.state; `changed` lists the keys that changed
};
```

`ctx` gives a section `el` (its own box), `state` (read-only current state),
`set(patch)` (request a state change), `core` (shared helpers) and `cfg`.
A section never touches another section's DOM. If a section throws, only its
box shows an error.

To add a section, create `sections/<name>.js` and add `<name>` to
`config.json` `sections`. To remove one, take it out of that list.

## Running locally

Any static file server works, for example `python3 -m http.server` in this
folder. There is no build step.
