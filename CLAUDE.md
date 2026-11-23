# Working in storefront-dash

- Keep changes inside the section the request is about. Touch `js/core.js`,
  `js/app.js` or `styles.css` only when the change truly crosses sections.
- Follow the section contract in README.md. Sections talk to each other only
  through `ctx.set()` and the state; never query another section's DOM.
- Pushing to `main` deploys to production on Netlify. Before pushing, serve the
  folder locally and load it in a headless browser: no page errors, and the
  changed section renders and responds.
- Insert any text that comes from data into the DOM with `textContent` or
  `core.esc()`, never raw.
- No build step and no dependencies: plain ES modules only.
