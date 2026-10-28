# Looks

A Merchant Center custom application for curated looks: at least 2 products sold as a set at a set price below the sum of their single prices. Merchandisers list, create, switch on and off and reprice looks, see how retired looks sold, all without a ticket and without a deployment.

A look is three kinds of project resources that share the key `look-<lookKey>`:

- a Custom Object in the container `look` (pieces, set price per price cell, optional percentages, optional switch-off time);
- one Discount Group `look-<lookKey>`: its name is the look name, its description the optional look description (both per language), its `sortOrder` the look's single rank and its `isActive` the switch;
- one Cart Discount per country that has set prices (the main one `look-<lookKey>`, the others `look-<lookKey>-<COUNTRY>` or `-ALL`), inside the group. The discounts decide what shoppers pay.

Prices are handled per price cell (currency and country, for example `EUR/DE`), taken from the master variant's list prices that are valid now. A percentage gives a relative discount, a set price an absolute one. A look is created in four steps (`/new`, `/new/pieces`, `/new/price`, `/new/review`) and can be deleted from its detail page.

- What the app can do: [`FEATURES.md`](./FEATURES.md)
- Specification, plan and tasks: [`specs/001-looks-app/`](./specs/001-looks-app/)
- Setup, registration and both deploy paths: [`docs/SETUP.md`](./docs/SETUP.md)
- The app lives in [`mc-looks-app/`](./mc-looks-app/), its own npm project (Connect requires the folder name to match `connect.yaml`).

```shell
cd mc-looks-app
npm install
npm start
npm test
```
