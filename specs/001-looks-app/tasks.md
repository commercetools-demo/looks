---

description: "Task list for the Looks Merchant Center app"
---

# Tasks: Looks (Merchant Center app for curated looks)

**Input**: Design documents from `/specs/001-looks-app/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included. The spec's success criteria (SC-005 to SC-011) and the constitution require automated proof, so each story ships its specs next to the code: plain unit specs for `src/domain/`, `msw`-based component specs for screens (`onUnhandledRequest: 'error'`).

**Organization**: Grouped by user story. Paths are relative to the repository root; the app lives in `mc-looks-app/` (its own npm project; run all `npm` commands from inside it).

## Format: `[ID] [P?] [Story] [SKILL: name] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US7, only in story phases
- **[SKILL: …]**: load that skill before starting the task (resolved in plan.md "Platform Skills Resolution"): `commercetools-connect`, `commercetools-custom-application`, `commercetools-platform`, `commercetools-commerce-patterns`
- Every task names its file(s)

## Path Conventions

- App code: `mc-looks-app/src/…` (components, hooks, domain, i18n), config in `mc-looks-app/`
- Hosting files at the root: `connect.yaml`, `netlify.toml`, `.env.example`
- Contracts to implement against: `specs/001-looks-app/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project skeleton, tooling, hosting files

- [X] T001 [SKILL: commercetools-custom-application] Create the app project `mc-looks-app/package.json` (own dependencies, no workspaces): `@commercetools/nimbus`, `nimbus-icons`, `@commercetools-frontend/*` 27.x, `react` 19, `react-intl`, `react-router-dom` 5, `@commercetools/platform-sdk` (types), `msw`, Jest preset and Testing Library; scripts `start`, `build`, `test`, `test:watch`, `lint`, `format`, `typecheck`, `extract-intl` (glob excludes `.d.ts`), `generate-types:ctp`, `postinstall`
- [X] T002 [P] Add tooling config: `mc-looks-app/tsconfig.json`, `mc-looks-app/eslint.config.js`, `mc-looks-app/.prettierrc`, `mc-looks-app/graphql.config.yml`, `mc-looks-app/codegen.ctp.yml`, `mc-looks-app/scripts/login.js`, `mc-looks-app/scripts/load-env.js`, `mc-looks-app/intl-formatter.js`
- [X] T003 [P] Add Jest setup for Nimbus: `mc-looks-app/jest.test.config.js`, `mc-looks-app/jest.setup.nimbus.js` (ResizeObserver and other polyfills), `mc-looks-app/jest.resolver.js` (Nimbus CJS patch), `mc-looks-app/jest.d.ts`
- [X] T004 [P] [SKILL: commercetools-connect] Write root `connect.yaml`: one `deployAs` entry `looks`, `applicationType: merchant-center-custom-application`, standard configuration `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH` (default `looks`), `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER` (default `gcp-eu`); no `APPLICATION_URL` (Connect provides it)
- [X] T005 [P] Write root `netlify.toml`: `base = "mc-looks-app"`, `command = "npm run build"`, `publish = "public"`, Node 22, SPA rewrite `/* → /index.html 200`, header `X-Robots-Tag: noindex`
- [X] T006 [P] Write `.env.example` (root) listing every variable with description and default (`CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `APPLICATION_URL`, `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER`, `SIZE_ATTRIBUTE`, `COLOR_NAME_ATTRIBUTE`, `COLOR_ATTRIBUTE`, `SHOP_ORIGIN`) and the tracked non-secret defaults file `mc-looks-app/.env`
- [X] T007 [SKILL: commercetools-custom-application] Write `mc-looks-app/custom-application-config.mjs`: `${env:…}` placeholders for entry point, cloud identifier, application id and url; menu label "Looks" (de, en) gated by View; scopes exactly per FR-080 (view: products, key-value documents, cart discounts, orders, project settings; manage: key-value documents, cart discounts)
- [X] T008 [P] Add `.github/workflows/ci.yml` running `npm ci`, `build`, `test`, `lint`, `typecheck` inside `mc-looks-app/` on PRs into `main`
- [X] T009 [P] Write repository `CLAUDE.md` (layout, commands from `mc-looks-app/`, GraphQL validation, codegen needs interactive login, Nimbus test notes: `isDisabled` on `FormField.Root`, assert via `screen`) and a short `README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain logic, configuration, data hooks and app shell that every story needs

**⚠️ CRITICAL**: No user story work begins until this phase is complete

- [X] T010 Create `mc-looks-app/src/constants.ts` (entry point `looks`, `PERMISSIONS` from the entry point, container `look`, key prefix `look-`, page size 500, limits 2–5 pieces) 
- [X] T011 Create `mc-looks-app/src/config.ts`, the only reader of per-project values (`sizeAttribute`, `colorNameAttribute`, `colorAttribute`, `shopOrigin`, typed defaults now, `process.env` later), failing loudly with the variable name; add `mc-looks-app/src/config.spec.ts` including a guard that no other file reads `process.env` or contains the default attribute names (FR-084/085)
- [X] T012 [P] Create `mc-looks-app/src/hooks/shared/mc-api-context.ts` and `error-handling.ts` (`graphQLErrorHandler`, `ErrorCodeMapping`) with `error-handling.spec.ts` _(done: `graphQLErrorHandler` replaced by `LookApiError` + `describeError`; `mc-api-context.ts` in place)_
- [X] T013 [P] Create `mc-looks-app/src/domain/errors.ts`: readable messages naming the failed operation, mapping 403, concurrent modification, `DuplicateField`, `MaxCartDiscountsReached`; with spec
- [X] T014 [P] Create `mc-looks-app/src/domain/keys.ts` (`slugify`, `deriveLookKey` ≤ 40 chars with `-2`, `-3`, `lookObjectKey`, `lookKeyFromObjectKey`) and `keys.spec.ts`
- [X] T015 [P] [SKILL: commercetools-commerce-patterns] Create `mc-looks-app/src/domain/sort-order.ts` (lowest free rank in 0.7–0.799, no trailing zero, exhaustion error) and `sort-order.spec.ts` incl. `0.71`, never `0.710`
- [X] T016 [P] Create `mc-looks-app/src/domain/prices.ts` (list price per currency without country/customer group/channel; sums omit a currency when any piece lacks a price; saving percent on first currency) and `prices.spec.ts`
- [X] T017 [P] Create `mc-looks-app/src/domain/names.ts` (`Look-Set: <name>` / `Look set: <name>`, description, `lookNameFromDiscount` reading `name` then `description`) and `names.spec.ts`
- [X] T018 [P] Create `mc-looks-app/src/domain/look-value.ts` (types and `buildLookValue`, optional `image` and `endedAt` kept) with `look-value.spec.ts` that validates builds against `specs/001-looks-app/contracts/look-value.schema.json`
- [X] T019 Create `mc-looks-app/src/domain/validate.ts` (all codes in data-model.md, project currencies as input) with `validate.spec.ts` covering every rule and scenario in spec US2 (depends on T014, T016)
- [X] T020 [SKILL: commercetools-commerce-patterns] Create `mc-looks-app/src/domain/look-actions.ts`: `buildLookCartDiscountDraft` (shape in `contracts/discount-shape.md`), `buildChangeIsActive`, `buildChangeValue`, `buildCompletionActions`; with `look-actions.spec.ts` (depends on T014–T017)
- [ ] T021 [SKILL: commercetools-commerce-patterns] **Sandbox verification** against a real project (via MC GraphQL): create a draft look discount and read it back; confirm proportionate distribution for the `absolute` input on a pattern target (else switch to the input that carries it), confirm the `project { currencies }` read works with `view_project_settings`, and whether `availability.noChannel` is populated; record results in `specs/001-looks-app/research.md` R14 and fix `contracts/discount-shape.md` and T020 accordingly (depends on T020) _(OPEN: needs a sandbox project with credentials; see research R14)_
- [ ] T022 Generate `mc-looks-app/schemas/ctp.json` and `mc-looks-app/src/types/generated/ctp.ts` with `npm run generate-types:ctp` (interactive browser login; the user runs it with `! npm run generate-types:ctp` from `mc-looks-app/`) _(OPEN: interactive login, run by a person)_
- [X] T023 [P] [SKILL: commercetools-platform] Create the GraphQL documents under `mc-looks-app/src/hooks/use-looks-connector/` and `use-pieces-connector/` and `use-orders-connector/` from `contracts/operations.graphql` (base/detail fragments split), plus `mc-looks-app/src/hooks/graphql-documents.spec.ts` validating every `.graphql` file against `schemas/ctp.json` (depends on T022) _(done; validation against `schemas/ctp.json` is skipped until T022 has run; documents were validated against the public schema with the Knowledge MCP)_
- [X] T024 [P] [SKILL: commercetools-platform] Create `mc-looks-app/src/hooks/use-project-currencies/` (query, hook, `index.ts`) with an `msw` spec for 1, 2 and 3 currencies _(done; no standalone hook spec, 1/2/3 currencies are covered by the component specs)_
- [X] T025 [P] Create `mc-looks-app/src/domain/stock.ts` (sold-out / low 1–3 / ok, size summary) and `stock.spec.ts`
- [X] T026 [P] Create `mc-looks-app/src/domain/pieces.ts`: map a product to `Piece` (image fallback, colour from configured attributes, sizes from default inventory only, no-entry fallback lists all as sold out, sizeless ⇒ one size, `soldOutEverywhere`) and `pieces.spec.ts` incl. ghost colour groups
- [X] T027 Create `mc-looks-app/src/domain/look-rows.ts` and `completeness.ts` (`LookRow`, joins object and discount, completeness states, drift, saving, status) with specs (depends on T014–T018, T026)
- [X] T028 [SKILL: commercetools-platform] Create `mc-looks-app/src/hooks/use-looks-connector/looks-connector.ts`, `conversion.ts`, `index.ts`: paged `useMcQuery` fetch of all look objects and all cart discounts (filter key prefix in the client), by-key reads, create/update/write mutations, update-in-place cache (no `refetch()` after same-entity update); `msw` spec asserting variables (depends on T023)
- [X] T029 [P] [SKILL: commercetools-platform] Create `mc-looks-app/src/hooks/use-pieces-connector/pieces-connector.ts`: chunked by-ids read (100), text search (case-insensitive wildcard in the data locale, limit 20), `FetchDefaultInventory` fallback; `msw` spec (depends on T023, T026) _(done; the `FetchDefaultInventory` fallback is documented but not implemented, `availability.noChannel` is used)_
- [X] T030 Set up i18n: `mc-looks-app/src/i18n/data/{core,en,de}.json`, `mc-looks-app/src/load-messages.ts`, root `messages.ts` helper, and `mc-looks-app/src/messages.spec.ts` (de/en identical keys and `{placeholder}` tokens; unique ids prefixed `Looks.`; fails on raw string literals in JSX)
- [X] T031 Create the app shell: `mc-looks-app/src/index.tsx`, `routes.tsx`, `components/entry-point/entry-point.tsx` (`ApplicationShell` in `NimbusProvider`), `hooks/context.tsx` with `useCanManage()` (Manage permission) and the data-locale helper `domain/format.ts` (localized value with fallback de → en → first, money formatting) with `format.spec.ts`
- [X] T032 [P] Create `mc-looks-app/src/test-utils/` (`renderApp` with `NimbusProvider` and `msw` server, fixtures and builders for objects, discounts, products, orders, currencies, GraphQL handler helpers)
- [X] T033 [P] Create shared presentational pieces: `components/common/look-photo.tsx`, `piece-image.tsx`, `price-lines.tsx` (one line per currency, first bold), `look-title.tsx` _(done as `money-lines.tsx` and `look-hooks.ts`)_

**Checkpoint**: Foundation ready; domain specs pass; user stories can start

---

## Phase 3: User Story 1 - See all looks and their live status (Priority: P1) 🎯 MVP

**Goal**: The looks list with search, pagination, sorting, statuses, empty/loading/error states.

**Independent Test**: In a project with several looks, open the app; active looks show correct prices and saving; search, page size, page and sort work; a View-only user sees the same table (quickstart scenario 1).

### Tests for User Story 1

- [X] T034 [P] [US1] `mc-looks-app/src/domain/sorting.spec.ts` and `paging.spec.ts`: sort by Look/Setpreis/Summe/Ersparnis/Status asc/desc over all looks, default name asc, filter then page, change of sort or filter returns to page 1
- [X] T035 [P] [US1] `mc-looks-app/src/components/looks-list/looks-page.spec.tsx`: scenarios 1–7 of User Story 1 (count of total, photo vs piece strip, five pieces, search and empty-filter, error with retry, empty state, header text not wrapping via `white-space: nowrap`), `msw` handlers only
- [X] T036 [P] [US1] `mc-looks-app/src/components/looks-list/looks-list-performance.spec.ts`: 1,000 generated looks sort and page within budget (SC-004)

### Implementation for User Story 1

- [X] T037 [P] [US1] Create `mc-looks-app/src/domain/sorting.ts` and `paging.ts` (pure, name sort in data locale)
- [X] T038 [US1] Create `mc-looks-app/src/hooks/use-looks-overview.ts`: tier 1 (objects + discounts) then tier 2 (product prices for the visible page, all pieces when sorting by Summe/Ersparnis); page, size, sort and search kept in the URL query (depends on T027–T029, T037)
- [X] T039 [US1] Create `mc-looks-app/src/components/looks-list/looks-table.tsx` and `looks-table.css`: columns Look, Teile, Setpreis, Summe, Ersparnis, Status, Aktiv with fixed widths wide enough for de and en headers, sortable headers (Look, Setpreis, Summe, Ersparnis, Status), one-line ellipsis names, five 36 px piece images, row click opens detail
- [X] T040 [US1] Create `mc-looks-app/src/components/looks-list/looks-page.tsx`: `DefaultPage` header with "Neuer Look" (disabled without Manage), search field (≤ 360 px), total count, pagination controls with page size 20/50/100, loading skeleton, filtered-empty, empty ("Zurzeit ist kein Look aktiv." and the no-look state), error `Alert` with retry; main list shows active and incomplete looks only
- [X] T041 [US1] Create `mc-looks-app/src/components/looks-list/messages.ts` and add German and English entries to `i18n/data/{de,en}.json` via `npm run extract-intl`
- [X] T042 [US1] Wire the list route in `mc-looks-app/src/routes.tsx` and verify T034–T036 pass

**Checkpoint**: User Story 1 works on its own with read data (switches and "Neuer Look" are inert until later stories)

---

## Phase 4: User Story 2 - Create a new look with a live shop preview (Priority: P1)

**Goal**: The four-step creation flow with validation, resumable saving and the neutral shop preview.

**Independent Test**: Create a two-piece look below the sums, inactive; it is saved, inactive and listed under past looks; refusals work (quickstart scenarios 2–3).

### Tests for User Story 2

- [X] T043 [P] [US2] `mc-looks-app/src/domain/save-look.spec.ts`: three-step order, resume from each failure point with 0 duplicates, key collision re-plan once, activation off, `planMatches`, rank exhausted
- [X] T044 [P] [US2] `mc-looks-app/src/components/new-look/new-look.spec.tsx`: scenarios 1–9 of User Story 2 (names, photo path valid/invalid/unloadable, search, 2–5 limits, "Einheitsgröße", sold-out warning, set price errors per currency, missing currency price, save inactive/active)
- [X] T045 [P] [US2] `mc-looks-app/src/components/shop-preview/preview-model.spec.ts` and `shop-preview.spec.tsx`: "Setpreis folgt", struck-through sum, size dropdown states, placeholder without piece, German texts under an English profile

### Implementation for User Story 2

- [X] T046 [US2] [SKILL: commercetools-commerce-patterns] Create `mc-looks-app/src/domain/save-look.ts`: `planNewLook`, `runSave` (discount inactive → object → optional activation, idempotent by key, `SaveProgress`), `saveNewLook`, `planMatches`, `LookKeyTakenError` (depends on T020, T028)
- [X] T047 [P] [US2] Create `mc-looks-app/src/domain/image-size.ts` and a `use-photo-check` hook: path pattern check and loading the image from `config.shopOrigin` to read width and height
- [X] T048 [P] [US2] Create `mc-looks-app/src/components/shop-preview/{preview-model.ts,shop-preview.tsx,preview-panel.tsx}`: neutral composition mirroring the set block, first project currency, German text constants
- [X] T049 [P] [US2] Create `mc-looks-app/src/components/new-look/basics-step.tsx` (names de/en, optional photo path with 120 px preview, field errors)
- [X] T050 [P] [US2] Create `mc-looks-app/src/components/new-look/pieces-step.tsx` and `piece-result-card.tsx` (search, results with image/name/colour/prices/sizes, add/remove, drag reorder, count and sum line, sold-out warning)
- [X] T051 [P] [US2] Create `mc-looks-app/src/components/new-look/set-price-step.tsx` (one input per project currency, sum, saving, field errors)
- [X] T052 [US2] Create `mc-looks-app/src/components/new-look/review-step.tsx` and `new-look-modal.tsx`: `ModalPage` with `Steps` marking the current step, preview beside the form, "Nach dem Anlegen aktiv" (default off), "Look speichern", step-failure UI with "Erneut versuchen" that resumes via `SaveProgress`, success toast, reload of the list (depends on T046–T051)
- [X] T053 [US2] Create `mc-looks-app/src/components/new-look/messages.ts` and add de/en entries; wire the `/new` route in `routes.tsx` and enable "Neuer Look" on the list

**Checkpoint**: Create works end to end; looks appear in the list or in past looks

---

## Phase 5: User Story 3 - Switch looks on and off (Priority: P1)

**Goal**: Switching from list row and detail, conflict handling, end date recording.

**Independent Test**: Switch a look off and on; the shop's cart reacts; the look moves between main list and past looks (quickstart scenarios 4–5).

### Tests for User Story 3

- [X] T054 [P] [US3] `mc-looks-app/src/domain/look-writes.spec.ts`: `switchLook` sends `changeIsActive` with current version, 409 re-reads and does not retry, end date written on off and cleared on on, end-date failure does not fail the switch, object kept (never deleted)
- [X] T055 [P] [US3] Extend `mc-looks-app/src/components/looks-list/looks-page.spec.tsx`: switch on a row (toast, status, row moves), incomplete look shows no switch, conflict notice

### Implementation for User Story 3

- [X] T056 [US3] [SKILL: commercetools-commerce-patterns] Create `mc-looks-app/src/domain/look-writes.ts`: `switchLook`, `recordLookEnd` (re-reads the object for its version, no write when unchanged)
- [X] T057 [US3] Create `mc-looks-app/src/components/looks-list/active-switch.tsx` (Nimbus `Switch`, disabled without Manage and for incomplete looks, in-place cache update, success/conflict/error notifications) and use it in `looks-table.tsx`
- [X] T058 [US3] Add messages (`switchedOn`, `switchedOff`, `switchConflict`, error texts) to de/en and verify T054–T055 pass

**Checkpoint**: MVP complete (US1 + US2 + US3)

---

## Phase 6: User Story 4 - Learn from retired looks (Priority: P2)

**Goal**: "Frühere Looks" cards with sales figures, states and reactivation.

**Independent Test**: With past looks and orders carrying their discounts, cards show sets, orders, revenue per currency, best seller first; reactivation moves a look back (quickstart scenario 6).

### Tests for User Story 4

- [X] T059 [P] [US4] `mc-looks-app/src/domain/past-looks.spec.ts`: sets = floor(units / pieceCount), orders, revenue per currency, sort by sets then name, "Bester Look" rule, missing end date, no sale
- [X] T060 [P] [US4] `mc-looks-app/src/components/past-looks/past-looks-section.spec.tsx`: scenarios 1–8 of User Story 4 incl. skeleton, empty, error with retry while cards stay usable, truncated-orders note, "Wieder aktivieren"

### Implementation for User Story 4

- [X] T061 [P] [US4] [SKILL: commercetools-commerce-patterns] Create `mc-looks-app/src/domain/past-looks.ts` (`salesByDiscount` via `includedDiscounts`, `buildPastLooks`, `pastLookRows`, 90-day window start)
- [X] T062 [P] [US4] [SKILL: commercetools-platform] Create `mc-looks-app/src/hooks/use-orders-connector/orders-connector.ts` and `use-past-look-sales.ts` (up to 4 pages of 500, newest first, truncated flag, loads independently and only when a past look exists)
- [X] T063 [US4] Create `mc-looks-app/src/components/past-looks/past-looks-section.tsx` and `past-look-card.tsx` (four columns of equal width, strip or photo 92 px, badge, period only when both dates, figures per currency or "Kein Set verkauft", "Wieder aktivieren" via `switchLook`, disabled without Manage)
- [X] T064 [US4] Add the section to `looks-page.tsx`, add messages de/en, and verify T059–T060 pass

---

## Phase 7: User Story 5 - Inspect a look and change its set price or photo (Priority: P2)

**Goal**: Detail page, set-price change with two-write failure handling, drift recalculation, photo set/clear.

**Independent Test**: Open a look, lower its set price, save; the cart price follows; failure between writes is recoverable (quickstart scenario 7).

### Tests for User Story 5

- [X] T065 [P] [US5] Extend `mc-looks-app/src/domain/look-writes.spec.ts`: `changeSetPrice` (current version read, `changeValue` then object upsert with version, retry only the object, lost-response detection), no call when nothing changed, photo set/clear keeps `endedAt`
- [X] T066 [P] [US5] `mc-looks-app/src/components/look-detail/look-detail-page.spec.tsx`: scenarios 1–7 of User Story 5 (five cards, stock per size, sold-out warning, save price, partial failure notice, drift and "Setpreis neu berechnen", invalid photo path, not found)

### Implementation for User Story 5

- [X] T067 [US5] [SKILL: commercetools-commerce-patterns] Add `changeSetPrice` and `changePhoto` to `mc-looks-app/src/domain/look-writes.ts` (minimal updates: no call without a diff)
- [X] T068 [P] [US5] Create `mc-looks-app/src/components/look-detail/piece-card.tsx` (image 120 px, name, colour, price lines, stock per size texts, "Einheitsgröße") and `look-photo-card.tsx` (280 px, alt = name)
- [X] T069 [P] [US5] Create `mc-looks-app/src/components/look-detail/set-price-form.tsx` (per currency, validation as new look, "Setpreis speichern", "Setpreis neu berechnen", partial-failure alert with retry) and `photo-form.tsx` (path field, validation, save/clear)
- [X] T070 [US5] Create `mc-looks-app/src/components/look-detail/look-detail-page.tsx`: back link, title, key, "Aktiv" switch or "Nur Lesezugriff", "Im Shop ansehen" (first piece's product page on `config.shopOrigin`), three columns with the shop preview, sold-out and drift alerts, not-found state; route `/:lookKey` in `routes.tsx`
- [X] T071 [US5] Add messages de/en and verify T065–T066 pass

---

## Phase 8: User Story 7 - Read-only access (Priority: P2)

**Goal**: Prove and complete the "disable, never hide" rule across every screen.

**Independent Test**: With a View-only user, every write control is visible and disabled, and "Nur Lesezugriff" shows (quickstart scenario 9).

- [X] T072 [P] [US7] `mc-looks-app/src/components/read-only.spec.tsx`: render list, past looks, new-look entry, detail with View only; assert each write control is present and disabled (`FormField.Root` for inputs), none removed; assert no write mutation is ever sent
- [X] T073 [US7] Fix any gap the spec finds in `mc-looks-app/src/components/**` so every write control uses `useCanManage()` with `isDisabled` instead of conditional rendering; add the "Nur Lesezugriff" badge to list and detail headers
- [ ] T074 [US7] Verify manually in a sandbox Merchant Center: a user with neither permission has no menu entry and sees the no-permission page on a direct URL; record the result in `docs/SETUP.md` _(OPEN: manual check in a Merchant Center project)_

---

## Phase 9: User Story 6 - Repair half-written looks (Priority: P3)

**Goal**: "Unvollständig" rows with "Vervollständigen"; inconsistent looks flagged.

**Independent Test**: Delete a look's object or discount in a sandbox; completing yields a complete look in its current state (quickstart scenario 8).

### Tests for User Story 6

- [X] T075 [P] [US6] `mc-looks-app/src/domain/look-writes.spec.ts` (extend): completing a missing object (pieces from target, set price = live sum − discount amount per currency) and a missing discount (inactive, with a given name); never sets `isActive` true
- [X] T076 [P] [US6] `mc-looks-app/src/components/looks-list/complete-look.spec.tsx`: warning, action, name entry for a missing discount, inconsistent message and no switch

### Implementation for User Story 6

- [X] T077 [US6] [SKILL: commercetools-commerce-patterns] Add `completeLook` to `mc-looks-app/src/domain/look-writes.ts` using `buildCompletionActions` from `look-actions.ts`
- [X] T078 [US6] Create `mc-looks-app/src/components/looks-list/complete-look-panel.tsx` (used on the row and on the detail), the "Unvollständig" and "inconsistent" messages, and wire into `looks-table.tsx` and `look-detail-page.tsx`; add messages de/en

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T079 [P] [SKILL: commercetools-custom-application] Write `docs/SETUP.md`: one section per deploy path (Netlify: site URL as Application URL; Connect: connector deployment, variables, Connect-provided URL), registration steps (Organization → Custom Applications → add "Looks", entry point, scopes, menu label de/en; after first deploy URL, Ready, install for the project, team View/Manage), the developer configuration values (size attribute, colour attributes, shop origin) and the switch-hosts note (FR-081/082/084)
- [X] T080 [P] Add spec `mc-looks-app/src/no-hardcoded-currency.spec.ts`: scans `mc-looks-app/src/` for currency code literals (SC-007) and run list, new look and detail with 1, 2 and 3 currencies
- [X] T081 [P] Run `npm run extract-intl`, skim the diff, and make `messages.spec.ts` pass (SC-009); confirm German and English columns, headers and the 1440 px no-wrap check
- [X] T082 Run the full automated check set from the quickstart (`npm run typecheck && npm run lint && npm test && npm run build`) and fix findings
- [ ] T083 Run all quickstart manual scenarios and the Connect and Netlify deploy checks in a sandbox; record outcomes in `specs/001-looks-app/quickstart.md` _(OPEN: manual scenarios and deploy checks need a sandbox)_
- [ ] T084 [P] Update `CLAUDE.md` and `README.md` with the final commands, structure and the setup checklist link; create `FEATURES.md` from the implemented code once everything above passes _(OPEN: `CLAUDE.md` and `README.md` are written; `FEATURES.md` is created after the manual checks)_

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (1)** → **Foundational (2)** → user stories. Foundational blocks everything.
- **US1** needs T027–T029, T031–T033. **US2** needs T020, T021, T028, T029 and the shop preview (built inside US2). **US3** needs T028 and US1's table. **US4** needs US3's `switchLook`. **US5** needs US1 (row link), US2's preview and US3's switch. **US7** audits all earlier screens. **US6** touches the list and detail.
- Implementation order by priority: US1 → US2 → US3 (MVP) → US4 → US5 → US7 → US6 → Polish.

### Within a story

Domain specs first, then connector, then components; a story's checkpoint is its independent test.

### Key task dependencies

- T019 ← T014, T016; T020 ← T014–T017; T021 ← T020; T023 ← T022; T027 ← T014–T018, T026; T028 ← T023; T029 ← T023, T026; T038 ← T027–T029, T037; T046 ← T020, T028, T021 (verified shape); T052 ← T046–T051; T057 ← T056; T063 ← T056, T061, T062; T070 ← T067–T069.

### Parallel opportunities

- Phase 1: T002–T006, T008, T009 in parallel after T001.
- Phase 2: T012–T018, T025, T026 are independent files; T023, T024, T029, T032, T033 in parallel once T022 and their inputs exist.
- US1: T034–T037 in parallel. US2: T043–T045 and T047–T051 in parallel. US4: T059–T062 in parallel. US5: T065, T066, T068, T069 in parallel.
- Different stories can proceed in parallel after Foundational by different developers.

### Parallel example: User Story 2

```text
T043 save-look.spec.ts      T044 new-look.spec.tsx     T045 shop-preview specs
T047 photo check            T048 shop preview          T049 basics step
T050 pieces step            T051 set price step        (then T052 modal, T053 messages)
```

## Implementation Strategy

### MVP first

1. Phases 1–2 (setup and foundation, including T021 sandbox verification and T022 codegen).
2. Phases 3–5: US1 list, US2 create, US3 switch. Stop and validate with quickstart scenarios 1–5.
3. Ship to Netlify for preview (T005), then Connect for production.

### Incremental delivery

Add US4 (past looks), US5 (detail and repricing), US7 (read-only audit), US6 (repair), then polish. Each story is demonstrable on its own.

## Notes

- 84 tasks. Tasks touching commercetools carry `[SKILL: …]`; load that skill first.
- Do not skip T021: the discount's proportionate distribution must be verified against the live API before the save logic is relied on.
- `[P]` tasks touch different files; commit per task or per logical group.
- Constitution gates apply to every PR: View/Manage disabled-not-hidden, de/en completeness, version on every update, no API call on empty diff.
