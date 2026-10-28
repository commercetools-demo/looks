# Looks

A Merchant Center custom application for curated looks: at least 2 products sold as a set at a set price below the sum of their single prices. Merchandisers list, create, switch on and off and reprice looks, see how retired looks sold, and preview how a look appears in the shop, without a ticket and without a deployment.

A look is a pair of project resources with the same key `look-<lookKey>`: a Custom Object in the container `look` (pieces, set price per currency, optional photo, optional switch-off time) and the Cart Discount that applies the set price. The discount decides what shoppers pay.

- Specification, plan and tasks: [`specs/001-looks-app/`](./specs/001-looks-app/)
- Setup, registration and both deploy paths: [`docs/SETUP.md`](./docs/SETUP.md)
- The app lives in [`mc-looks-app/`](./mc-looks-app/), its own npm project (Connect requires the folder name to match `connect.yaml`).

```shell
cd mc-looks-app
npm install
npm start
npm test
```
