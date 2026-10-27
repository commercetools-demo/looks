# Research: Looks

Decisions that the plan rests on. Each has Decision, Rationale, Alternatives. Sources: the `sim-pot` implementation (`frontend/mc-look-builder`, `packages/shared/src/looks`), the project constitution, commercetools documentation via the Knowledge MCP and the `commercetools-connect` skill references. GraphQL claims were checked with `commercetools-graphql-validate` and the schema tool on 2026-10-27.

## R1. Data access: Merchant Center GraphQL proxy, not REST

- **Decision**: all reads and writes use `useMcQuery`/`useMcMutation` with `context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM }`.
- **Rationale**: constitution principle II. The source app's REST client works but bypasses the conventions merchants and reviewers rely on, and gives up Apollo's normalised cache (needed for "update in place after save", principle Data Layer). Everything the app needs exists in GraphQL (validated): `project { currencies }`, `cartDiscounts`, `createCartDiscount`, `updateCartDiscount` (with `changeIsActive`, `changeValue`, `changeName`, `setDescription`), `customObjects(container:)`, `createOrUpdateCustomObject`, `orders`, `products`, `productsSearch`, `inventoryEntries`.
- **Alternatives**: REST through `/proxy/ctp` (source app) — rejected by the constitution. Mixed — rejected, two error models.
- **Watch**: `orders` has no `withTotal` argument in GraphQL (the REST call used it); paging stops when a page returns fewer than the page size.

## R2. Reuse the source's pure logic, not its structure

- **Decision**: port `keys`, `sort-order`, `prices`, `names`, `validate`, look-value/discount builders, `look-rows`, `past-looks`, `pieces`, `stock` from `sim-pot` into `src/domain/`, adapted: no brand, currency list from the project, attribute names from config, container `look`, prefix `look-`. Drop the seed, the registry, the font/theme/logo code, the `@sim/shared` workspace package.
- **Rationale**: this logic is exactly the part that took iteration to get right (fix-rounds M1/M2/M7, the `sortOrder` trailing-zero rule CL-084, proportionate distribution, resumable save). It is already covered by specs that can be ported.
- **Alternatives**: rewrite from the spec — slower and re-introduces solved bugs.

## R3. Paging and sorting: client-side, two loading tiers

- **Decision**:
  - **Tier 1** (always, all looks): `customObjects(container:"look")` paged by 500 plus `cartDiscounts` paged by 500 filtered by key prefix `look-` in the client. Gives name, status, set price, completeness and photo path for every look.
  - **Tier 2** (prices and piece images): `products(where:"id in (…)")` in chunks of 100, for the pieces of the **visible page** first; when the user sorts by Summe or Ersparnis, or the drift warning must be known for all rows, all remaining pieces are loaded behind a progress state.
  - Filtering, sorting and slicing happen in memory in `src/domain/sorting.ts` and `paging.ts` (pure, tested). Default sort name ascending uses tier 1 only, so the first page renders after one round trip.
- **Rationale**: Summe, Ersparnis, Status and drift depend on live prices and the discount state; no API can sort by them. 1,000 looks is about 2 pages of objects, 2 of discounts and up to 10 product chunks of ≤5,000 ids total (≤100 ids per call), which is fine once, and Apollo caches it. `where` on `key` with a prefix operator is not guaranteed for Cart Discounts, so filtering by prefix in the client is the safe choice (the source does the same).
- **Alternatives**: server paging on Custom Objects by key — gives only name order and makes the other sortable columns wrong. Storing the sum on the look — stale the moment a price changes, rejected.
- **Consequence**: SC-004 is met by tier 1 (first page) and by tier 2 for the visible page; sorting by Summe/Ersparnis may show a loading state for large projects. Page and size are kept in the URL query so a return from detail restores them.

## R4. Pieces, size attribute, colour, stock

- **Decision**: product reads use `products` (by ids) and `productsSearch` (text) returning `masterData.current` with `masterVariant`/`variants` including `prices`, `images`, `attributesRaw`, and `availability { noChannel { availableQuantity } }`. Size label from the configured size attribute; colour from the configured colour-name attribute, then the configured colour attribute's label; sizeless products show "Einheitsgröße". A size exists only for a variant with a default-inventory entry (`availability.noChannel` present); if no variant has one, all variants are listed as sold out. Image: master variant's, else first variant's with an image.
- **Rationale**: spec FR-032, FR-084, and the source's "ghost colour group" handling. Default inventory means `noChannel`, so no channel lookup request is needed (the source needed one).
- **Alternatives**: `inventoryEntries(where: sku in (…) and supplyChannel is not defined)` — validated and kept as the fallback if `availability.noChannel` proves empty for a project; not the default because it adds a round trip per chunk.
- **Search**: `productsSearch` with a case-insensitive wildcard on the localized name in the data locale (`*term*`), limit 20, so parts of compound words match. No product selection filter (no brands).

## R5. Currencies and list price rule

- **Decision**: `project { currencies }` is read once (`use-project-currencies`) and drives every price column, input, validation and the discount `money` array. A piece's list price in a currency is the master variant's price in that currency with no `country`, `customerGroup` or `channel`. Savings percent uses the first project currency. Sums are omitted for a currency when any piece lacks a price (a missing price never reads as a smaller sum).
- **Rationale**: FR-007/008. The source's rule was EUR without country and CHF with any country; the generic rule is stricter and safer.
- **Alternatives**: first price in the currency regardless of scope — can pick a customer-group or channel price and understate the sum.
- **Edge**: a project currency added later makes existing looks lack a price in it; they are flagged and cannot be repriced until every currency has a set price.

## R6. Save order, idempotency, key and rank allocation

- **Decision**: keep the source's three-step save (discount inactive → Custom Object → optional activation), each step checking by key first and resumable from a `SaveProgress` value; on a duplicate key re-plan once. Key = `look-` + slug of the English name (≤40 chars incl. suffix budget; umlaut transliteration), suffix `-2`, `-3` while taken. Rank: lowest free value in `0.7`–`0.799`, written without trailing zeros, computed from all Cart Discount ranks right before create. Custom Object writes use `createOrUpdateCustomObject` (with `version` for updates so a concurrent change fails with a conflict instead of overwriting).
- **Rationale**: spec FR-040/042; behaviour proven in the source.
- **Alternatives**: transaction-like single write — not available across two resources.
- **Note**: the platform limit of 100 active, code-less, store-independent Cart Discounts applies to activation; a `MaxCartDiscountsReached` error is mapped to a readable message.

## R7. Concurrency and minimal updates

- **Decision**: every update sends the resource's current `version`; a 409/`ConcurrentModification` is shown as "geändert, bitte neu laden" and the app re-reads without retrying. Set price: read current discount version, send `changeValue`, then upsert the object with its version. A set-price or photo save with no change makes no call. Switching writes `changeIsActive`, then best-effort records/clears `endedAt` on the object.
- **Rationale**: principle V and spec FR-050/052.
- **Alternatives**: last-write-wins — rejected by the constitution.

## R8. Permissions and read-only rendering

- **Decision**: route is under the app shell, which enforces View. A `useCanManage()` hook (from `useIsAuthorized` with `PERMISSIONS.Manage`) feeds every write control's `isDisabled`. Controls are never conditionally unrendered, including the "Aktiv" switch, "Neuer Look", "Wieder aktivieren", set-price and photo inputs; a "Nur Lesezugriff" badge appears in the header.
- **Rationale**: principle III is non-negotiable; the source hid controls, which this plan changes on purpose.
- **Nimbus note**: put `isDisabled` on `FormField.Root`, not on `Select.Root`, and assert `disabled` in tests.

## R9. Hosting: one bundle, two paths

- **Decision**: repository root has `connect.yaml` (`deployAs: - name: mc-looks-app, applicationType: merchant-center-custom-application`, standard configuration `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH` default `looks`, `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER` default `gcp-eu`) and `netlify.toml` (`base = "mc-looks-app"`, `command = "npm run build"`, `publish = "public"`, SPA rewrite `/* → /index.html 200`, `X-Robots-Tag: noindex`, Node 22). `custom-application-config.mjs` uses `${env:…}` placeholders for `entryPointUriPath`, `cloudIdentifier`, `applicationId`, `url`. Connect injects `APPLICATION_URL`; on Netlify it is set as an environment variable. The app folder is a sibling of nothing else and has its own `package.json` (no workspaces).
- **Rationale**: Connect requires `deployAs[].name` to equal a root-level folder and builds inside it; `connect.yaml` does not declare `APPLICATION_URL`. The same bundle then serves both hosts (FR-081). Verified in the `commercetools-connect` skill's MC-customizations and monorepo references.
- **Alternatives**: app at repo root — Connect cannot find it by name. Two separate configs — drift.
- **Note**: the constitution's workflow bullet was amended for this layout.

## R10. Configuration module and `.env` path

- **Decision**: `src/config.ts` is the only reader of per-project values: `SIZE_ATTRIBUTE` (default `size`), `COLOR_NAME_ATTRIBUTE` (default `color-name`), `COLOR_ATTRIBUTE` (default `color`), `SHOP_ORIGIN`. For now it exports typed defaults; the same file switches to `process.env` reads (`mc-scripts` inlines `${env:…}`/`process.env` at build) when the variables are introduced, with a committed `.env` of defaults and `.env.local` overrides, as is common for Merchant Center apps. A required value that is missing or empty throws at build/start-up naming the variable. A unit test fails if any other file reads `process.env` or contains a literal of these defaults.
- **Rationale**: FR-084/085 ("move to `.env` later without touching callers").
- **Alternatives**: scatter `process.env` reads — rejected; fetching configuration at runtime from a Custom Object — over-engineering for a developer-only setting.

## R11. Past looks sales

- **Decision**: port `salesByDiscount`: a line sold as part of a set carries the look's discount in `discountedPricePerQuantity[].discountedPrice.includedDiscounts[].discount.id`. Query `orders(where: createdAt >= <now-90d>, sort: ["createdAt desc"], limit: 500, offset)` up to 4 pages, requesting only `id` and `lineItems { discountedPricePerQuantity … }`. Sets = floor(units / pieceCount); orders = orders with at least one unit; revenue per currency from the discounted unit price. A full last page shows the "most recent 2000 orders" note. Loaded independently of the list and only when at least one past look exists.
- **Rationale**: spec FR-022/023; order lines do not carry the look key, so the discount id is the only link.
- **Alternatives**: store sales counters on the look (written by an order subscription) — out of scope, needs a backend.

## R12. i18n and tests

- **Decision**: react-intl `defineMessages` next to each component, unique ids prefixed `Looks.`; German is the reference; `npm run extract-intl` (`.d.ts` excluded) writes `core.json`; `en.json`/`de.json` parity (keys and `{placeholders}`) checked by a spec. Component specs use `msw` GraphQL handlers with `onUnhandledRequest: 'error'` and assert mutation variables; pure logic has plain specs; a spec validates every `.graphql` document against `schemas/ctp.json`.
- **Rationale**: constitution principle IV and Development Workflow.

## R13. Shop preview

- **Decision**: a neutral custom composition from Nimbus primitives mirroring the structure of the shop's set block: optional look photo above, "Set zu <price>" with struck-through sum, one row per piece (image, name, size dropdown with sold-out and low-stock states, low stock = 1 to 3), inert full-width button. Texts are German regardless of profile language; only the caption follows the user language. Prices in the project's first currency.
- **Rationale**: spec FR-070/071; brand styling is out of scope.
- **Alternatives**: embed the real storefront in an iframe — needs a preview route in the shop and cross-origin auth; out of scope.

## R14. Open points carried to implementation (no spec change)

- The exact GraphQL shape for the `value` of `CartDiscount` in reads: query `value { type ... on AbsoluteDiscountValue { money { currencyCode centAmount } } }` (validated); `target` through `... on CartDiscountPatternTarget` (validated; `PatternTarget` is not a type).
- `productsSearch` requires the project's Product Search index to be active; a project without it gets a readable error with retry, and there is no fallback search (documented limitation).
- Whether `availability.noChannel` is populated depends on inventory entries without a supply channel; the `inventoryEntries` fallback in R4 covers projects where it is not.

## R15. Decisions taken while building

- **Data port**: the domain flows (save, switch, reprice, photo, complete) run against a `LookApi` interface (`src/domain/look-api.ts`). `createLookApi` implements it with the Apollo client from the application shell and the `ctp` context; reads that feed a write use `fetchPolicy: 'no-cache'` so versions are never stale. The list keeps its rows in component state and replaces a discount in place after a write (same effect as the normalised-cache update the constitution asks for, without a `refetch()`).
- **Tests**: component specs inject an in-memory `LookApi` (`test-utils/fake-look-api.ts`) to exercise behaviour and failure points; the GraphQL layer itself (variables, paging, error mapping, value conversion) is covered by `msw` specs of `createLookApi`.
- **Discount value input**: `absoluteCart` (carries `applicationMode`), see `contracts/discount-shape.md`.
- **Currencies read**: `project { currencies }` needs the `view_project_settings` scope, which is in the app's View scopes.
- **Product names**: read with `name(acceptLanguage: [dataLocale, de, en])`, so a piece is shown in the data locale with the standard fallback.
- **Registry limits**: the package registry used here refuses very recent releases, so `@fastify/busboy` is pinned to 3.2.2 through `overrides` in `package.json`.
