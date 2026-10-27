/**
 * Builds the two catalogs the app loads.
 *
 * `npm run extract-intl` writes `src/i18n/data/core.json` from every
 * `defineMessages` call (German is the reference language, so the default
 * messages are German). This script then writes
 *   - `de.json`: the extracted messages,
 *   - `en.json`: the merge of every `src/**\/messages.en.json` (id to English).
 * `messages.spec.ts` checks that both have the same keys and placeholders.
 */
const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const dataDir = path.join(srcDir, 'i18n/data');

const core = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'core.json'), 'utf8')
);

const english = {};
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'messages.en.json') {
      Object.assign(english, JSON.parse(fs.readFileSync(full, 'utf8')));
    }
  }
};
walk(srcDir);

const sorted = (object) =>
  Object.fromEntries(
    Object.entries(object).sort(([a], [b]) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )
  );

fs.writeFileSync(
  path.join(dataDir, 'de.json'),
  `${JSON.stringify(sorted(core), null, 2)}\n`
);
fs.writeFileSync(
  path.join(dataDir, 'en.json'),
  `${JSON.stringify(sorted(english), null, 2)}\n`
);

const missing = Object.keys(core).filter((id) => !(id in english));
const extra = Object.keys(english).filter((id) => !(id in core));
if (missing.length || extra.length) {
  console.error(
    `i18n mismatch. Missing English: ${
      missing.join(', ') || '-'
    }. English without German: ${extra.join(', ') || '-'}.`
  );
  process.exitCode = 1;
}
