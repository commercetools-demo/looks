// Captures the docs screenshots against a locally running dev server, reusing
// the session saved by login.mjs. It only navigates the UI: the creation flow
// is always left with "Abbrechen" and the delete dialog is never confirmed, so
// no data is created or changed. It needs real looks in the target project
// (LOOK_KEY, default demo-look-01, plus a few more for the list).
//
// Usage: `npm start` in mc-looks-app (another terminal), then
//   npm install && npm run login && npm run capture
// The labels are matched in German and English, whichever the Merchant Center
// user's language is.

import { fileURLToPath } from 'url';
import path from 'path';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_KEY = process.env.MC_PROJECT_KEY || 'tech-sales-good-store';
const PORT = process.env.MC_PORT || 3001;
const LOOK_KEY = process.env.LOOK_KEY || 'demo-look-01';
// Matched against names in the data language; without hits the search is cleared.
const SEARCH_TERM = process.env.SEARCH_TERM || 'pillow';
const BASE = `http://localhost:${PORT}/${PROJECT_KEY}/looks`;
const AUTH_STATE_PATH = path.join(__dirname, 'auth-state.json');
const OUTPUT_DIR = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'docs',
  'screenshots'
);

// The Merchant Center shell and Nimbus start a View Transition on startup; a
// skipped transition leaves the page without further frames, and every
// page.screenshot() then times out. Disabling the feature avoids that.
const browser = await chromium.launch({
  headless: true,
  args: ['--disable-features=ViewTransition,ViewTransitionOnNavigation'],
});
const context = await browser.newContext({
  storageState: AUTH_STATE_PATH,
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

const label = {
  newLook: /^(Neuer Look|New look)$/i,
  next: /^(Weiter|Next)$/i,
  cancel: /^(Abbrechen|Cancel)$/i,
  add: /^(Hinzufügen|Add):/i,
  deleteLook: /^(Look löschen|Delete look)$/i,
  showAll: /Alle Sprachen anzeigen|Show all languages/i,
  nameGroup: /^(Name|Name\*)/,
  descriptionGroup: /^(Beschreibung|Description)/,
  search: /^(Produktsuche|Product search)$/i,
  globalPercent: /Prozent für alle Zeilen|Percentage for all rows/i,
  pastLooks: /^(Frühere Looks|Past looks)$/i,
};

// `height` makes the window taller for pages that scroll inside the shell (a
// full-page screenshot only grows with the document, not with an inner scroll).
async function shot(name, { fullPage = false, height = 900 } = {}) {
  await page.setViewportSize({ width: 1440, height });
  await page
    .waitForLoadState('networkidle', { timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUTPUT_DIR, name),
    fullPage,
    type: 'png',
    // The signed-in user's profile picture never goes into the docs.
    mask: [page.locator('img[class*="GravatarImg"]')],
    maskColor: '#d6d6e0',
  });
  console.log('shot:', name, '| url:', page.url());
  await page.setViewportSize({ width: 1440, height: 900 });
}

async function goto(pathname) {
  await page.goto(`${BASE}${pathname}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page
    .waitForLoadState('networkidle', { timeout: 15000 })
    .catch(() => {});
}

async function click(role, name) {
  const target = page.getByRole(role, { name }).first();
  await target.waitFor({ state: 'visible', timeout: 15000 });
  await target.click();
}

// Fills the first input of a localized field (the data locale, the others stay
// collapsed so the screenshot stays short).
async function fillFirstLanguage(groupName, text) {
  const group = page.getByRole('group', { name: groupName }).first();
  await group.waitFor({ state: 'visible', timeout: 15000 });
  await group.getByRole('textbox').first().fill(text);
}

// A fresh browser context's very first navigation must be to the app root: the
// shell's silent-auth bootstrap uses sessionStorage, which storageState() does
// not capture, so a cold deep link gets bounced back to the Welcome screen.
await goto('');

// The labels follow the Merchant Center user's language.
const english =
  (await page.getByRole('button', { name: /^New look$/i }).count()) > 0;

// List and past looks
await shot('list.png', { height: 1100 });
try {
  await page
    .getByRole('heading', { name: label.pastLooks })
    .first()
    .scrollIntoViewIfNeeded();
  await shot('past-looks.png');
} catch (e) {
  console.log('past-looks FAILED:', e.message);
}

// Creation flow (always left with "Abbrechen", nothing is saved)
try {
  await goto('');
  await click('button', label.newLook);
  await fillFirstLanguage(
    label.nameGroup,
    english ? 'Autumn in the living room' : 'Herbst im Wohnzimmer'
  );
  await fillFirstLanguage(
    label.descriptionGroup,
    english
      ? 'Soft textiles in warm colours.'
      : 'Weiche Textilien in warmen Farben.'
  );
  await shot('create-basics.png');

  await click('button', label.next);
  const search = page.getByRole('searchbox', { name: label.search }).first();
  await search.waitFor({ state: 'visible', timeout: 15000 });
  await search.fill(SEARCH_TERM);
  await page
    .getByRole('button', { name: label.add })
    .first()
    .waitFor({ timeout: 15000 });
  for (let i = 0; i < 3; i += 1) {
    await click('button', label.add);
    await page.waitForTimeout(300);
  }
  await shot('create-pieces.png');

  await click('button', label.next);
  const percent = page
    .getByRole('textbox', { name: label.globalPercent })
    .first();
  await percent.waitFor({ state: 'visible', timeout: 15000 });
  await percent.fill('10');
  await percent.press('Tab');
  await shot('create-price.png', { height: 1250 });

  await click('button', label.next);
  await page
    .getByRole('switch')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await shot('create-review.png');
} catch (e) {
  console.log('creation flow FAILED:', e.message);
} finally {
  try {
    await click('button', label.cancel);
  } catch {
    // The dialog may already be closed.
  }
}

// Detail and the delete confirmation (never confirmed)
try {
  await goto(`/${LOOK_KEY}`);
  await page
    .getByRole('button', { name: label.deleteLook })
    .first()
    .waitFor({ timeout: 15000 });
  await shot('detail.png', { height: 1500 });
  await click('button', label.deleteLook);
  await page
    .getByRole('dialog')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });
  await shot('delete-dialog.png');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: label.cancel })
    .first()
    .click();
} catch (e) {
  console.log('detail FAILED:', e.message);
}

await browser.close();
