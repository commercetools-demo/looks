# Research: Looks

Decisions that the plan rests on. Each has Decision, Rationale, Alternatives. Sources: the implementation of an earlier internal prototype (look builder and shared look module), the project constitution, commercetools documentation via the Knowledge MCP and the `commercetools-connect` skill references. GraphQL claims were checked with `commercetools-graphql-validate` and the schema tool on 2026-10-27.

## R1. Data access: Merchant Center GraphQL proxy, not REST

- **Decision**: all reads and writes use `useMcQuery`/`useMcMutation` with `context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM }`.
- **Rationale**: constitution principle II. The source app's REST client works but bypasses the conventions merchants and reviewers rely on, and gives up Apollo's normalised cache (needed for "update in place after save", principle Data Layer). Everything the app needs exists in GraphQL (validated): `project { currencies }`, `cartDiscounts`, `createCartDiscount`, `updateCartDiscount` (with `changeIsActive`, `changeValue`, `changeName`, `setDescription`), `deleteCartDiscount`, `discountGroup`, `discountGroups`, `createDiscountGroup`, `updateDiscountGroup` (`setIsActive`), `deleteDiscountGroup`, `customObjects(container:)`, `createOrUpdateCustomObject`, `deleteCustomObject`, `orders`, `products`, `productsSearch`, `inventoryEntries`.
- **Alternatives**: REST through `/proxy/ctp` (source app) — rejected by the constitution. Mixed — rejected, two error models.
- **Watch**: `orders` has no `withTotal` argument in GraphQL (the REST call used it); paging stops when a page returns fewer than the page size.

## R2. Reuse the source's pure logic, not its structure

- **Decision**: port `keys`, `sort-order`, `prices`, `names`, `validate`, look-value/discount builders, `look-rows`, `past-looks`, `pieces`, `stock` from the earlier prototype into `src/domain/`, adapted: no brand, currency list from the project, attribute names from config, container `look`, prefix `look-`. Drop the seed, the registry, the font/theme/logo code, the prototype's shared workspace package.
- **Rationale**: this logic is exactly the part that took iteration to get right (fix-rounds M1/M2/M7, the `sortOrder` trailing-zero rule CL-084, proportionate distribution, resumable save). It is already covered by specs that can be ported.
- **Alternatives**: rewrite from the spec — slower and re-introduces solved bugs.

## R3. Paging and sorting: client-side, two loading tiers

- **Decision**:
  - **Tier 1** (always, all looks): `customObjects(container:"look")` paged by 500 plus `cartDiscounts` paged by 500 filtered by key prefix `look-` in the client (the main discount `look-<key>` and the country discounts `look-<key>-<COUNTRY>` are joined to their look by key). Gives name, status, set price and completeness for every look. Discount Groups are read only to allocate a rank and to switch or delete a look.
  - **Tier 2** (prices and piece images): `products(where:"id in (…)")` in chunks of 100, for the pieces of the **visible page** first; when the user sorts by Summe or Ersparnis, or the drift warning must be known for all rows, all remaining pieces are loaded behind a progress state.
  - Filtering, sorting and slicing happen in memory in `src/domain/sorting.ts` and `paging.ts` (pure, tested). Default sort name ascending uses tier 1 only, so the first page renders after one round trip.
- **Rationale**: Summe, Ersparnis, Status and drift depend on live prices and the discount state; no API can sort by them. 1,000 looks is about 2 pages of objects, 2 of discounts and up to 10 product chunks of ≤5,000 ids total (≤100 ids per call), which is fine once, and Apollo caches it. `where` on `key` with a prefix operator is not guaranteed for Cart Discounts, so filtering by prefix in the client is the safe choice (the source does the same).
- **Alternatives**: server paging on Custom Objects by key — gives only name order and makes the other sortable columns wrong. Storing the sum on the look — stale the moment a price changes, rejected.
- **Consequence**: SC-004 is met by tier 1 (first page) and by tier 2 for the visible page; sorting by Summe/Ersparnis may show a loading state for large projects. Page and size are kept in the URL query so a return from detail restores them.

## R4. Pieces, variant attributes, stock

- **Decision**: product reads use `products` (by ids) and `productsSearch` (text) returning `masterData.current` with `masterVariant`/`variants` including `prices`, `images`, `attributesRaw`, and `availability { noChannel { availableQuantity } }`. Size label from the configured variant attributes; sizeless products show "Einheitsgröße". A size exists only for a variant with a default-inventory entry (`availability.noChannel` present); if no variant has one, all variants are listed as sold out. Image: master variant's, else first variant's with an image.
- **Rationale**: spec FR-032, FR-084, and the source's "ghost colour group" handling. Default inventory means `noChannel`, so no channel lookup request is needed (the source needed one).
- **Alternatives**: `inventoryEntries(where: sku in (…) and supplyChannel is not defined)` — validated and kept as the fallback if `availability.noChannel` proves empty for a project; not the default because it adds a round trip per chunk.
- **Search**: `productsSearch` with case-insensitive `*term*` wildcards, in an `or`, on name, description, slug and search keywords (in the data locale), and on key, product id and variant SKU; limit 20, so parts of compound words match (`src/hooks/use-looks-connector/search-query.ts`). Meta title and meta description are not searchable fields of the product search API. An empty text lists products that have a name. No product selection filter (no brands).

## R5. Currencies, price cells and list price rule

- **Decision**: `project { currencies languages }` is read once (`use-project-settings`) and orders every price column. Prices are handled per **price cell**: currency and country (key `EUR/DE`, or `EUR` for a price without a country). A piece's list price in a cell is the master variant's price (other variants only for cells the master lacks), only in project currencies, only while valid now (`validFrom`/`validUntil`; a time-limited price wins over the regular one of its cell), and never one restricted to a customer group or channel. The set-price table has one row per cell in which every piece has a price; the sum of a cell is left out when any piece lacks a price (a missing price never reads as a smaller sum). The list shows one amount per currency (the first country cell of each) and the saving on the first project currency.
- **Rationale**: FR-007/008. The cart selects its price by the cart's country, so a single amount per currency would make the set price land wrongly for projects with country prices (the commercetools sample data has EUR for DE, GBP for GB and USD for US).
- **Alternatives**: first price of the currency regardless of scope (can pick a customer-group or channel price and understate the sum; silently wrong for several markets); price selection per country (one request per country and currency); a configured price country (removed with the per-cell model, `PRICE_COUNTRY` no longer exists).
- **Edge**: a cell that becomes available later makes existing looks lack a set price in it; a cell without a set price is valid (an empty row gets no discount), so nothing is flagged.

## R6. Save order, idempotency, key and rank allocation

- **Decision**: save in four writes, each checking by key first and resumable from a `SaveProgress` value: (1) the Discount Group `look-<key>`, inactive; (2) the country Cart Discounts, inactive, in the group; (3) the Custom Object; (4) only when activating: the group on first, then the country discounts, the main discount last. On a duplicate key re-plan once (only for a suggested key). Key = `look-` + slug of the English name (≤40 chars incl. suffix budget; umlaut transliteration), suffix `-2`, `-3` while taken. Rank: the Discount Group's `sortOrder`, the lowest free value in `0.7`–`0.7999` (steps of `0.0001`, no trailing zeros), computed from all Cart Discount **and** Discount Group ranks right before create. Custom Object writes use `createOrUpdateCustomObject` (with `version` for updates so a concurrent change fails with a conflict instead of overwriting).
- **Rationale**: spec FR-040/042. The group carries the single rank and the single switch, so a look has one position among the other discounts and one place to be turned on or off; with the group and the discounts inactive nothing applies until the last activation step.
- **Alternatives**: transaction-like single write is not available across several resources; a rank per country discount used up the range faster (it was the first version).
- **Note**: the platform limit of 100 active, code-less, store-independent Cart Discounts applies to activation; a `MaxCartDiscountsReached` error is mapped to a readable message.

## R7. Concurrency and minimal updates

- **Decision**: every update sends the resource's current `version`; a 409/`ConcurrentModification` is shown as "geändert, bitte neu laden" and the app re-reads without retrying. Set price: per country read the current discount version, send `changeValue` where the value differs (create a missing country discount), then upsert the object with its version. A set-price save with no change makes no call. Switching writes the group's `setIsActive` first, then `changeIsActive` on the discounts (on: country discounts, then main; off: main, then country discounts), then best-effort records/clears `endedAt` on the object. Delete removes the country discounts, the main discount, the group and, last, the object, each with its current version.
- **Rationale**: principle V and spec FR-050/052.
- **Alternatives**: last-write-wins — rejected by the constitution.

## R8. Permissions and read-only rendering

- **Decision**: route is under the app shell, which enforces View. A `useCanManage()` hook (from `useIsAuthorized` with `PERMISSIONS.Manage`) feeds every write control's `isDisabled`. Controls are never conditionally unrendered, including the "Aktiv" switch, "Neuer Look", "Wieder aktivieren", set-price inputs; a "Nur Lesezugriff" badge appears in the header.
- **Rationale**: principle III is non-negotiable; the source hid controls, which this plan changes on purpose.
- **Nimbus note**: put `isDisabled` on `FormField.Root`, not on `Select.Root`, and assert `disabled` in tests.

## R9. Hosting: one bundle, two paths

- **Decision**: repository root has `connect.yaml` (`deployAs: - name: mc-looks-app, applicationType: merchant-center-custom-application`, standard configuration `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH` default `looks`, `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER` default `gcp-eu`) and `netlify.toml` (`base = "mc-looks-app"`, `command = "npm run build"`, `publish = "public"`, SPA rewrite `/* → /index.html 200`, `X-Robots-Tag: noindex`, Node 22). `custom-application-config.mjs` uses `${env:…}` placeholders for `entryPointUriPath`, `cloudIdentifier`, `applicationId`, `url`. Connect injects `APPLICATION_URL`; on Netlify it is set as an environment variable. The app folder is a sibling of nothing else and has its own `package.json` (no workspaces).
- **Rationale**: Connect requires `deployAs[].name` to equal a root-level folder and builds inside it; `connect.yaml` does not declare `APPLICATION_URL`. The same bundle then serves both hosts (FR-081). Verified in the `commercetools-connect` skill's MC-customizations and monorepo references.
- **Alternatives**: app at repo root — Connect cannot find it by name. Two separate configs — drift.
- **Note**: the constitution's workflow bullet was amended for this layout.

## R10. Configuration module and `.env` path

- **Decision**: `src/config.ts` is the only reader of per-project values: `VARIANT_ATTRIBUTES` (default `size`). For now it exports typed defaults; the same file switches to `process.env` reads (`mc-scripts` inlines `${env:…}`/`process.env` at build) when the variables are introduced, with a committed `.env` of defaults and `.env.local` overrides, as is common for Merchant Center apps. A required value that is missing or empty throws at build/start-up naming the variable. A unit test fails if any other file reads `process.env`.
- **Rationale**: FR-084/085 ("move to `.env` later without touching callers").
- **Alternatives**: scatter `process.env` reads — rejected; fetching configuration at runtime from a Custom Object — over-engineering for a developer-only setting.

## R11. Past looks sales

- **Decision**: port `salesByDiscount`: a line sold as part of a set carries the look's discount in `discountedPricePerQuantity[].discountedPrice.includedDiscounts[].discount.id`. Query `orders(where: createdAt >= <now-90d>, sort: ["createdAt desc"], limit: 500, offset)` up to 4 pages, requesting only `id` and `lineItems { discountedPricePerQuantity … }`. Sets = floor(units / pieceCount); orders = orders with at least one unit; revenue per currency from the discounted unit price. A full last page shows the "most recent 2000 orders" note. Loaded independently of the list and only when at least one past look exists.
- **Rationale**: spec FR-022/023; order lines do not carry the look key, so the discount id is the only link.
- **Alternatives**: store sales counters on the look (written by an order subscription) — out of scope, needs a backend.

## R12. i18n and tests

- **Decision**: react-intl `defineMessages` next to each component, unique ids prefixed `Looks.`; German is the reference; `npm run extract-intl` (`.d.ts` excluded) writes `core.json`; `en.json`/`de.json` parity (keys and `{placeholders}`) checked by a spec. Component specs use `msw` GraphQL handlers with `onUnhandledRequest: 'error'` and assert mutation variables; pure logic has plain specs; a spec validates every `.graphql` document against `schemas/ctp.json`.
- **Rationale**: constitution principle IV and Development Workflow.

## R13. Shop preview (removed)

- **Decision**: removed; the shop preview was dropped from the app. Formerly: a neutral custom composition from Nimbus primitives mirroring the structure of the shop's set block: "Set zu <price>" with struck-through sum, one row per piece (image, name, size dropdown with sold-out and low-stock states, low stock = 1 to 3), inert full-width button. All texts, including the card texts, follow the user's language through the app's message files (no fixed shop language). Prices in the project's first currency.
- **Rationale**: spec FR-070/071; brand styling is out of scope.
- **Alternatives**: embed the real storefront in an iframe — needs a preview route in the shop and cross-origin auth; out of scope.

## R14. Open points carried to implementation (no spec change)

- The GraphQL shape for the `value` of `CartDiscount` in reads: `value { type ... on AbsoluteDiscountValue { money } ... on AbsoluteCartDiscountValue { applicationMode money } ... on RelativeDiscountValue { permyriad } ... on RelativeCartDiscountValue { permyriad applicationMode } }`; `target` through `... on CartDiscountPatternTarget` (`PatternTarget` is not a type). Also open: that the cart-discount scopes cover Discount Groups (T021).
- `productsSearch` requires the project's Product Search index to be active; a project without it gets a readable error with retry, and there is no fallback search (documented limitation).
- Whether `availability.noChannel` is populated depends on inventory entries without a supply channel; the `inventoryEntries` fallback in R4 covers projects where it is not.

## R15. Decisions taken while building

- **Data port**: the domain flows (save, switch, reprice, complete, delete) run against a `LookApi` interface (`src/domain/look-api.ts`). `createLookApi` implements it with the Apollo client from the application shell and the `ctp` context; reads that feed a write use `fetchPolicy: 'no-cache'` so versions are never stale. The list keeps its rows in component state and replaces a discount in place after a write (same effect as the normalised-cache update the constitution asks for, without a `refetch()`).
- **Tests**: component specs inject an in-memory `LookApi` (`test-utils/fake-look-api.ts`) to exercise behaviour and failure points; the GraphQL layer itself (variables, paging, error mapping, value conversion) is covered by `msw` specs of `createLookApi`.
- **Discount value input**: `absoluteCart` (carries `applicationMode`) for amounts, `relativeCart` for percentages (R21), see `contracts/discount-shape.md`.
- **Currencies read**: `project { currencies }` needs the `view_project_settings` scope, which is in the app's View scopes.
- **Product names**: read with `name(acceptLanguage: [dataLocale, de, en])`, so a piece is shown in the data locale with the standard fallback.
- **Registry limits**: the package registry used here refuses very recent releases, so `@fastify/busboy` is pinned to 3.2.2 through `overrides` in `package.json`.

## R16. The look name per project language

- **Decision**: the name is a record language → text, one entry per project language (`project { languages }`), edited with the Nimbus `LocalizedField` (data locale first, others behind its toggle). One name is enough; empty translations are dropped before saving. The discount `name` and `description` carry the same languages: German gets `Look-Set: …`, every other language `Look set: …`. The key comes from the English name, else the German one, else the first translation.
- **Rationale**: constitution IV (one input per project language, omit empty translations) and the project-language request; requiring every language would block projects with many languages, and readers already fall back (data locale, de, en, first).
- **Alternatives**: require all languages — too strict for large projects; keep a fixed German/English pair — ignores the project's languages.

## R17. Read price restrictions as references

- **Decision**: a variant's price restrictions are read with `customerGroupRef { id }` and `channelRef { id }`, not `customerGroup { id }` and `channel { id }`.
- **Rationale**: the resolved fields load the referenced resource and fail with "Insufficient scope: view_customers or view_customer_groups" for a user without those scopes (seen on the first product search in a real project). The app only needs to know whether a restriction exists, so the references are enough and the minimum scope set (FR-080) stays unchanged.
The order read follows the same rule: `includedDiscounts { discountRef { id } }` instead of `discount { id }`, so reading sales never resolves (or needs access to) the referenced Cart Discount.

## R18. The look key is visible and editable at creation

- **Decision**: step 1 shows the key (suggested from the name, free of existing keys, following the name until edited) and lets the user change it. A chosen key is validated with the shared key rule, checked against existing keys while typing (the form loads them once; the save checks again), saved as typed, and never renamed: a taken key is a field error, also when it is lost in a race. A suggested (not edited) key keeps the automatic suffix and the one retry. After creation the key is read-only (constitution VI: immutable).
- **Rationale**: the key is the stable link between the look definition and its discount and shows up in the Merchant Center; merchandisers want to see and set it, but silently changing a key they chose would be surprising.
- **Alternatives**: edit only on the review step — the suggestion could not follow the name; allow renaming later — keys are immutable and shared by two resources.

## R19. List price with country-specific prices

- **Decision**: see R5 for the price rule. Set prices, sums and discounts work per cell; one Cart Discount per country (main `look-<key>`, others `look-<key>-<COUNTRY>`, `-ALL` without a country; condition `country = "XX"` or `country is not defined`), all in one Discount Group `look-<key>` that holds the look's single `sortOrder` (`0.7`–`0.7999`, unique among Cart Discounts and Discount Groups) and its on/off switch (`isActive`). Rows without a price from every piece do not exist; an empty set price creates no discount. A look key must not end in `-` plus two capital letters or `-ALL`, so a discount key always names exactly one look.
- **Rationale**: the first version accepted only fully unrestricted prices, which found no price in projects whose prices are per country, blocking every look. One discount per country is needed because a Cart Discount's absolute amount is per currency, not per country, and the condition on the cart country keeps each discount to its market. Only one discount of a group applies to a cart, which is harmless because the country conditions are exclusive.
- **Alternatives**: one discount with all currencies and no country condition (wrong amounts where a currency has several country prices); a rank per discount (the group's rank is shared, see R6).
- **Note**: the master variant is the reference, other variants only add cells it lacks (some catalogs keep prices only on the size variants).
- **Open**: the app assumes the cart-discount scopes cover Discount Groups; not yet confirmed against a live project (T021).

## R20. Variants are told apart by several attributes; no prices in the pieces step

- **Decision**: a variant is labelled by the values of the configured `VARIANT_ATTRIBUTES` (default `size`), e.g. `searchColor,finishColor,size`, joined with " / "; attribute values may be text, number, enum, localized or sets. Several variants are always listed (by SKU when no attribute has a value); only a single variant without any value is "one size". The pieces step shows no prices and no sum, they appear from the set price step on (the same product tile is used on the detail page, without the add action).
- **Rationale**: a product such as a pillow cover has variants that differ by finish and search colour as well as size; the former single `SIZE_ATTRIBUTE` read only text values, so such products were shown as one size. Prices in the pieces step distracted from choosing pieces; the set price step needs the sum and shows it.
- **Alternatives**: one setting per attribute kind — less flexible than an ordered list.

## R21. Relative discounts for percentages

Decision: a country whose cells were set by percentage gets a `relativeCart` Cart Discount (`permyriad`, `IndividualApplication`); amounts keep `absoluteCart`. With the pattern target (empty trigger pattern, one `CountOnLineItemUnits` per piece) a relative value takes the percentage off each matched unit; `ProportionateDistribution` and `EvenDistribution` are not allowed there. `changeValue` can switch kinds. A country has one discount, so its cells cannot mix modes or percentages (`discount-mode-mixed`). The object stores `savingPercent` per cell so the percentage survives price changes; the price of such a cell is derived from the live sum. The group's `sortOrder` and switch cover all country discounts, relative or absolute. Open: untested against a live project.

## R22. Global percentage and per-row mode

- **Decision**: the set-price step has one field "Prozent für alle Zeilen" (0 to 99.9, one decimal) above the table; committing a value sets every row to that percentage. Per row, the field edited last decides the kind: percent or "apply to all" gives a percentage row (relative discount), editing the price an amount row (absolute discount); the column "Rabatt" shows "Prozent" or "Betrag". The field shows the percentage all rows share, so it survives leaving the step.
- **Rationale**: merchandisers think in percent for a whole look; a fixed price for one market stays possible. The percentage is stored as `savingPercent` so it survives cent rounding and price changes.

## R23. Removed after the first versions

Look photo (`image` in the Custom Object, `SHOP_ORIGIN`, "Im Shop ansehen"), the shop preview (R13), the colour settings (`COLOR_NAME_ATTRIBUTE`, `COLOR_ATTRIBUTE`), `PRICE_COUNTRY`, the maximum of 5 pieces (now at least 2, no maximum; the list strip shows 5 images and "+N"), prices on the piece tiles, the 280 px image box on the detail. Delete moved from the list to the detail header (icon button with a Nimbus `ConfirmationDialog`).
