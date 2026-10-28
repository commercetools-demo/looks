# Data Model: Looks

The app owns no database. A **look** is three kinds of platform resources that share the key `look-<lookKey>` (one Custom Object, one Discount Group, one Cart Discount per country), plus read-only views onto products, inventory, orders and project settings. Field names are the platform's; the sources are the spec's Key Entities and the `sim-pot` shared module.

A **price cell** is a currency and country: `EUR/DE`, or the bare currency (`EUR`) for a price without a country. Prices, sums, set prices and discounts are kept per cell.

## Stored resources

### Look definition (Custom Object)

| Field | Value |
|---|---|
| container | `look` |
| key | `look-<lookKey>` |
| value | see [contracts/look-value.schema.json](./contracts/look-value.schema.json) |

`value`:

| Field | Type | Rules |
|---|---|---|
| `componentProductIds` | `string[]` | at least 2 distinct product ids (no upper limit), in look order |
| `setPrice` | `{ [cell]: integer }` | cent amounts per price cell; one entry per cell with a set price (a cell without one has no discount); each > 0 and < live sum of that cell |
| `savingPercent` | `{ [cell]: number }` (optional) | cells with a percentage (relative) discount, 0 < p < 100, one decimal; other cells are absolute. `setPrice` of such a cell is informational, derived live from the sum |
| `endedAt` | ISO 8601 string (optional) | set when switched off, removed when switched on; kept by price changes |

The app writes no other fields. An older object that still carries an `image` field stays readable (extra fields are ignored); the next write by the app drops it.

### Discount Group

Key `look-<lookKey>`, created first and inactive. Written by `ensureLookGroup` / `buildLookDiscountGroupDraft`; afterwards only `setIsActive` and delete.

| Field | Rule |
|---|---|
| `name` | the look name per language |
| `description` | the optional look description per language (omitted when empty) |
| `sortOrder` | the look's single rank: lowest free value in `0.7`–`0.7999`, steps of `0.0001`, no trailing zero; unique among all Cart Discounts **and** Discount Groups |
| `isActive` | switched together with the discounts; the group must be active for its discounts to apply |

### Set-price discounts (Cart Discount, one per country)

The first (main) discount has the key `look-<lookKey>`, the others `look-<lookKey>-<COUNTRY>` (`-ALL` for prices without a country; a look key never ends this way). Written at create; afterwards only `changeIsActive`, `changeValue`, and on completion `changeName`/`setDescription`. See [contracts/discount-shape.md](./contracts/discount-shape.md).

| Field | Rule |
|---|---|
| `isActive` | the main discount decides what shoppers pay and the look's status |
| `cartPredicate` | `country = "XX"`, or `country is not defined` for prices without a country |
| `value` | per country one kind: absolute (`absoluteCart`, `money[]` per currency = live sum − set price, `ProportionateDistribution`) or relative (`relativeCart`, `permyriad` = percent × 100, `IndividualApplication`) |
| `target` | pattern target, one `CountOnLineItemUnits` per piece, `minCount = maxCount = 1` |
| `discountGroup` | reference to the look's Discount Group |
| `sortOrder` | none of its own (the group's rank counts) |
| `name` | per language the look has a name in: de `Look-Set: <name>`, every other language `Look set: <name>` |
| `description` | `<name>` (per language) |

## Derived (client-side) entities

### `LookValue`, `LookDiscount`, `LookDiscountGroup` (normalised)

- `LookValue`: the Custom Object value above (`savingPercent` optional).
- `LookDiscount`: `id`, `version`, `key`, `isActive`, `sortOrder`, `createdAt`, `name`, `description`, `amount` (absolute amount per currency), `permyriad` (relative discounts only), `country` (`''` without a country, `undefined` when the predicate is not the app's), `pieceIds` (from the pattern target).
- `LookDiscountGroup`: `id`, `version`, `key`, `sortOrder`, `isActive`.

### `LookRow`

| Field | From |
|---|---|
| `lookKey`, `objectKey` | key suffix / `look-<lookKey>` |
| `name` | per language: main (else first country) discount `name` if `Look-Set: …` form, else `description` |
| `pieceIds` | object `componentProductIds`, else the discount's pattern target |
| `pieces` | tier-2 product data (may be undefined while loading) |
| `setPrice` | object value per cell; for a percentage cell derived from the live sum |
| `cellPercents` | the `savingPercent` of the object, per cell |
| `liveSum` | per cell, from the pieces (a cell is left out when any piece has no price in it) |
| `referenceSum`, `referenceSetPrice` | one amount per project currency (the first country cell of each), for lists |
| `savingPercent` | `round((sum₁ − set₁) / sum₁ × 100)` on the first currency's reference amounts |
| `isActive` | main discount `isActive` (false if no discount) |
| `completeness` | see below |
| `priceDrift` | any cell with a set price: absolute cell: the country discount's amount ≠ live sum − set price (or the discount is relative or missing); percentage cell: the discount's permyriad ≠ round(percent × 100) |
| `discount`, `countryDiscounts` | the main discount and the other country discounts |

### Completeness (state)

| State | Condition |
|---|---|
| `complete` | object and discount exist and name the same set of pieces |
| `missing-discount` | object only |
| `missing-object` | discount only |
| `inconsistent` | both exist, different pieces |

Only `complete` looks can be switched. Transitions: create writes the group and the country discounts (→ `missing-object`), then the object (→ `complete`); the group is not part of the state. Switching sets the group first, then the discounts (on: country discounts, then the main one; off: the main one, then the country discounts). Delete removes the country discounts, the main discount, the group and, last, the object. "Vervollständigen" moves `missing-*` to `complete` and never changes `isActive`.

### Look status for list placement

| Placement | Condition |
|---|---|
| Main list | `complete` and active, or any non-`complete` state |
| Frühere Looks | `complete` and inactive |

### `Piece`

| Field | Rule |
|---|---|
| `id`, `name` (localized), `imageUrl` | image: master variant's, else first variant's with one |
| `prices` | `{ [cell]: cent }` per R5/R19 rule (master variant, valid now, no customer-group or channel price) |
| `sizes[]` | `{ sku, label, availableQuantity }` from variants with default inventory; label from `config.variantAttributes`; empty ⇒ "Einheitsgröße" |
| `soldOutEverywhere` | every size ≤ 0 |

Stock state: `sold-out` ≤ 0, `low` 1–3, `ok` > 3.

### `PastLookRow`

`lookKey`, `objectKey`, `name`, `pieceImageUrls[]`, `pieceCount`, `activeFrom` (discount `createdAt`), `activeUntil?` (object `endedAt`), `orders`, `setsSold`, `revenue: { [currency]: cents }`, `discountId`. Order: `setsSold` desc, then name. `setsSold = floor(units / pieceCount)`.

### `NewLook` and `SaveProgress`

`NewLook`: `{ key?, label{language→text}, description?{language→text}, componentProductIds, setPrice{cell→cents}, savingPercent?{cell→percent}, sum{cell→cents} }`. `SaveProgress`: `{ group?{id,version}, discount?{id,version}, countryDiscounts?{key→{id,version}}, objectWritten, activated }`; passed back to resume after a failed step. A resume reuses the earlier plan only if the entered data still matches it.

### Configuration (`src/config.ts`)

`variantAttributes` (env `VARIANT_ATTRIBUTES`, default `size`). Build-time values of the application config: `entryPointUriPath`, `applicationId`, `applicationUrl`, `cloudIdentifier`, `initialProjectKey`.

## Validation rules (single module `validate.ts`)

| Code | Rule |
|---|---|
| `name-missing` | at least one language has a non-empty name after trim |
| `key-invalid` | a chosen key: letters, digits, `-`, `_`; 1 to 251 characters after trimming (256 with the `look-` prefix); not ending in `-` plus two capital letters or `-ALL` |
| `pieces-count` | at least 2 pieces (no maximum) |
| `piece-duplicate` | distinct ids |
| `set-price-none` | at least one cell has a live sum and a set price |
| `set-price-not-positive` | integer > 0 per cell with a set price |
| `set-price-not-below-sum` | set price < live sum per cell |
| `sum-not-live` | entered sum equals live sum at save |
| `saving-percent-invalid` | a percentage: 0 < p < 100, at most one decimal |
| `discount-mode-mixed` | the cells of one country are all amounts or all the same percentage |

Removed: `piece-price-missing` (a cell without a price from every piece simply has no row), `image-invalid` (no look photo).

## Limits

100 active, code-less, store-independent Cart Discounts per project (one per country of each active look); 1,000 ranks in the app range (one per look); look key ≤ 40 slug characters + prefix; 500 per GraphQL page.
