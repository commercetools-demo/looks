# Feature Specification: Looks (Merchant Center app for curated looks)

**Feature Branch**: `001-looks-app` (spec directory only; no git branch created)

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Create a specification for Looks, based on the current-state captures of an earlier internal prototype, its design round 2 (boards 1a–3b and its handoff notes) and its implementation (look builder, shared look module, OpenSpec, and the storefront readers of looks)." Follow-up decisions (2026-10-27): follow the project's currencies; no brands for now; no `sim` naming, plain `look-`; seeding is not required.

**Sources and precedence**: Where sources disagree, the order is: the prototype's running code > design round 2 (boards 1a–3b) > the prototype's older OpenSpec text > the 2026-10-01 captures. The decisions above override all of them. Everything about brands in the sources (brand badge, brand filter, brand-pure looks, brand assortments, brand-themed shop preview, brand-prefixed keys) is intentionally dropped.

## Overview

A **look** is a curated outfit: at least 2 products (no upper limit) sold as a set at a set price below the sum of the single prices. The shop shows the look on each piece's product page ("Shop the look"), and in the cart, where the set price applies automatically once every piece is in the cart.

Today the platform's standard Merchant Center covers only half of this: the set-price discount can be maintained in the Discounts application, but the look itself (which pieces) has no business screen. Merchandisers need a ticket and a developer to create or retire a look.

**Looks** closes that gap: a Merchant Center custom application, in the main menu, in which merchandisers list, create, switch on and off, and reprice looks, see how retired looks sold, without a ticket and without a deployment.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See all looks and their live status (Priority: P1)

A merchandiser opens "Looks" in the Merchant Center main menu and sees every active look in one table: name, the piece images, set price per project currency, the sum of the single prices, the saving in percent, and whether the look is live in the shop. They can search by name.

**Why this priority**: Without this view nothing else is discoverable. It is also the smallest slice that delivers value on its own: it replaces "ask a developer what looks exist".

**Independent Test**: In a project with several looks, open the app. All active looks appear with correct prices and saving; search narrows the list; a read-only user sees the same table.

**Acceptance Scenarios**:

1. **Given** a project with eight active looks, **When** the user opens the app, **Then** the table lists all eight, each with set price per project currency, live sum, saving in percent and status "Aktiv"/"Active", and the header reads "8 Looks".
2. **Given** a look, **When** the list renders, **Then** the Look column shows the name and the key only, without an image; the piece images are in the Teile column. (The look photo and the image box were removed.)
3. **Given** a look has up to five pieces, **When** the list renders, **Then** all piece images are visible without being cut; a look with more pieces shows the first five and "+N".
4. **Given** the user types part of a name, **When** the filter applies, **Then** only matching looks remain and the count updates; if none match, an empty-filter message is shown.
4a. **Given** more looks than fit on one page, **When** the list renders, **Then** it shows one page with page controls and a page-size choice, and the count states the total ("8 Looks" total, not the page size).
4b. **Given** a sortable column header (Look, Setpreis, Summe, Ersparnis, Status), **When** the user activates it, **Then** the list is sorted by that column, ascending then descending, the sort state is announced and visible, and the default order is by name ascending.
5. **Given** the window is 1440 px wide, **When** the table renders, **Then** it spans the full content width, only the Look column grows, and no column header wraps in German or English.
6. **Given** the data cannot be loaded, **When** the list fails, **Then** an error with a retry action is shown and no partial list is presented as complete.
7. **Given** the project has no look at all, **When** the app opens, **Then** an explanatory empty state is shown, with "Neuer Look" for users who may create.

---

### User Story 2 - Create a new look step by step (Priority: P1)

A merchandiser clicks "Neuer Look" and is guided through four steps: **Basics** (the name and an optional description in the project languages), **Pieces** (search products, choose at least 2, no maximum, reorder), **Set price** (one price or percentage per price cell, that is per currency and country, shown against the sum), and **Review** (summary, "Nach dem Anlegen aktiv" switch, "Look speichern").

**Why this priority**: Creating looks is the core job of the app and the reason it exists.

**Independent Test**: Create a two-piece look with set prices below the sums, leave "active after saving" off, and confirm it is saved, inactive, and appears under "Frühere Looks".

**Acceptance Scenarios**:

1. **Given** step 1, **When** the user enters a name in at least one project language and presses "Weiter", **Then** step 2 opens; if no name is entered, a field error names the problem and nothing is written.
2. ~~Look photo in step 1~~ (removed: the photo is not used).
3. **Given** step 2, **When** the user searches, **Then** products are found with image, name, price and sizes with availability; selecting a product adds it to the look; the step states the count ("4 Teile gewählt").
4. **Given** fewer than 2 pieces (there is no upper limit), **When** the user proceeds or saves, **Then** a field error states the minimum and the current count; nothing is written.
5. **Given** a piece without sizes (e.g. an accessory), **Then** it reads "Einheitsgröße" instead of a size list.
6. **Given** a piece is sold out in every size, **When** it is added, **Then** a warning explains that the set cannot be bought at the set price while this lasts, but saving is not blocked.
7. **Given** a set price in a price cell (currency and country) that is zero, or equal to or above the live sum of the pieces, or a percentage outside 0 to 100 (exclusive), **When** the user proceeds, **Then** a field error names that cell.
8. **Given** a selected piece has no list price in a currency and country, **Then** the set-price table has no row for that cell (no discount there); if no cell is left, saving is refused (`set-price-none`).
8a. **Given** the set-price step, **When** the user enters a percentage in "Prozent für alle Zeilen" or a row's percent, **Then** those rows get a relative discount, price edits give an absolute one, and a country mixing both kinds (or two percentages) is refused (`discount-mode-mixed`).
9. **Given** the review step with "Nach dem Anlegen aktiv" off (the default), **When** the user saves, **Then** the look is stored inactive and listed as "Inaktiv"; with it on, the look is live right after saving.
10. **Given** step 1, **When** the user has entered a name, **Then** the field "Key" shows the suggested key (derived from the name, free of existing keys, e.g. `winter-2` when `winter` exists) and how it will be saved (`look-<key>`), and follows the name until the user edits it; **When** the user types their own key, **Then** it is kept as typed, shown on the review and saved as given; "Vorschlag übernehmen" takes the suggestion back.
11. **Given** a key with characters other than letters, digits, hyphens and underscores, or a key that is already taken, **When** the user presses "Weiter" (a taken key is flagged while typing), **Then** a field error names the problem and nothing is written; a key chosen by the user is never renamed silently, also not when someone else takes it while saving (the flow returns to the key field).

---

### User Story 3 - Switch looks on and off, and bring retired looks back (Priority: P1)

A merchandiser (or lead) switches a look on or off from the list row or the detail page. A look that is switched off is not offered in the shop and no cart receives its set price. It is not deleted: it moves to the "Frühere Looks" section, from where it can be reactivated.

**Why this priority**: Controlling what is live is the day-to-day operation and the "review before going live" mechanism (a look is created inactive, someone checks it, someone switches it on).

**Independent Test**: Switch an active look off; confirm the shop's next cart recalculation no longer applies the set price and the look appears in "Frühere Looks" with an end date; reactivate it and confirm it returns to the main list.

**Acceptance Scenarios**:

1. **Given** an active, complete look and Manage permission, **When** the user switches it off, **Then** the look's Discount Group and discounts become inactive, a toast confirms it, the end date (now) is recorded, and the look moves to "Frühere Looks".
2. **Given** the look was changed by someone else in the meantime, **When** the switch is pressed on stale data, **Then** the app re-reads the current state, shows it, tells the user, and does not retry blindly.
3. **Given** a look is incomplete (see User Story 6), **Then** no switch is offered; only "Vervollständigen".
4. **Given** the end-date write fails after a successful switch, **Then** the switch still stands and the look simply shows no end date.
5. **Given** a past look, **When** the user presses "Wieder aktivieren", **Then** the look is live again, its end date is cleared, and it leaves the section and appears in the main list.

---

### User Story 4 - Learn from retired looks ("Frühere Looks") (Priority: P2)

Below the list, the section "Frühere Looks" ("Ausgeschaltete Looks und wie sie verkauft haben") shows one card per switched-off look, best seller first: piece strip, name, the period it was active, and how it sold (sets sold, orders, revenue), or "Kein Set verkauft". The best seller carries a "Bester Look" badge. It serves as an idea source ("that was a good look, that one not").

**Why this priority**: High value for merchandising decisions, but the app is usable without it.

**Independent Test**: With three switched-off looks, two of which have orders carrying their set discount, the cards show correct sets/orders/revenue, are ordered by sets sold, and the best one has the badge.

**Acceptance Scenarios**:

1. **Given** two past looks that sold 5 and 2 sets, **Then** the 5-set look is first and carries "Bester Look"; the other does not.
2. **Given** a past look with no order in the window, **Then** its card reads "Kein Set verkauft"; and if no past look sold anything, no card has the badge.
3. **Given** a look switched off on 6 Oct and renamed on 8 Oct, **Then** the card reads "aktiv 30.09.2026 bis 06.10.2026", using the recorded switch-off date, not the last-modified date.
4. **Given** a past look without a recorded end date, **Then** no "aktiv … bis …" line is shown; everything else is unchanged.
5. **Given** two orders carrying the look's set discount on 3 and 6 units of a 3-piece look, **Then** the card shows 2 orders and 3 sets, with revenue summed per currency (a currency line only when the look sold in it).
6. **Given** the sales data is loading, **Then** four skeleton cards appear and the main list stays usable; **Given** there is no past look, **Then** "Noch keine früheren Looks" is shown with an explanatory line; **Given** the sales data cannot be read, **Then** an error with "Erneut versuchen" appears, while the cards and "Wieder aktivieren" still work.
7. **Given** the sales read reaches its size bound, **Then** the section says the figures come from the most recent orders only, rather than claiming completeness.
8. **Given** four cards per row at 1440 px, **Then** all columns shrink together (equal widths).

---

### User Story 5 - Inspect a look and change its set price (Priority: P2)

Opening a look shows its detail: back link "Zurück zu Looks", title and key, the "Aktiv" switch (or "Nur Lesezugriff" for view-only users), the pieces as the same product tiles as in the new-look flow, without the add action (image, name, size chips, "nur noch N" and "ausverkauft" hints), and the set price with the saving. With Manage permission the user can enter new set prices or percentages (one per price cell) and delete the look (trash icon button in the header).

**Why this priority**: Repricing and fixing a look after launch is a frequent follow-up task; creation (P1) comes first.

**Independent Test**: Open a look, lower its set price below the sum, save, and verify that a cart containing one unit of each piece lands on the new price and the detail shows the new price and saving.

**Acceptance Scenarios**:

1. **Given** a five-piece look, **Then** all five pieces are shown as product tiles (the same as in the new-look flow, without the add action and without "Im Look").
2. **Given** a piece has one size left, **Then** its tile shows "<size>: nur noch N" and "ausverkauft: <sizes>" for the others, as on the creation tile (plain stock counts are no longer shown); no warning, because the set is still buyable. **Given** a piece's product is not loaded, **Then** a tile named by its product id is shown. **Given** a piece is sold out in every size, **Then** a warning is shown.
3. **Given** a valid new set price, **When** the user saves, **Then** the platform's discount values are recomputed from today's single prices first (an amount for an absolute country, the permyriad for a percentage country), then the look definition is updated, and the detail confirms "Setpreis gespeichert".
4. **Given** the discount was updated but the look definition write failed, **Then** the detail says "Setpreis im Shop noch nicht aktualisiert" with a retry, and the list marks the look "Setpreis weicht ab" until the retry succeeds.
5. **Given** a piece's price changed after authoring so the set no longer lands on the stored set price, **Then** list and detail show "Setpreis weicht ab", and "Setpreis neu berechnen" re-computes the discount amount from today's prices.
6. ~~Photo path on the detail~~ (removed: the photo is not used).
7. **Given** a look key that matches neither a look definition nor a discount, **When** the user opens its URL, **Then** a "Look nicht gefunden" page is shown.

---

### User Story 6 - Repair half-written looks (Priority: P3)

If a create was interrupted, a look may exist as only a definition or only a discount. The list shows it with a warning "Unvollständig" and a "Vervollständigen" action, instead of hiding it. A look whose definition and discount name different pieces is flagged as inconsistent and cannot be switched here.

**Why this priority**: Rare, but without it an interrupted save leaves invisible debris.

**Independent Test**: Create a discount without its definition (and the reverse); both appear as "Unvollständig"; completing each produces a complete look in its current state.

**Acceptance Scenarios**:

1. **Given** a definition without a discount, **When** the user completes it with a name, **Then** an inactive discount is created from the definition; it is never switched on by completing.
2. **Given** a discount without a definition, **When** the user completes it, **Then** the definition is rebuilt from the discount (pieces from the discount's target, set price from live sum minus discount amount); the look keeps the discount's current active state.
3. **Given** the definition and discount name different pieces, **Then** a message says to check it in the Merchant Center and offers no switch.

---

### User Story 7 - Read-only access (Priority: P2)

A user with View permission only sees the same list, section and details, but all create, edit and switch actions are present as disabled controls, never hidden, with a "Nur Lesezugriff" indication.

**Why this priority**: Required by the platform's permission model and by the project constitution; protects live pricing from unintended edits.

**Independent Test**: Sign in with a View-only team; open the list and a five-piece look; no action is enabled.

**Acceptance Scenarios**:

1. **Given** View only, **Then** "Neuer Look", the "Aktiv" switches, "Wieder aktivieren", the set-price inputs are disabled (not hidden), and "Nur Lesezugriff" is shown.
2. **Given** a user with neither permission, **Then** the menu entry is absent and a direct URL shows the Merchant Center's no-permission page.

---

### Edge Cases

- **Name collision**: two users save a look with the same name at the same moment. When the key was only suggested, the loser re-derives the next free key (suffix `-2`, `-3`, …) and retries once before showing an error; when the user chose the key, it is not changed and the user is asked to pick another.
- **Partial save failure** (network, conflict, permission) after the Discount Group and some discounts exist but before the definition: group and discounts stay inactive (harmless in every cart); the user sees what failed with "Erneut versuchen"; the look is "Unvollständig" until a retry completes. A retry continues where it stopped and never creates duplicates.
- **Activation fails** after the writes succeeded (the group goes on first, the main discount last): the look exists and shows as inactive; it can be switched on from the list.
- **Edited form during a failed save**: a retry only resumes the earlier plan if the entered data still matches it; otherwise it re-plans.
- **Ordering range exhausted**: when the reserved rank range (0.7–0.7999 in steps of 0.0001, 1,000 values, never ending in a zero; the rank is the Discount Group's) is full, saving is refused with a clear message.
- **Platform limit**: every active country discount of a look counts toward the platform's limit of 100 active, store-independent, code-less Cart Discounts per project (a look with set prices in three countries uses three).
- **Price cells change**: a look created before a price cell (currency and country) became available for all its pieces has no set price in it; the cell simply stays empty (an empty row gets no discount) and no warning is shown; the set price can be entered at any time.
- **Piece list price changes** after authoring (see Story 5, drift).
- **Missing price in a cell** on a piece: the cell gets no row and no discount (the look does not apply there); saving is refused only when no cell is left.
- **Duplicate piece** chosen twice: field error naming it.
- **Imageless "ghost" colour groups** from catalog imports: a variant without a default inventory entry is not listed as a size, so sizes never appear twice; the piece image is the master variant's, else the first variant's that has one.
- **Content language**: names are always rendered in the Merchant Center's data locale (fallback de → en → first available), independent of the user's profile language.
- **No end date known** for a past look: no period is shown rather than a wrong one.
- **Orders cannot be read** (e.g. missing scope): only the figures are missing; the rest of the screen works.
- **A missing OAuth scope** (403): the error names the denied operation; the fix is a registration change, never a broader scope set.

## Requirements *(mandatory)*

### Functional Requirements

#### Application shell and access

- **FR-001**: The app MUST be a Merchant Center custom application reachable from the main menu under the label "Looks" (German and English), opening at `/<project>/<entry-point>` inside the Merchant Center frame (menu and top bar remain). The entry point is `looks`.
- **FR-002**: The UI MUST be built from the Nimbus design system in its default theme. Where Nimbus has no ready component, screens MUST be composed from Nimbus layout primitives and marked as custom compositions. The app has no brand styling anywhere.
- **FR-003**: The app MUST use the Merchant Center permission model: View is required to render at all; Manage is required for every write. Without Manage, write controls MUST be disabled and MUST NOT be hidden. Permissions MUST be derived from the signed-in user's Merchant Center permissions, never from a list of user names.
- **FR-004**: Every piece of the app's own UI text (labels, headings, buttons, notifications, accessibility labels, placeholders) MUST exist in German and English, chosen by the Merchant Center user's language, German as the reference. Message ids MUST be unique across the app.
- **FR-005**: Content values (look names, product names) MUST be read in the Merchant Center's data locale, falling back to `de`, then `en`, then the first available language.
- **FR-006**: Every success and error MUST surface through the Merchant Center notification channel; errors MUST be human-readable and name the failed operation; lists and details MUST show a loading indicator and an error state with retry.

#### Currencies

- **FR-007**: The currencies of a look are the **project's currencies**, read from the project settings at runtime. Sales revenue and the amounts in the list are shown per project currency; set prices, sums, discount values and savings are handled per price cell (currency and country, see FR-008). No currency code MAY be hard-coded. Price columns of the list show one line per currency (for a currency with several country cells the first country's), the first (the project's default currency, then the order of the project settings) in bold.
- **FR-008**: A piece's list price is taken per currency and country (price cell) from its master variant, else from another variant that has the cell, never from a price restricted to a customer group or channel, and only while it is valid. The set-price step shows a table with one row per cell in which every piece has a price (ordered by currency): the pieces' prices, their sum, the set price (money field, starting at the sum) and the saving in percent (number field); editing one updates the other. A row with an empty set price gets no Cart Discount; one Cart Discount is written per country with set prices (condition on the cart country), all in the look's Discount Group.

#### Looks list

- **FR-010**: The list MUST show one row per look (a look definition joined with its same-key set-price discount) with the columns, in order: **Look** (name and key, no image; takes remaining width, minimum 200 px), **Teile** (all piece images, 36 px wide 4:5, 4 px apart, up to five), **Setpreis** (one line per currency), **Summe** (live sum per currency), **Ersparnis** (percent, of the sum in the first currency), **Status**, and **Aktiv** (switch; Manage only).
- **FR-011**: The table MUST span the full content width; only the Look column grows. No column header MAY wrap in German or English; each fixed column MUST be at least as wide as its header in both languages. The look name MUST be cut with an ellipsis on one line.
- **FR-012**: Status MUST be read from the discount's active flag (the discount decides what the shopper pays), shown as "Aktiv"/"Inaktiv" plus the warnings "Unvollständig" and "Setpreis weicht ab".
- **FR-013**: The page MUST offer search by look name (field at most 360 px wide) and a count of all matching looks ("8 Looks") on the right. "Neuer Look" MUST sit at the right of the page heading (Manage only).
- **FR-013a**: The list MUST be paginated (page-size choice of 20, 50, 100; default 20; the page and size are kept while the user filters, sorts, switches a look, or returns from a detail) and sortable by Look (name in the data locale), Setpreis, Summe, Ersparnis and Status. Sorting and filtering apply to all looks, not only the visible page. Columns whose values are not comparable (Teile, Aktiv) are not sortable. The default sort is name ascending; a changed sort or filter returns to page 1. "Frühere Looks" is exempt from pagination and sorting: it is ordered by sets sold (FR-021), and shows all past looks.
- **FR-014**: The main list MUST contain active looks and incomplete looks (whatever their state); complete looks that are switched off MUST appear only under "Frühere Looks". With no active look the list MUST say "Zurzeit ist kein Look aktiv."
- **FR-015**: The list MUST show loading (skeleton rows), empty, filtered-empty, and error-with-retry states. Row click MUST open the look's detail.
- **FR-016**: ~~The Look column shows the first two piece images in a 64 × 96 px box~~ (removed: the Look column shows name and key only; the piece images are in the Teile column).

#### Frühere Looks

- **FR-020**: The section MUST list every complete, inactive look, one card each, four per row at 1440 px with equal columns. A card shows: piece strip (92 px high), "Bester Look" badge (first card only, and only if at least one set sold), name, "aktiv <from> bis <until>" (only when both dates are known), then either the figures "Verkaufte Sets", "Bestellungen", "Umsatz" (one line per currency in which the look sold) or "Kein Set verkauft", and "Wieder aktivieren" (Manage only).
- **FR-021**: Cards MUST be sorted by sets sold (descending), then by name. A card opens the look's detail.
- **FR-022**: Sales MUST be derived from orders, read-only. A line sold as part of a set carries a portion of the look's discount; therefore: sets sold = units carrying the discount ÷ piece count, rounded down; orders = orders with at least one such unit; revenue = quantity × discounted unit price, summed per currency.
- **FR-023**: The order read MUST be bounded: orders from the last 90 days, newest first, at most 4 pages of 500. When the last page is full, the section MUST state that figures come from the most recent 2000 orders instead of claiming completeness. The section MUST load independently so a failing read never hides the list.
- **FR-024**: "Aktiv from" MUST be the discount's creation date. "Aktiv until" MUST be the date the look was switched off, recorded on the look definition when switched off and cleared when switched on again; it MUST NOT be the discount's last-modified date. A new set price MUST keep the recorded end date.
- **FR-025**: The section MUST have loading (four skeleton cards), empty ("Noch keine früheren Looks" + "Ausgeschaltete Looks erscheinen hier mit ihren Verkäufen."), and error states ("Die Verkaufszahlen konnten nicht geladen werden." with "Erneut versuchen"; the cards and reactivation keep working).

#### Creating a look

- **FR-030**: "Neuer Look" MUST open a four-step flow (Grunddaten, Teile, Setpreis, Prüfen) with a step indicator that marks the current step. The current step MUST be part of the URL (`/new`, `/new/pieces`, `/new/price`, `/new/review`) so the browser's back and forward buttons move between steps and the list query is kept; a step address opened without entered data (reload, pasted link) shows step 1.
- **FR-031**: Step 1 MUST collect the name with one input per project language (the Nimbus localized text field: the data locale first, the other languages behind its toggle; at least one language is required, empty translations are omitted when saving). It MUST also collect an optional description with one multi-line input per project language (same localized field). The Discount Group of the look takes the name as its name and the description as its description.
- **FR-032**: Step 2 MUST search products by name, description, slug, search keywords, key, product id and variant SKU (case-insensitive, contains; meta title and meta description are not searchable in the product search) and show per product: image, name, and sizes with availability from the default inventory. Sizes are the variants having a default inventory entry, labelled by their variant attributes (FR-084); several variants without any such attribute are listed by SKU, and only a product with a single such variant is one size. Pieces MUST be reorderable (drag). A look MUST have at least 2 pieces, no upper limit, no duplicates. The step shows no prices and no sum; prices appear from the set price step on. The same tile (state `add`) is used for the results; the detail page uses it without the add action.
- **FR-033**: Step 3 MUST collect one set price per price cell (currency and country) and show the sum of the pieces, the saving in percent and, per row, which discount type will be created (column "Rabatt": "Prozent" or "Betrag"). Price and percent fields stay linked.
- **FR-033a**: Step 3 MUST offer a global percentage ("Prozent für alle Zeilen", 0 to 99.9, one decimal) above the table: committing a value sets every row to that percentage. A row is a percentage row when the user last edited its percent or applied the global percentage, otherwise an amount row; editing a row's price switches only that row to amount, editing its percent only that row to percentage. A percentage row creates a RELATIVE Cart Discount (`relativeCart`, permyriad = percent × 100, `IndividualApplication`), an amount row an ABSOLUTE one. A country has one discount, so all its cells MUST be amounts or all the same percentage (otherwise saving is refused). The Custom Object stores `savingPercent` for percentage cells; their stored `setPrice` is informational and the shown price follows today's sum. Repricing in the detail view works the same and may switch a discount between the two types.
- **FR-034**: Step 4 MUST show a summary and the switch "Nach dem Anlegen aktiv" (default off).
- **FR-035**: Saving MUST be refused unless: at least one name is present; there are at least 2 distinct pieces (no upper limit); at least one price cell has a live sum (every piece has a list price there, FR-008) and a set price; in each cell with a set price the price is a positive integer amount strictly below the live sum, a percentage lies strictly between 0 and 100 with at most one decimal, and the sum the user saw still equals the live sum at save time; a country does not mix amounts and percentages (codes: `name-missing`, `key-invalid`, `pieces-count`, `piece-duplicate`, `set-price-none`, `set-price-not-positive`, `set-price-not-below-sum`, `sum-not-live`, `saving-percent-invalid`, `discount-mode-mixed`).
- **FR-036**: The look key MUST be shown and editable while the look is created: step 1 has a field "Key" that suggests the slug of the English name, else the German one, else the first translation (lowercase ASCII letters, digits and single hyphens; umlauts transliterated; at most 40 characters; `-2`, `-3`, … appended while taken) and follows the name until the user edits it. A key the user typed MUST follow the shared key rule (letters, digits, `-` and `_` only, trimmed, the whole key with its prefix at most 256 characters), MUST be unique (a taken key is flagged and refused, never renamed), and is saved as given. The field states how the key is stored and that it cannot be changed after creation; afterwards the key is shown read-only. Look definition and discount share the key `look-<lookKey>`.

#### Saving and consistency

- **FR-040**: Saving MUST write, in this order: (1) the look's Discount Group, inactive; (2) the set-price Cart Discounts of its countries, inactive, in the group; (3) the look definition (Custom Object); (4) activation, only when "Nach dem Anlegen aktiv" is on: the group first, then the country discounts, the main discount last. No order of failure MAY leave a half look live. Every step MUST check by key first and be idempotent, so a retry continues where it stopped.
- **FR-041**: Each set-price discount MUST apply once per complete set in carts of its country (cart condition `country = "XX"`, or `country is not defined` for prices without a country), with one pattern component per piece (exactly one unit of each, matched by product), valid in no specific store, requiring no code, belonging to the look's Discount Group and carrying no `sortOrder` of its own. Its value is, for an amount country, an absolute amount (`absoluteCart`, `ProportionateDistribution`) per currency equal to live sum minus set price, and for a percentage country a relative one (`relativeCart`, `IndividualApplication`, permyriad = percent × 100). The main discount is keyed `look-<lookKey>`, the others `look-<lookKey>-<COUNTRY>` (`-ALL` without a country).
- **FR-042**: The Discount Group of a look MUST take the lowest free rank (`sortOrder`) in the reserved range 0.7–0.7999 in steps of 0.0001, written without trailing zeros (the API rejects e.g. `0.7000`), unique among all Cart Discounts and all Discount Groups. When the range is exhausted, saving MUST be refused with a message.
- **FR-043**: Discounts MUST carry readable names, in every language the look has a name in (the Discount Group carries the plain look name and the look description): name "Look-Set: <look name>" in German and "Look set: <look name>" in every other language; description "<look name>". Readers MUST take the look name from `name` when it has the "Look-Set: …" form and otherwise from `description`. Keys never change.
- **FR-044**: Look-building logic (key derivation, definition value, group and discount drafts, price reader, validation rules, rank allocation) MUST live in one browser-safe module with unit tests; the app is its only writer.

#### Switching, repricing, completing

- **FR-050**: Switching MUST set the Discount Group's active flag first, then the discounts' active flags (switching on: country discounts, then the main discount; switching off: the main discount, then the country discounts), each using its current version; the look definition MUST NOT be deleted by switching off. A look from before groups has no group to switch. On a version conflict the app MUST re-read and show the current state without retrying blindly. The end-date write is best effort (see FR-024).
- **FR-051**: The switch MUST only be offered for complete looks (definition and discount both exist and name the same pieces).
- **FR-052**: A set-price change MUST validate as for a new look, then update each country discount's value from today's live prices (creating a missing country discount), then update the definition's `setPrice` and `savingPercent` using the object's current version. A change that alters nothing makes no call. A failure between the two writes MUST be surfaced as in Story 5 scenario 4. "Setpreis neu berechnen" MUST perform the same with the unchanged price.
- **FR-053**: ~~Look photo field on the detail~~ (removed: the photo is not used).
- **FR-054**: "Vervollständigen" MUST follow Story 6; completing MUST never switch a discount on.
- **FR-055**: The detail page header MUST offer "Look löschen" as an icon button (trash) next to the active switch (disabled, never hidden, without Manage). Deleting removes the country discounts, then the main discount, then the Discount Group, and the Custom Object last, so a look that failed half way can still be opened and deleted again; a resource that is already gone is skipped. It MUST open a confirmation dialog (Nimbus `ConfirmationDialog`) titled with the look name, saying the definition, the country discounts and the Discount Group are removed irreversibly, with an extra warning for an active look. Cancel, the close button and Escape MUST write nothing. On success a toast confirms and the app returns to the list; on failure an error toast shows the error, the dialog closes and the page reloads what is left.

#### Look detail

- **FR-060**: The detail MUST show a back link "Zurück zu Looks"; the look name as title; the look key below; on the right a two-line status ("Status" and "Aktiv"/"Inaktiv") with the switch (Manage), the delete icon button, and for View-only users the tag "Nur Lesezugriff". The "Im Shop ansehen" link was removed.
- **FR-061**: Below the alerts, the heading "Teile (n)" and the pieces as the same product tiles as in the new-look flow (`PieceResultCard`, state `static`: no add button, no "Im Look" marker), in a `role="list"` grid (auto-fill, minimum 150 px) with one `role="listitem"` per piece: image, name, size chips (sold-out sizes struck through), "Einheitsgröße" for sizeless pieces, "<size>: nur noch N" (1–3 left) and "ausverkauft: <sizes>". A piece whose product is not loaded shows a tile named by its product id. Then the set-price table (as in step 3, one row per price cell) with the saving.
- **FR-061a**: ~~Price per currency and plain stock counts ("S: 5") on the piece cards, and a 280 px box with the first two piece images~~ (removed: the detail uses the creation tiles, which show neither).
- **FR-062**: The detail MUST show a warning when a piece is sold out in every size, and the "Setpreis weicht ab" notice with "Setpreis neu berechnen" when drift exists.

#### Shop preview (removed)

- **FR-070**: ~~Shop preview on the detail~~ (removed: the shop preview was dropped).
- **FR-071**: ~~Neutral preview, default currency, user language~~ (removed with FR-070).

#### Platform integration, scopes, hosting

- **FR-080**: The app MUST request exactly these OAuth scopes. View: read products (including product search), read key-value documents, read cart discounts, read orders, read the project (for currencies). Manage: manage key-value documents, manage cart discounts (Discount Groups are assumed to be covered by the cart-discount scopes; not yet confirmed against a live project). It MUST NOT request manage products, manage orders, manage project, or any customer scope.
- **FR-081**: The app MUST be deployable in **two ways from the same code and the same configuration**, both producing the same static bundle:
  - **Connect**: a `connect.yaml` declaring a single application of type `merchant-center-custom-application` with standard configuration `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH` (default `looks`), `INITIAL_PROJECT_KEY` and `CLOUD_IDENTIFIER` (default `gcp-eu`), plus `VARIANT_ATTRIBUTES` when it differs per project (not yet declared in `connect.yaml`);
  - **Netlify**: a `netlify.toml` with the build command, publish directory, a rewrite of every path to the entry page, an `X-Robots-Tag: noindex` header, and the production URL as the application URL.

  In both, the app MUST read project data only through the Merchant Center API with the signed-in user's permissions, MUST NOT sit behind any shared-password gate, and MUST take Application ID and URLs from environment variables, never literals. Netlify is also the way to preview and develop; Connect is the production path. A deploy MUST NOT require changing code, only environment variables.
- **FR-082**: Registration, installation for the project, and team permissions are manual steps performed in the Merchant Center and MUST be documented in a setup checklist naming each step and its owner (Organization → Custom Applications → add "Looks", entry-point path, scopes, menu label in de/en; after first deploy set URL, set state Ready, install for the project; assign Manage/View to teams). The checklist MUST have one section per deploy path: for Netlify, the site URL is the Application URL; for Connect, the checklist covers creating the connector deployment, its variables (FR-081), and the application URL that Connect provides. Switching between the two paths MUST be described as changing the Application URL in the registration.
- **FR-083**: Seeding or demo-data tooling is not part of this feature.
- **FR-084**: Everything that differs between projects MUST be a developer-set configuration value, defined in one place and never scattered as literals through the code. The values are:
  - **Variant attributes**: the names of the product-variant attributes that tell the variants of a product apart (for example search colour, finish colour and size), in display order; a variant is shown as the values of these attributes joined with " / " (text, number, enum, localized or set values), used for the size chips and per-variant stock on the product tiles;
  - **Application ID** and **production URL** (FR-081).
- **FR-085**: The configuration MUST be designed so it can move to environment variables (`.env`, with a committed example file listing every variable, a description and a default) without changing any code that reads it: all reads go through one configuration module. Until then the module holds the defaults. Missing or empty required values MUST fail loudly at start-up or build time with a message naming the variable, not silently at first use. A product that lacks the configured size attribute is shown as "Einheitsgröße" (one size).

### Key Entities *(include if feature involves data)*

- **Look**: a curated set of at least 2 products. Attributes: look key, name and optional description per project language, ordered pieces, set price per price cell, optional switch-off time. It is made of three kinds of resources: a *look definition*, one *Discount Group* and one *set-price discount* per country; the definition and the main discount are required for a complete look.
- **Look definition**: the key-value document in the container `look`, key `look-<lookKey>`, value `{ componentProductIds[], setPrice{<cell>: cent amount}, savingPercent?{<cell>: percent}, endedAt? (ISO time) }` where a cell is `EUR/DE` (currency and country) or `EUR`. Written by the app; read by the storefront.
- **Discount Group**: `look-<lookKey>`; name = look name, description = look description (per language), `sortOrder` = the look's single rank, `isActive` = switched together with the discounts.
- **Set-price discount**: one Cart Discount per country with set prices, in the group: the main one with the key `look-<lookKey>` (it decides the look's status), the others `look-<lookKey>-<COUNTRY>` or `-ALL`. Absolute (amount) or relative (percentage) per country. Its name carries the look name (FR-043).
- **Piece**: a product as the app shows it: image, localized name, list prices per price cell, sizes with default-inventory stock, sold-out-everywhere flag.
- **Past look sales**: per look, derived from orders: orders, sets sold, revenue per currency (see FR-022).
- **Completeness**: complete / missing discount / missing definition / inconsistent (the two name different pieces).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A merchandiser can create, review and switch on a new look without a developer or a deployment, and the look is visible in the shop (product-page set block and a cart holding one unit of each piece at the set price) immediately after switching on.
- **SC-002**: A trained merchandiser completes the four-step creation of a three-piece look in under 3 minutes, from clicking "Neuer Look" to "Look speichern".
- **SC-003**: Switching a look off or on takes one interaction and is confirmed on screen within 2 seconds on a normal connection; the next cart recalculation reflects it.
- **SC-004**: The looks list for a project with 1,000 looks renders its first page within 1 second and is fully populated within 3 seconds on a normal connection; changing page, page size, sort or filter responds within 1 second.
- **SC-005**: 100% of looks created by the app are valid under the shop's rules: every one is complete (definition and discount, same key, same pieces), has at least 2 pieces, and a set price below the live sum in every price cell it prices. No save leaves a live half-look at any point, including when any single write fails.
- **SC-006**: In a test with a deliberately failed second or third write, retrying never creates a duplicate discount or definition (0 duplicates over all failure points).
- **SC-007**: In a project with one, two or three currencies, the price cells, sums, savings and revenue appear for exactly those currencies and their countries; no currency code is hard-coded (verified automatically).
- **SC-008**: No write control is operable by a View-only user (0 enabled write actions), and no write control is hidden from them without an explanation.
- **SC-009**: Every UI string exists in German and English with identical key sets and placeholders; 0 raw string literals in rendered UI; verified automatically.
- **SC-010**: The sales figures on a past-look card match a manual count of qualifying orders in a test project exactly (sets, orders, revenue).
- **SC-011**: In a 1440 px window, no table column header wraps in either language, and five piece images fit without shrinking.

## Assumptions

- **Users and permissions**: Users are merchandisers and team leads who already have Merchant Center access; teams get View or Manage via the Organization's custom-application settings.
- **Platform**: The shop reads looks as described in the data contract (product-page set block, cart summary line) and applies the set price from the discount. Changing the storefront is out of scope; this app only writes the data it reads. Because the naming changes from `sim-look`/`sim-demo-look-` to `look`/`look-`, any shop reader of the old names must be pointed at the new ones; that work is outside this spec.
- **Naming**: container `look`, key prefix `look-` (the decision was "just `look-`"; the container name follows the same rule).
- **Language**: German is the reference UI language, English the second; profile language drives UI labels, data locale drives content. Look names are entered in the **project's languages** (read from the project settings, like the currencies); one name is enough, readers fall back data locale, de, en, first.
- **No brands**: looks are not tied to a brand. Product search covers the whole catalog; there is no brand filter, badge, brand-pure rule. Brands can be reintroduced later as a separate feature.
- **Currencies**: from the project settings (FR-007). Percent saving in the list is computed on the first currency.
- **Stock**: sizes and stock come from the default inventory (inventory entries without a supply channel); no stock channel is configured. A variant has a size only if it has such an entry; when no variant of a product has one, all variants are listed as sold out so the sold-out warning still shows.
- **Configuration**: the variant attributes are developer-set (FR-084), read in one configuration module from `VARIANT_ATTRIBUTES` (FR-085). Default variant attribute: `size`. There is no admin UI for them; the person setting up the app is a developer.
- **Seeding**: no seed, demo-data or reset tooling is built or maintained. Looks exist only through the app.
- **Resolved source conflicts**:
  - Column widths: the later spec decision wins over the design board (Ersparnis 100 px, Status 120 px, Aktiv 88 px) because "Aktiv" broke across lines at 60 px. The Marke column is removed with brands.
  - Piece count: at least 2, no upper limit (earlier versions allowed a maximum). The list strip shows the first five piece images and counts the rest (+N).
  - Look and product names follow the data locale (not the UI language).
  - Design placeholder text (e.g. the step 2 error "Aktuell sind 6 gewählt") is an example; the built wording wins.
  - The detail's stock text in the design ("Größen … verfügbar") is a summary; the real app shows per-size stock from inventory.
- **Not in scope**: pagination of "Frühere Looks"; an approval workflow (the inactive state is the review place); deleting looks from the list (deleting is only offered on the detail page, see FR-055); editing the pieces of an existing look; analytics beyond the "Frühere Looks" figures; the storefront; seeding; brands; drift snapshot tooling.
- **Platform limits relied on**: at most 100 active, store-independent, code-less Cart Discounts per project; a Cart Discount's and a Discount Group's `sortOrder` must be unique and must not end in a zero; Custom Application entry-point paths are unique within a region.
- **Developer setup**: a developer sets these values per project before first deploy; the setup checklist (FR-082) lists them for both deploy paths.
- **Two deploy paths**: Netlify and Connect are both required (FR-081). Connect is production; Netlify is development, preview and fallback. Both serve the same bundle, so there is no code branch per host.
- **Dependencies**: Merchant Center application shell with Nimbus support (React 19); Connect (`connect.yaml`) and Netlify (`netlify.toml`) for hosting; the Merchant Center API for project settings, products, custom objects, cart discounts, discount groups, orders; Product Search; static hosting; a manual registration by an organization admin.
- **Design reference**: Visual detail (spacing, radius, tokens, component choice) lives in the prototype's design round 2 (boards 1a–3b) and its handoff notes, minus everything brand-related; this spec states behaviour.
