# Data Model: Looks

The app owns no database. A **look** is two platform resources joined by key, plus read-only views onto products, inventory, orders and project settings. Field names are the platform's; the sources are the spec's Key Entities and the `sim-pot` shared module.

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
| `savingPercent` | `{ [cell]: number }` (optional) | cells with a percentage (relative) discount, 0 < p < 100, one decimal; other cells are absolute. `setPrice` of such a cell is informational, derived live |
| `setPrice` | `{ [currency]: integer }` | cent amounts; one entry per project currency; each > 0 and < live sum in that currency |
| `endedAt` | ISO 8601 string (optional) | set when switched off, removed when switched on; kept by price changes |

The app writes no other fields. An older object that still carries an `image` field stays readable (extra fields are ignored); the next write by the app drops it.

### Set-price discount (Cart Discount)

Same key `look-<lookKey>`. Written once at create; afterwards only `changeIsActive`, `changeValue`, and on completion `changeName`/`setDescription`. See [contracts/discount-shape.md](./contracts/discount-shape.md).

| Field | Rule |
|---|---|
| `isActive` | decides what shoppers pay and the look's status |
| `value` | absolute, `money[]` per project currency = live sum − set price; `applicationMode: ProportionateDistribution` |
| `target` | pattern target, one `CountOnLineItemUnits` per piece, `minCount = maxCount = 1` |
| `sortOrder` | unique among all Cart Discounts; app range `0.7`–`0.799`, no trailing zero |
| `name` | per language the look has a name in: de `Look-Set: <name>`, every other language `Look set: <name>` |
| `description` | `<name>` (per language) |

## Derived (client-side) entities

### `LookRow`

| Field | From |
|---|---|
| `lookKey`, `objectKey` | key suffix / `look-<lookKey>` |
| `name` | per language: discount `name` if `Look-Set: …` form, else `description` |
| `pieceIds` | object `componentProductIds`, else the discount's pattern target |
| `pieces` | tier-2 product data (may be undefined while loading) |
| `setPrice` | object value |
| `liveSum`, `discountAmount` | per currency, from pieces and discount |
| `savingPercent` | `round((sum₁ − set₁) / sum₁ × 100)` on the first currency |
| `isActive` | discount `isActive` (false if no discount) |
| `completeness` | see below |
| `priceDrift` | any currency: `liveSum − discountAmount ≠ setPrice`, all three present; for a percentage cell: the discount's permyriad ≠ round(percent × 100) |
| `cellPercents` | the `savingPercent` of the object, per cell |

### Completeness (state)

| State | Condition |
|---|---|
| `complete` | object and discount exist and name the same set of pieces |
| `missing-discount` | object only |
| `missing-object` | discount only |
| `inconsistent` | both exist, different pieces |

Only `complete` looks can be switched. Transitions: create writes discount (→ `missing-object`), then object (→ `complete`). "Vervollständigen" moves `missing-*` to `complete` and never changes `isActive`.

### Look status for list placement

| Placement | Condition |
|---|---|
| Main list | `complete` and active, or any non-`complete` state |
| Frühere Looks | `complete` and inactive |

### `Piece`

| Field | Rule |
|---|---|
| `id`, `name` (localized), `imageUrl` | image: master variant's, else first variant's with one |
| `prices` | `{ [currency]: cent }` per R5 rule |
| `sizes[]` | `{ sku, label, availableQuantity }` from variants with default inventory; label from `config.sizeAttribute`; empty ⇒ "Einheitsgröße" |
| `soldOutEverywhere` | every size ≤ 0 |

Stock state: `sold-out` ≤ 0, `low` 1–3, `ok` > 3.

### `PastLookRow`

`lookKey`, `objectKey`, `name`, `pieceImageUrls[]`, `pieceCount`, `activeFrom` (discount `createdAt`), `activeUntil?` (object `endedAt`), `orders`, `setsSold`, `revenue: { [currency]: cents }`, `discountId`. Order: `setsSold` desc, then name. `setsSold = floor(units / pieceCount)`.

### `NewLook` and `SaveProgress`

`NewLook`: `{ label{de,en}, componentProductIds, setPrice{currency→cents}, sum{currency→cents}, activate }`. `SaveProgress`: `{ discount?{id,version}, objectWritten, activated }`; passed back to resume after a failed step. A resume reuses the earlier plan only if the entered data still matches it.

### Configuration (`src/config.ts`)

`variantAttributes` (`size`), `shopOrigin`. Plus build-time: `entryPointUriPath`, `applicationId`, `applicationUrl`, `cloudIdentifier`, `initialProjectKey`.

## Validation rules (single module `validate.ts`)

| Code | Rule |
|---|---|
| `name-missing` | at least one language has a non-empty name after trim |
| `pieces-count` | 2 ≤ n ≤ 5 |
| `piece-duplicate` | distinct ids |
| `piece-price-missing` | price in every project currency |
| `set-price-not-positive` | integer > 0 per currency |
| `set-price-not-below-sum` | set price < live sum per currency |
| `sum-not-live` | entered sum equals live sum at save |
| `key-invalid` | a chosen key: letters, digits, `-`, `_`; 1 to 251 characters after trimming (256 with the `look-` prefix) |

## Limits

100 active, code-less, store-independent Cart Discounts per project; 100 ranks in the app range; look key ≤ 40 slug characters + prefix; 500 per GraphQL page.
