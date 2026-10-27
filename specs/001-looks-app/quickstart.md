# Quickstart: validating Looks end to end

A run and validation guide. Contracts: [operations.graphql](./contracts/operations.graphql), [look-value.schema.json](./contracts/look-value.schema.json), [discount-shape.md](./contracts/discount-shape.md). Entities: [data-model.md](./data-model.md).

## Prerequisites

- Node 22, npm.
- A commercetools sandbox project with: at least 2 currencies, 6+ products with prices in every project currency and images, default inventory entries (no supply channel) for their variants, a size attribute and colour attributes (names as configured).
- A Merchant Center user with the app's **Manage** permission, and a second user with **View** only.
- A registered custom application in Draft (see `docs/SETUP.md` once written): entry point `looks`, scopes from FR-080.

## Set up (once)

```shell
cd mc-looks-app
npm install
cp ../.env.example .env.local     # set INITIAL_PROJECT_KEY, CLOUD_IDENTIFIER, size/colour attributes, shop origin
npm run generate-types:ctp         # interactive browser login; do not run headless
npm run extract-intl
```

## Automated checks

```shell
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: all green. These specs must exist and pass:

| Area | Proof |
|---|---|
| Keys, rank, validation, prices, completeness, sales | plain unit specs in `src/domain/` (R2, R11) |
| Every `.graphql` document | spec parses and validates each against `schemas/ctp.json` |
| i18n | de/en key and `{placeholder}` parity; no raw JSX string literals |
| Config | no file other than `src/config.ts` reads `process.env` or hard-codes the default attribute names; a missing required value fails with the variable name |
| Currencies | list, new-look and detail render for 1, 2 and 3 project currencies; no currency literal in `src/` |
| Read-only | with View only, every write control is **disabled, not absent** (list, past looks, detail, new-look entry) |
| Save | forced failure after each of the three steps then retry: 0 duplicates |
| Paging/sorting | 1,000 generated looks: sorting by each sortable column and changing page/size is correct and within budget |

## Run locally

```shell
cd mc-looks-app && npm start              # mc-scripts dev server on the configured port, opens the Merchant Center
```

## Manual scenarios (map to the spec's user stories)

1. **List (US1)**: open Looks. Active looks show name, key, photo or piece strip, set price per currency, sum, saving, status. Search narrows; header count shows the total. Change page size and sort by Setpreis, Summe, Ersparnis, Status; page returns to 1 on sort/filter. At 1440 px no header wraps in de or en.
2. **Create (US2)**: "Neuer Look" → the name in the project languages (at least one), check or change the suggested key, optional photo path → search and add 2–5 pieces, drag to reorder → set prices per currency below the sums → review, leave "Nach dem Anlegen aktiv" off → "Look speichern". Expect: look appears under **Frühere Looks** as inactive; in the project, a Cart Discount `look-<slug>` (inactive, rank in 0.7–0.799) and a Custom Object `look` / `look-<slug>`.
3. **Refusals (US2)**: one piece, six pieces, set price ≥ sum, a piece without a price in one currency, a duplicate piece. Each is refused with a field error and nothing is written.
4. **Switch (US3)**: switch the new look on from "Wieder aktivieren". It joins the main list; `endedAt` is cleared. Add one unit of each piece to a cart in the shop: the cart lands on the set price. Switch off: the look moves to Frühere Looks with an end date; the cart no longer gets the set price.
5. **Conflict (US3)**: open the same look in two tabs, switch in one, then the other: a conflict notice, current state shown, no blind retry.
6. **Past looks (US4)**: with orders that carry a look's discount, the card shows sets, orders, revenue per currency; best seller first with "Bester Look"; a look with no sale reads "Kein Set verkauft". Cut the `view_orders` scope or block the request: an error with "Erneut versuchen", cards still usable.
7. **Detail (US5)**: opens from row or card; pieces show stock per size ("nur noch N", "ausverkauft"), sizeless pieces "Einheitsgröße"; change the set price and save; the cart price follows. Fail the object write after the discount write: "Setpreis im Shop noch nicht aktualisiert" with retry, list shows "Setpreis weicht ab". Change a product price: "Setpreis neu berechnen" realigns.
8. **Repair (US6)**: delete a look's Custom Object (or its discount) in the sandbox: row shows "Unvollständig" and "Vervollständigen"; completing never switches the look on.
9. **Read-only (US7)**: sign in with the View-only user: "Nur Lesezugriff" shown; "Neuer Look", switches, "Wieder aktivieren", set-price and photo inputs are visible and disabled.
10. **Language**: profile language en with data locale de: labels and the shop preview texts english, look and product names german.

## Deploy checks

**Connect (production)**: root `connect.yaml` valid; folder `mc-looks-app/` matches `deployAs[].name`; deployment with `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER`; `APPLICATION_URL` is provided by Connect; set it as the Application URL in the registration, state Ready, install for the project, give teams View/Manage.

**Netlify (development/preview)**: site with base `looks`; set `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `APPLICATION_URL`, `CLOUD_IDENTIFIER`; opening any path returns the entry page; response carries `X-Robots-Tag: noindex`; opened outside the Merchant Center it reads no project data.

Switching hosts changes only the Application URL in the registration and the environment variables, never code.

## Open verification before shipping

- Create a look draft in a sandbox via GraphQL and read the discount back to confirm the `absolute` value with a pattern target applies proportionately (see the note in [discount-shape.md](./contracts/discount-shape.md)). Task 1 of implementation.
- Confirm `availability.noChannel` is populated for your sandbox variants; otherwise enable the `FetchDefaultInventory` fallback (research R4).
