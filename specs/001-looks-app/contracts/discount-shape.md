# Set-price Cart Discount: the shape the app writes

The shop applies the set price from this discount. It is created inactive, then (optionally) activated. Built by `buildLookCartDiscountDraft` in `src/domain/look-actions.ts` and sent as the GraphQL `CartDiscountDraft` of `CreateLookDiscount`.

```json
{
  "key": "look-<lookKey>",
  "name": [
    { "locale": "de", "value": "Look-Set: <name de>" },
    { "locale": "en", "value": "Look set: <name en>" }
  ],
  "description": [
    { "locale": "de", "value": "<name de>" },
    { "locale": "en", "value": "<name en>" }
  ],
  "cartPredicate": "true",
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
  "sortOrder": "0.7",
  "stores": [],
  "isActive": false,
  "requiresDiscountCode": false
}
```

Rules:

- `money` has one entry per project currency; `centAmount` = live sum of the pieces − set price in that currency.
- The value uses the GraphQL input that carries the application mode (`absoluteCart`, schema-validated). Reading a discount back, the app accepts both `AbsoluteCartDiscountValue` and `AbsoluteDiscountValue` and takes `money` from either. **Still to confirm against a live project** (needs credentials, task T021): that a pattern-target discount created this way applies the amount proportionately and that the project accepts it; if not, switch `buildDiscountValueInput` in `src/domain/look-actions.ts` to the input that does.
- One `CountOnLineItemUnits` per piece, in look order; `minCount = maxCount = 1`, so the discount applies once per complete set.
- `sortOrder` is the lowest free value in `0.7`–`0.799` among all Cart Discounts, no trailing zero (`0.7`, `0.701`, … `0.71`).
- `stores: []`, `requiresDiscountCode: false`: applies in every cart.
- Updates afterwards: `changeIsActive`, `changeValue` (same value shape), and on completion `changeName` / `setDescription`. The look name is read back from `name` when it has the `Look-Set: …` form, else from `description`.
