# Set-price Cart Discount: the shape the app writes

A look has **one Discount Group** (key `look-<lookKey>`, created first, inactive) and **one Cart Discount per country** that has set prices, all inside that group. The group's `name` is the look name and its `description` the optional look description (both localized, entered when the look is created); it also carries the look's single `sortOrder` (unique among all Cart Discounts and Discount Groups) and its `isActive` switch (a group must be active for its discounts to apply); a discount inside a group has no `sortOrder` of its own. Only one discount of a group applies to a cart (best deal), which is harmless here because the country conditions are exclusive. The first (main) discount is keyed `look-<lookKey>` and decides the look's status; the others are keyed `look-<lookKey>-<COUNTRY>` (`-ALL` for prices without a country). Each has its own `sortOrder`, and a cart condition for its country: `country = "DE"`, or `country is not defined` for prices without a country. The example below is one such discount; its `money` holds one entry per currency of that country. Set prices are stored per price cell (`EUR/DE`, or `EUR`) in the Custom Object. Look keys must not end in `-` plus two capital letters or `-ALL`.

The shop applies the set price from this discount. It is created inactive, then (optionally) activated. Built by `buildLookCartDiscountDraft` in `src/domain/look-actions.ts` and sent as the GraphQL `CartDiscountDraft` of `CreateLookDiscount`.

```json
{
  "key": "look-<lookKey>",
  "name": [
    { "locale": "de", "value": "Look-Set: <name de>" },
    { "locale": "<other language>", "value": "Look set: <name in that language>" }
  ],
  "description": [
    { "locale": "<language>", "value": "<name in that language>" }
  ],
  "cartPredicate": "country = \"<country>\"",
  "value": {
    "absoluteCart": {
      "money": [
        { "currencyCode": "<currency>", "centAmount": "<live sum> - <set price>" }
      ],
      "applicationMode": "ProportionateDistribution"
    }
  },
  "target": {
    "pattern": {
      "triggerPattern": [],
      "targetPattern": [
        { "CountOnLineItemUnits": { "predicate": "product.id = \"<productId>\"", "minCount": 1, "maxCount": 1 } }
      ],
      "selectionMode": "Cheapest"
    }
  },
  "discountGroup": { "typeId": "discount-group", "key": "look-<lookKey>" },
  "stores": [],
  "isActive": false,
  "requiresDiscountCode": false
}
```

Rules:

- `money` has one entry per project currency; `centAmount` = live sum of the pieces − set price in that currency.
- The value uses the GraphQL input that carries the application mode (`absoluteCart`, schema-validated). Reading a discount back, the app accepts both `AbsoluteCartDiscountValue` and `AbsoluteDiscountValue` and takes `money` from either. **Still to confirm against a live project** (needs credentials, task T021): that a pattern-target discount created this way applies the amount proportionately and that the project accepts it; if not, switch `buildDiscountValueInput` in `src/domain/look-actions.ts` to the input that does.
- One `CountOnLineItemUnits` per piece, in look order; `minCount = maxCount = 1`, so the discount applies once per complete set.
- The Discount Group's `sortOrder` is the lowest free value in `0.7`–`0.7999` among all Cart Discounts **and** Discount Groups, no trailing zero (`0.7`, `0.7001`, … `0.701`); the discounts inside the group are drafted without `sortOrder`.
- Switching a look sets the group's `isActive` first (setIsActive), then the discounts (on: country discounts, main last; off: main first). A look created before groups has no group: switching skips it, and repricing or completing such a look creates the group first.
- `stores: []`, `requiresDiscountCode: false`: applies in every cart.
- Updates afterwards: `changeIsActive`, `changeValue` (same value shape), and on completion `changeName` / `setDescription`. The look name is read back from `name` when it has the `Look-Set: …` form, else from `description`.
