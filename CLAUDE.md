# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## Layout

The repository root holds `connect.yaml`, `netlify.toml`, `.env.example`, `specs/` (spec-kit) and `docs/`. The application is the **`mc-looks-app/`** subdirectory, its own npm project (no workspaces): Connect builds from inside the folder named in `connect.yaml`. **Run every command below from inside `mc-looks-app/`.**

## Commands

```shell
npm install                 # postinstall generates the Nimbus theme types
npm start                   # mc-scripts dev server
npm run build               # production build
npm test                    # jest (jest.test.config.js)
npm test -- path/to/file.spec.tsx
npm run lint                # eslint, prettier rules included
npm run format              # prettier --write
npm run typecheck           # tsc --noEmit
npm run extract-intl        # extract the messages (English defaults) into src/i18n/data/en.json
npm run generate-types:ctp  # interactive browser login, then graphql-codegen; do not run headless
```

CI (`.github/workflows/ci.yml`) runs build, lint, typecheck and test on PRs into `main`.

## Architecture

- **Merchant Center custom application** on Nimbus (`@commercetools/nimbus`), React 19, deployed via Connect (production) or Netlify (development/preview) from the same bundle. Entry point path `looks`.
- **Data** goes through the Merchant Center GraphQL proxy (`ctp` target). `src/domain/look-api.ts` is the port the domain flows run against; `src/hooks/use-looks-connector/look-api.ts` implements it with the shell's Apollo client. Reads that feed a write bypass the cache so versions are fresh.
- **A look is three kinds of resources**: a Custom Object `look-<key>` (container `look`), one Discount Group `look-<key>` (name = look name, description = optional look description, `sortOrder` = the look's single rank, `isActive` = the switch) and one Cart Discount per country with set prices (main `look-<key>`, others `look-<key>-<COUNTRY>` or `-ALL`; `cartPredicate` `country = "XX"` or `country is not defined`; no own `sortOrder`; `discountGroup` reference). Details in `specs/001-looks-app/data-model.md` and `contracts/discount-shape.md`.
- **`src/domain/`** is pure logic with unit specs:
  - keys (`keys.ts`) and rank allocation (`sort-order.ts`: 0.7 to 0.7999 in steps of 0.0001, never ending in a zero, unique among all Cart Discounts and Discount Groups);
  - prices per price cell, currency and country, key `EUR/DE` or `EUR` (`prices.ts`: master-variant list prices valid now, never customer-group or channel prices) and the set-price table rows and percent helpers (`price-table.ts`);
  - validation (`validate.ts`), discount and group drafts and update actions (`look-actions.ts`: percentage cells give a relative discount, price cells an absolute one, one kind per country), the look's Discount Group (`look-group.ts`), rows and completeness (`look-rows.ts`), sorting and paging, past-look sales;
  - the write flows: `save-look.ts` (group inactive, country discounts inactive, Custom Object, optional activation: group first, country discounts, main last; resumable and idempotent per key) and `look-writes.ts` (switch: group first, then on: country then main, off: main then country; reprice; complete; delete: country discounts, main discount, group, Custom Object last).
- **Product search** (`src/hooks/use-looks-connector/search-query.ts`) uses `productsSearch` over name, description, slug, searchKeywords, key, product id and variant SKU.
- **Routes**: `/` list, `/new/:step?` creation (`/new`, `/new/pieces`, `/new/price`, `/new/review`; a step opened without entered data shows step 1), `/:lookKey` detail (header with status, switch and a trash icon button that opens a Nimbus `ConfirmationDialog`).
- **Configuration** (only `VARIANT_ATTRIBUTES`) is read only in `src/config.ts`; `config.spec.ts` guards that no other file reads `process.env` and that production code contains no currency code literal.
- **Rules from the constitution** (`.specify/memory/constitution.md`): View/Manage with controls disabled, never hidden; every UI string through react-intl in English and German (`messages.ts` next to the component holds the English default messages, `src/i18n/data/de.json` the German texts; run `npm run extract-intl` after changing a message and add the German text by hand); updates send the current version and make no call when nothing changed.
- **Components** are arrow functions typed with `FC`, props in a `type <Name>Props` above them: `const NewLookButton: FC<NewLookButtonProps> = ({ onPress }) => { ... };` (define a component before the one that uses it; default exports as `export default Name;` after the definition).

## Testing

- Jest preset `@commercetools-frontend/jest-preset-mc-app/typescript` plus Nimbus fixes: `jest.setup.nimbus.js` (browser API polyfills) and `jest.resolver.js` (Nimbus CJS packaging bug).
- Component specs use `renderLooks` with an in-memory `LookApi` (`src/test-utils/fake-look-api.ts`: versions, conflicts, `failNext` for failure injection). The GraphQL layer is covered by `msw` specs of `createLookApi`.
- Nimbus `Select` has no `isReadOnly`, and `isDisabled` on `Select.Root` inside a `FormField` is overridden by the field's state: put `isDisabled` on the `FormField` root and assert `disabled`.
- Nimbus injects a theme-bootstrapping `<script>` into the render container, so assert through `screen`, not `container.textContent`.

## Docs screenshots

`mc-looks-app/scripts/screenshots/` (its own npm project, Playwright, see its README) regenerates `docs/screenshots/*.png`. `npm run login` (headed, manual Merchant Center login, needs `npm start` running on port 3001) saves a gitignored `auth-state.json`; `npm run capture` then runs headless against the dev server and needs real looks in the project (`LOOK_KEY`, default `demo-look-01`) and `MC_PROJECT_KEY` set to the project key. It only navigates: the creation flow ends with "Abbrechen" and the delete dialog is never confirmed. Chromium runs with `--disable-features=ViewTransition,ViewTransitionOnNavigation`, otherwise every screenshot times out.

## Environment notes

- No `.env` is tracked: copy `.env.example` to `mc-looks-app/.env.local` (gitignored) and fill it in. CI sets the variables it needs in `.github/workflows/ci.yml`, Netlify and Connect in their settings.
- If npm fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` behind a TLS-inspecting proxy, run npm with `NODE_OPTIONS=--use-system-ca` (keeps verification on). The registry may refuse very recent releases; pin the offending package in `overrides`.
- `tsconfig` `typeRoots` includes `@types-extensions`; TypeScript loads every folder in a type root, so a stray empty folder there aborts `tsc`.
