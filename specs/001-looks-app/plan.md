# Implementation Plan: Looks (Merchant Center app for curated looks)

**Branch**: `001-looks-app` (spec directory only; no git branch) | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-looks-app/spec.md`

## Summary

Build **Looks**, a Merchant Center custom application (React 19, Nimbus, `@commercetools-frontend` application shell) in which merchandisers list, create, switch, reprice and retire looks (2–5 products sold at a set price). A look is a pair of project resources sharing the key `look-<lookKey>`: a Custom Object (container `look`) holding the definition, and a Cart Discount holding the set price; the discount's `isActive` decides what shoppers pay.

Technical approach, from [research.md](./research.md):

- All data goes through the **Merchant Center GraphQL proxy** (`ctp` target, Apollo via `useMcQuery`/`useMcMutation`), per the constitution. This deliberately differs from the source app, which used a hand-written REST client. Every operation was validated against the public schema (see [contracts/operations.graphql](./contracts/operations.graphql)).
- **Pure, unit-tested domain logic** (key derivation, validation, discount drafts, rank allocation, completeness, sales aggregation) is carried over from the source and lives in `src/domain/`, free of React and Apollo.
- **Client-side paging and sorting** over the joined set of looks, in two loading tiers so the first page appears fast (see research R3).
- **Currencies from the project**, **default inventory** for stock, **no brands, no seeding**.
- **One configuration module** for everything per-project (size and colour attribute names, shop origin, application URLs), designed to move to `.env` (FR-084/085).
- **Two deploy paths, one bundle**: Connect (`connect.yaml`, production) and Netlify (`netlify.toml`, development/preview).

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Node 22 (build)

**Primary Dependencies**: `@commercetools/nimbus` + `nimbus-icons` (^3.6), `@commercetools-frontend/*` application shell and `mc-scripts` (^27.12), `@apollo/client` 3.x (via shell connectors), `react-intl` ^7, `react-router-dom` 5, `@commercetools/platform-sdk` (types only), `graphql`

**Storage**: none of its own. Project data only: Custom Object container `look`, Cart Discounts, Orders (read), Products, Inventory, Project settings

**Testing**: Jest 30 with `@commercetools-frontend/jest-preset-mc-app/typescript`, Nimbus polyfills and resolver patch, Testing Library, `msw` for the GraphQL layer (`onUnhandledRequest: 'error'`); plain unit specs for domain logic

**Target Platform**: Merchant Center custom application, evergreen browsers; hosted on Connect (production) and Netlify (development/preview)

**Project Type**: web application (single-page Merchant Center custom application)

**Performance Goals**: first page of the looks list within 1 s and fully populated within 3 s at 1,000 looks; page/sort/filter changes within 1 s (SC-004)

**Constraints**: View/Manage permission model (disable, never hide); every UI string in de + en; no hard-coded currency, attribute name or host; minimum OAuth scopes (FR-080); app folder one level below `connect.yaml` with no npm workspaces; constitution rule that mutations carry the current `version`

**Scale/Scope**: up to ~1,000 looks, up to 5 pieces each; 3 screens (list with past looks, new-look flow, detail), ~40 components, ~120 message ids

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: unchanged, all pass.*

| # | Principle | Verdict | How the plan satisfies it |
|---|---|---|---|
| I | Nimbus-first UI | PASS | Nimbus components only; custom compositions from `Box/Flex/Stack/Grid` marked in code; no UIKit. |
| II | MC platform constraints | PASS | MC app shell, `dataLocale`, MC notifications, **GraphQL via the `ctp` proxy** (R1). No REST client. |
| III | View/Manage (NON-NEGOTIABLE) | PASS | `PERMISSIONS.View` gates the route; every write control is rendered disabled without `PERMISSIONS.Manage`, never hidden (R8). |
| IV | Localization completeness | PASS | `defineMessages` per component; flat `src/i18n/data/{core,en,de}.json`; extract script excludes `.d.ts`; automated key/placeholder parity test (SC-009). Data-level: names are required in de and en; empty translations omitted. |
| V | Optimistic concurrency, minimal updates | PASS | Every update sends the current `version`; conflicts surface and the user reloads (R7). Set-price save and photo save compute a diff and make **no call when nothing changed**. |
| VI | Shared key rule | PASS | Look keys are derived (`look-` + ASCII slug), match `^[a-zA-Z0-9-_]+$`, 2–256 chars (≥6, ≤45), trimmed; immutable (never written after create). Derived, not typed. |
| VII | Feedback and error handling | PASS | `graphQLErrorHandler` + MC notifications; raw GraphQL errors mapped to readable text naming the operation; loading and error states with retry on every list/detail. |
| VIII | List conventions | PASS | Paginated, sortable, empty state, row-click navigation (FR-013a, FR-015). "Frühere Looks" is a card section exempt by spec. |
| — | Data Layer Conventions | PASS with note | Connector-hook layout kept; base/detail fragment split kept; update mutations return the detail shape; no manual `refetch()` after same-entity update. **Note**: the REST→GraphQL action bridge is not used; see Complexity Tracking. |
| — | Development Workflow | PASS (amended) | Layout amended for Connect (`mc-looks-app/`). CI runs build, test, lint, typecheck. `.graphql` documents validated against `schemas/ctp.json` in a test. |
| — | commercetools overlay | PASS | Skills resolved below; tasks will carry `[SKILL: …]`; API surface verified with the Knowledge MCP (see contracts). |

**Complexity Tracking**

| Deviation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Hand-built GraphQL update actions instead of `calculate*UpdateActions` + `createGraphQlUpdateActions` | Looks only ever sends five fixed actions (`changeIsActive`, `changeValue`, `changeName`/`setDescription` on completion, and Custom Object upserts, which are not update actions). `@commercetools/sync-actions` has no Custom Object support and would add a diff layer to compare two money arrays | Routing five actions through REST-shaped sync-actions and converting back adds a dependency and a translation step for no gain. The constitution's rule exists to avoid special-casing *call sites*; here all actions are built in one module (`src/domain/look-actions.ts`) and unit-tested. |
| Component specs inject a `LookApi` instead of mocking GraphQL with `msw` | The domain flows have many failure points (three-step save, two-step reprice); an in-memory port with versions and failure injection tests them deterministically and fast | Reproducing 409s and partial failures with `msw` handlers per test is slow and obscures intent. The GraphQL layer is still covered by `msw` specs of `createLookApi` (variables, paging, error mapping), so a wrong query shape is caught. |
| Client-side paging/sorting | Summe, Ersparnis and Status derive from live prices plus discount state; no API sorts by them | Server-side paging would sort only by fields the API knows (name, key) and make the other sortable columns lie. |

## Platform Skills Resolution (commercetools)

| Area / component | Skill | Why |
|---|---|---|
| Merchant Center custom app: config, scopes, entry point, registration, install, Connect + Netlify hosting | `commercetools-connect` (MC customizations reference), `commercetools-custom-application` | `connect.yaml` for `merchant-center-custom-application`, `${env:…}` placeholders, `APPLICATION_URL` provided by Connect, registration steps, hosting check |
| GraphQL access, project settings, optimistic concurrency, query predicates, Product Search, Custom Objects | `commercetools-platform` | Foundational data-model and GraphQL/REST patterns |
| Set-price discount model: pattern target, proportionate distribution, discount stacking, `sortOrder`, price rules, order evidence of discounts | `commercetools-commerce-patterns` | Cart Discount semantics and limits (100 active, unique sortOrder), `includedDiscounts` on order lines |

Every implementation task generated from this plan MUST inherit its area's skill as a `[SKILL: <name>]` annotation. Checkout, Storefront, Intake, Integrations and Catalog-migration skills do not apply (the app writes no cart, order or payment and changes no storefront).

## Project Structure

### Documentation (this feature)

```text
specs/001-looks-app/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── operations.graphql        # validated GraphQL operations
│   ├── look-value.schema.json    # Custom Object value, container "look"
│   └── discount-shape.md         # the set-price Cart Discount draft
├── checklists/requirements.md
└── tasks.md                      # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
connect.yaml                      # deployAs: looks (merchant-center-custom-application)
netlify.toml                      # base = "mc-looks-app", SPA rewrite, noindex header
.env.example                      # root: documents Connect/Netlify variables (FR-085)
mc-looks-app/                            # the app; folder name == connect.yaml `name`
├── package.json                  # own deps; no workspaces
├── custom-application-config.mjs # entryPointUriPath, scopes, ${env:…} placeholders
├── .env                          # tracked, non-secret defaults; .env.local gitignored
├── codegen.ctp.yml  schemas/ctp.json  scripts/{login,load-env}.js
├── jest.test.config.js  jest.setup.nimbus.js  jest.resolver.js
├── src/
│   ├── config.ts                 # THE configuration module (FR-084/085), fails loudly
│   ├── constants.ts              # entryPointUriPath, PERMISSIONS, container/prefix
│   ├── domain/                   # pure logic, unit-tested, no React/Apollo
│   │   ├── keys.ts  sort-order.ts  prices.ts  names.ts  validate.ts
│   │   ├── look-value.ts  look-actions.ts  look-rows.ts  completeness.ts
│   │   ├── pieces.ts  stock.ts  past-looks.ts  sorting.ts  paging.ts
│   │   └── errors.ts
│   ├── hooks/
│   │   ├── shared/{mc-api-context,error-handling,graphql-helpers}.ts
│   │   ├── use-looks-connector/        # fetch-all, fetch, create, update, fragments/
│   │   ├── use-pieces-connector/       # search, by-ids, inventory
│   │   ├── use-orders-connector/       # recent orders for past looks
│   │   └── use-project-settings/
│   ├── components/
│   │   ├── entry-point/  looks-list/  past-looks/  new-look/
│   │   ├── look-detail/  shop-preview/  common/
│   ├── i18n/data/{core,en,de}.json  messages per component
│   ├── routes.tsx  index.tsx  test-utils/
├── docs/                          # screenshots for README (optional)
specs/  .specify/  CLAUDE.md  README.md  docs/SETUP.md
```

**Structure Decision**: `connect.yaml` at the repository root, the app in a sibling folder named after `deployAs[].name`; Connect clones the repo and runs `npm install` and `build` from inside `mc-looks-app/`, so the app is self-contained and the root is only a tooling hub (R9). Pure domain logic is separated from React/Apollo so most rules are covered by fast unit specs, and component specs mock the GraphQL layer with `msw` per the constitution.

## Phase outputs

- Phase 0: [research.md](./research.md) resolves every open choice (no `NEEDS CLARIFICATION` remains in the spec).
- Phase 1: [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md).
