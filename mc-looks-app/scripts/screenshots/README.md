# Screenshot scripts

Regenerates the screenshots in `docs/screenshots/` (used by `FEATURES.md` and
the top-level `README.md`) against a real, logged-in Merchant Center session,
headlessly, with Playwright.

## Prerequisites

- Looks in the target project: the list needs several (active and inactive),
  and `LOOK_KEY` (default `demo-look-01`) must exist. The script only
  navigates the UI: it leaves the creation flow with "Abbrechen" and never
  confirms the delete dialog, so it creates and changes nothing.
- The dev server in another terminal: `cd mc-looks-app && npm start` (port 3001).

## Usage

```shell
cd mc-looks-app/scripts/screenshots
NODE_OPTIONS=--use-system-ca npm install   # the option only behind a TLS-inspecting proxy
npm run login      # headed browser: log into the Merchant Center by hand, the
                   # session is saved to auth-state.json (gitignored, never commit it)
npm run capture    # headless; writes docs/screenshots/*.png
```

Override project, port, look and search term with environment variables:

```shell
MC_PROJECT_KEY=other-project MC_PORT=3002 LOOK_KEY=my-look SEARCH_TERM=lamp npm run capture
```

## Notes

- `playwright` is pinned to `1.61.0`, the version whose Chromium build is
  already in `~/Library/Caches/ms-playwright` on the machine this was written
  on; elsewhere `npx playwright install chromium` fetches what the version
  needs, and the pin can be raised.
- `login.mjs` waits for the browser to leave `localhost` (redirect to the
  identity provider) before it waits for the return trip, otherwise the first
  redirect matches at once and the script exits before you have logged in.
- A fresh context's first navigation must be the app root, never a deep link:
  the shell's silent-auth bootstrap uses `sessionStorage`, which `storageState`
  does not capture. `capture.mjs` always visits the list first.
- Chromium runs with `--disable-features=ViewTransition,ViewTransitionOnNavigation`;
  without it the app's startup View Transition stalls frame production and
  every `page.screenshot()` times out.
- Labels are matched in German and English (the Merchant Center user's
  language); the creation flow types demo texts in the first language of the
  localized fields and picks the first three search results for `SEARCH_TERM`
  (default `pillow`, matched against names in the data language; without hits
  it lists all products).
