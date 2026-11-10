# Features

Code-derived inventory of what this repo implements. Bullets and key file paths —
the mechanism lives in `docs/how-it-works.md`, the walkthrough in `docs/demo-script.md`.

_Last generated: 2026-11-10 by feature-doc._

Looks is a Merchant Center custom application (Nimbus, React 19, in `mc-looks-app/`) for curated looks: at least two products sold as a set at a set price below the sum of their single prices. It is built from scratch (no starter fork), so bullets carry no provenance tags. A look is a Custom Object `look-<key>` (container `look`), one Discount Group `look-<key>` and one Cart Discount per country that has set prices, all inside the group; the discounts decide what shoppers pay. Details: [`specs/001-looks-app/spec.md`](./specs/001-looks-app/spec.md), setup: [`docs/SETUP.md`](./docs/SETUP.md).

## Looks list

![Looks list](docs/screenshots/list.png)

- One row per look: name and key, the piece images (first five, then `+N`), set price, sum, saving, status (`src/components/looks-list/looks-table.tsx`, `src/domain/look-rows.ts`)
- Status switch per row, plus the warnings "Unvollständig" (half-written look) and "Setpreis weicht ab" (price drifted)
- Search by look name, sorting by look, set price, sum, saving and status, pagination (20, 50, 100) (`src/domain/sorting.ts`, `src/domain/paging.ts`)
- Page, size, sort and search survive switching a look and coming back from a detail
- Loading, empty, filtered-empty and error states with retry

## Past looks ("Frühere Looks")

![Past looks](docs/screenshots/past-looks.png)

- Every complete look that is switched off, as a card with its pieces, active period and sales: sets sold, orders, revenue per currency, "Bester Look" badge (`src/components/past-looks/past-look-card.tsx`, `src/domain/past-looks.ts`)
- Sales come from the last 90 days of orders (up to 2000), read separately so a failing read never hides the list (`src/hooks/use-past-look-sales.ts`)
- "Wieder aktivieren" switches a look back on

## Creating a look (four steps)

![Step 1: basics](docs/screenshots/create-basics.png)

1. **Grunddaten**: the name in every project language (Nimbus localized field), an optional description the same way, and the look key (suggested from the English name, editable, checked for taken or invalid keys) (`basics-step.tsx`, `src/domain/keys.ts`)

![Step 2: pieces](docs/screenshots/create-pieces.png)

2. **Teile**: product search over name, description, slug, search keywords, key, product id and variant SKU via `productsSearch` (`src/hooks/use-looks-connector/search-query.ts`); product tiles with size chips and "nur noch N" / "ausverkauft" hints from default inventory (`src/domain/stock.ts`); reorderable chosen pieces (drag or buttons); at least two pieces, no maximum; a warning, not a block, for a piece that is sold out everywhere

![Step 3: set price](docs/screenshots/create-price.png)

3. **Setpreis**: a table with one row per currency and country in which every piece has a list price (master variant, valid now, never customer-group or channel prices) (`src/domain/prices.ts`, `src/domain/price-table.ts`). It shows each piece's price, the sum, the set price (money field) and the saving in percent (number field); both stay linked. The set price starts at the sum; an empty row creates no discount. A global percentage applies to all rows. A row edited by percent creates a **relative** discount, a row edited by price an **absolute** one (shown in the "Rabatt" column).

![Step 4: review](docs/screenshots/create-review.png)

4. **Prüfen**: summary and the switch "Nach dem Anlegen aktiv" (off by default).

- The step is part of the URL (`/new`, `/new/pieces`, `/new/price`, `/new/review`): browser back and forward walk the steps, the list query is kept; a step opened without entered data shows step 1 (`src/routes.tsx`)
- Saving writes the Discount Group (inactive), the country Cart Discounts (inactive), the look Custom Object and, if asked, the activation; it is resumable after a failure and idempotent per key, so it never creates duplicates (`src/domain/save-look.ts`)

## Look detail

![Look detail](docs/screenshots/detail.png)

- Header: name, key, a two-line status with the switch, and a delete icon button; back link to the list with its query restored (`src/components/look-detail/look-detail-page.tsx`)
- The pieces as the same product tiles as in the creation flow, without the add action
- Set-price table as in step 3 (prefilled from the look; the global percentage shows when all rows share one), saving only what changed; updates send the current version and make no call when nothing changed (`set-price-form.tsx`, `src/domain/look-writes.ts`)
- Drift notice with "Setpreis neu berechnen" when a price no longer matches the discounts

![Delete confirmation](docs/screenshots/delete-dialog.png)

- Delete: confirmation dialog (warns that an active look's discounts leave the shop at once); removes the country discounts, the main discount, the group and, last, the definition, so a half-deleted look can be deleted again (`delete-look-button.tsx`)

## Switching and ranking

- Switch order is fixed so shoppers never see a half-applied set: on activates the group first, then country discounts, the main discount last; off reverses it (`src/domain/look-writes.ts`)
- Each look gets one rank as the Discount Group `sortOrder`, allocated from 0.7 to 0.7999 in steps of 0.0001, never ending in a zero and unique among all Cart Discounts and Discount Groups (`src/domain/sort-order.ts`)
- Country discounts use `cartPredicate` `country = "XX"` (or `country is not defined` for the all-countries discount), keyed `look-<key>-<COUNTRY>` / `-ALL` (`src/domain/look-actions.ts`)

## Repair

- A look that has only half of its resources shows "Unvollständig" and can be completed from the detail ("Vervollständigen"): the definition is rebuilt from the discounts, or the discounts and group are created from the definition. Completing never switches a discount on (`complete-look-panel.tsx`)

## Permissions, language, configuration

- Manage permission is required for every write; without it controls are disabled, never hidden. View is required to see the app at all (`src/components/read-only.spec.tsx` guards it)
- Every text exists in German and English (user language); look and product names follow the Merchant Center data locale (`src/i18n/data/de.json`)
- One developer setting, `VARIANT_ATTRIBUTES` (default `size`): the product-variant attributes that label a variant ("Beige / Leinen / 45x45"); several variants are always listed, by SKU when no attribute tells them apart (`src/config.ts`)
- Currencies and languages are the project's; no currency code literal in production code
- Data goes through the Merchant Center GraphQL proxy; the domain runs against a `LookApi` port (`src/domain/look-api.ts`) implemented with the shell's Apollo client (`src/hooks/use-looks-connector/look-api.ts`)
- Hosting from one bundle on Connect (production, `connect.yaml`) or Netlify (development, preview, `netlify.toml`)

## Tests and screenshots

- Jest specs for the domain logic, components (in-memory fake `LookApi` with version conflicts and failure injection) and the GraphQL layer (`msw`)
- The images in `docs/screenshots/` come from sample looks in a commercetools sample project and are regenerated with the Playwright scripts in [`mc-looks-app/scripts/screenshots`](./mc-looks-app/scripts/screenshots) (the signed-in user's profile picture is masked)

## Not included

- Changing a look's name, description or key after it was created; duplicating a look
- Seeding or sample data
- Meta title and meta description in the product search (the product search API does not offer them)

## Known limits and open checks

- Platform limits: at most 100 active Cart Discounts without a code (each country discount counts) and 100 Discount Groups per project; both can be raised on request
- Not yet confirmed against a live project: that the cart-discount scopes cover Discount Groups, and that the relative discount (`relativeCart`, `IndividualApplication`) is accepted for the set pattern (spec task T021)
