# Feature Specification: Looks (Merchant Center app for curated looks)

**Feature Branch**: `001-looks-app` (spec directory only; no git branch created)

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Create a specification for Looks, based on the current-state captures (`sim-pot/docs/design/current-state/mc-looks`), the design round 2 (`sim-pot/docs/design/2026-10-06-looks-r2/Looks.dc.html` and `HANDOFF.md`), and the existing implementation in `sim-pot` (`frontend/mc-look-builder`, `packages/shared/src/looks`, the `mc-look-builder` OpenSpec, and the storefront readers of looks)." Follow-up decisions (2026-10-27): follow the project's currencies; no brands for now; no `sim` naming, plain `look-`; seeding is not required.

**Sources and precedence**: Where sources disagree, the order is: running code in `sim-pot` > design round 2 (boards 1a–3b) > the older `mc-look-builder` OpenSpec text > the 2026-10-01 captures. The decisions above override all of them. Everything about brands in the sources (brand badge, brand filter, brand-pure looks, brand assortments, brand-themed shop preview, brand-prefixed keys) is intentionally dropped.

## Overview

A **look** is a curated outfit: at least 2 products (no upper limit) sold as a set at a set price below the sum of the single prices. The shop shows the look on each piece's product page ("Shop the look"), and in the cart, where the set price applies automatically once every piece is in the cart.

Today the platform's standard Merchant Center covers only half of this: the set-price discount can be maintained in the Discounts application, but the look itself (which pieces, which photo) has no business screen. Merchandisers need a ticket and a developer to create or retire a look.

**Looks** closes that gap: a Merchant Center custom application, in the main menu, in which merchandisers list, create, switch on and off, and reprice looks, see how retired looks sold, and preview how a look will appear in the shop, without a ticket and without a deployment.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See all looks and their live status (Priority: P1)

A merchandiser opens "Looks" in the Merchant Center main menu and sees every active look in one table: look photo and name, the piece images, set price per project currency, the sum of the single prices, the saving in percent, and whether the look is live in the shop. They can search by name.

**Why this priority**: Without this view nothing else is discoverable. It is also the smallest slice that delivers value on its own: it replaces "ask a developer what looks exist".

**Independent Test**: In a project with several looks, open the app. All active looks appear with correct prices and saving; search narrows the list; a read-only user sees the same table.

**Acceptance Scenarios**:

1. **Given** a project with eight active looks, **When** the user opens the app, **Then** the table lists all eight, each with set price per project currency, live sum, saving in percent and status "Aktiv"/"Active", and the header reads "8 Looks".
2. **Given** a look has a look photo, **When** the list renders, **Then** the photo is shown in the Look column in 2:3 portrait; **Given** a look has no photo, **Then** the first piece images stand in the same box.
3. **Given** a look has up to five pieces, **When** the list renders, **Then** all piece images are visible without being cut; a look with more pieces shows the first five and "+N".
4. **Given** the user types part of a name, **When** the filter applies, **Then** only matching looks remain and the count updates; if none match, an empty-filter message is shown.
4a. **Given** more looks than fit on one page, **When** the list renders, **Then** it shows one page with page controls and a page-size choice, and the count states the total ("8 Looks" total, not the page size).
4b. **Given** a sortable column header (Look, Setpreis, Summe, Ersparnis, Status), **When** the user activates it, **Then** the list is sorted by that column, ascending then descending, the sort state is announced and visible, and the default order is by name ascending.
5. **Given** the window is 1440 px wide, **When** the table renders, **Then** it spans the full content width, only the Look column grows, and no column header wraps in German or English.
6. **Given** the data cannot be loaded, **When** the list fails, **Then** an error with a retry action is shown and no partial list is presented as complete.
7. **Given** the project has no look at all, **When** the app opens, **Then** an explanatory empty state is shown, with "Neuer Look" for users who may create.

---

### User Story 2 - Create a new look with a live shop preview (Priority: P1)

A merchandiser clicks "Neuer Look" and is guided through four steps: **Basics** (the name in every project language, optional look photo), **Pieces** (search products, choose 2 to 5, reorder), **Set price** (one price per project currency, shown against the sum), and **Review** (summary, "Nach dem Anlegen aktiv" switch, "Look speichern"). Beside the form, a shop preview shows how the look will appear on a product page, updating as they type.

**Why this priority**: Creating looks is the core job of the app and the reason it exists.

**Independent Test**: Create a two-piece look with set prices below both sums, leave "active after saving" off, and confirm it is saved, inactive, and appears under "Frühere Looks".

**Acceptance Scenarios**:

1. **Given** step 1, **When** the user enters a name in at least one project language and presses "Weiter", **Then** step 2 opens; if no name is entered, a field error names the problem and nothing is written.
2. **Given** step 1 with a look-photo path of the form `looks/<name>.webp` (or jpg, png) that loads from the shop, **When** it loads, **Then** the photo appears 120 px wide in 2:3 next to the form and later in the preview; **Given** an invalid path or a photo that cannot be loaded, **Then** "Weiter" stays on step 1 with a field error. An empty field is valid (look without photo).
3. **Given** step 2, **When** the user searches, **Then** products are found with image, name, colour, price and sizes with availability; selecting a product adds it to the look; the step is titled "Teile wählen (2 bis 5)" and states the count ("4 Teile gewählt").
4. **Given** fewer than 2 or more than 5 pieces, **When** the user proceeds or saves, **Then** a field error states the limit and the current count; nothing is written.
5. **Given** a piece without sizes (e.g. an accessory), **Then** it reads "Einheitsgröße" instead of a size list.
6. **Given** a piece is sold out in every size, **When** it is added, **Then** a warning explains that the set cannot be bought at the set price while this lasts, but saving is not blocked.
7. **Given** a set price in a currency that is zero, or equal to or above the live sum of the pieces, **When** the user proceeds, **Then** a field error names that currency.
8. **Given** a selected piece has no list price in one of the project's currencies, **Then** saving is refused with an error naming the piece and the currency.
9. **Given** the review step with "Nach dem Anlegen aktiv" off (the default), **When** the user saves, **Then** the look is stored inactive and listed as "Inaktiv"; with it on, the look is live right after saving.
10. **Given** step 1, **When** the user has entered a name, **Then** the field "Key" shows the suggested key (derived from the name, free of existing keys, e.g. `winter-2` when `winter` exists) and how it will be saved (`look-<key>`), and follows the name until the user edits it; **When** the user types their own key, **Then** it is kept as typed, shown on the review and saved as given; "Vorschlag übernehmen" takes the suggestion back.
11. **Given** a key with characters other than letters, digits, hyphens and underscores, or a key that is already taken, **When** the user presses "Weiter" (a taken key is flagged while typing), **Then** a field error names the problem and nothing is written; a key chosen by the user is never renamed silently, also not when someone else takes it while saving (the flow returns to the key field).

---

### User Story 3 - Switch looks on and off, and bring retired looks back (Priority: P1)

A merchandiser (or lead) switches a look on or off from the list row or the detail page. A look that is switched off is not offered in the shop and no cart receives its set price. It is not deleted: it moves to the "Frühere Looks" section, from where it can be reactivated.

**Why this priority**: Controlling what is live is the day-to-day operation and the "review before going live" mechanism (a look is created inactive, someone checks it, someone switches it on).

**Independent Test**: Switch an active look off; confirm the shop's next cart recalculation no longer applies the set price and the look appears in "Frühere Looks" with an end date; reactivate it and confirm it returns to the main list.

**Acceptance Scenarios**:

1. **Given** an active, complete look and Manage permission, **When** the user switches it off, **Then** the look becomes inactive, a toast confirms it, the end date (now) is recorded, and the look moves to "Frühere Looks".
2. **Given** the look was changed by someone else in the meantime, **When** the switch is pressed on stale data, **Then** the app re-reads the current state, shows it, tells the user, and does not retry blindly.
3. **Given** a look is incomplete (see User Story 6), **Then** no switch is offered; only "Vervollständigen".
4. **Given** the end-date write fails after a successful switch, **Then** the switch still stands and the look simply shows no end date.
5. **Given** a past look, **When** the user presses "Wieder aktivieren", **Then** the look is live again, its end date is cleared, and it leaves the section and appears in the main list.

---

### User Story 4 - Learn from retired looks ("Frühere Looks") (Priority: P2)

Below the list, the section "Frühere Looks" ("Ausgeschaltete Looks und wie sie verkauft haben") shows one card per switched-off look, best seller first: photo or piece strip, name, the period it was active, and how it sold (sets sold, orders, revenue), or "Kein Set verkauft". The best seller carries a "Bester Look" badge. It serves as an idea source ("that was a good look, that one not").

**Why this priority**: High value for merchandising decisions, but the app is usable without it.

**Independent Test**: With three switched-off looks, two of which have orders carrying their set discount, the cards show correct sets/orders/revenue, are ordered by sets sold, and the best one has the badge.

**Acceptance Scenarios**:

1. **Given** two past looks that sold 5 and 2 sets, **Then** the 5-set look is first and carries "Bester Look"; the other does not.
2. **Given** a past look with no order in the window, **Then** its card reads "Kein Set verkauft"; and if no past look sold anything, no card has the badge.
3. **Given** a look switched off on 6 Oct and renamed on 8 Oct, **Then** the card reads "aktiv 30.09.2026 bis 06.10.2026", using the recorded switch-off date, not the last-modified date.
4. **Given** a past look without a recorded end date, **Then** no "aktiv … bis …" line is shown; everything else is unchanged.
5. **Given** two orders carrying the look's set discount on 3 and 6 units of a 3-piece look, **Then** the card shows 2 orders and 3 sets, with revenue summed per currency (a currency line only when the look sold in it).
6. **Given** the sales data is loading, **Then** four skeleton cards appear and the main list stays usable; **Given** there is no past look, **Then** "Noch keine früheren Looks" is shown with an explanatory line; **Given** the sales data cannot be read, **Then** an error with "Erneut versuchen" appears, while the cards, photos and "Wieder aktivieren" still work.
7. **Given** the sales read reaches its size bound, **Then** the section says the figures come from the most recent orders only, rather than claiming completeness.
8. **Given** four cards per row at 1440 px, **Then** all columns shrink together (equal widths).

---

### User Story 5 - Inspect a look and change its set price or photo (Priority: P2)

Opening a look shows its detail: back link "Zurück zu Looks", title and key, the "Aktiv" switch (or "Nur Lesezugriff" for view-only users), "Im Shop ansehen", the look photo (280 px, 2:3), one card per piece (image, name, colour, price per currency, stock per size), and the shop preview. With Manage permission the user can enter new set prices (one per project currency) and set or clear the look photo.

**Why this priority**: Repricing and fixing a look after launch is a frequent follow-up task; creation (P1) comes first.

**Independent Test**: Open a look, lower its set price below the sum, save, and verify that a cart containing one unit of each piece lands on the new price and the detail shows the new price and saving.

**Acceptance Scenarios**:

1. **Given** a five-piece look, **Then** all five piece cards are shown.
2. **Given** a piece has one size left, **Then** that size shows its quantity and the others show sold out; no warning, because the set is still buyable. **Given** a piece is sold out in every size, **Then** a warning is shown.
3. **Given** a valid new set price, **When** the user saves, **Then** the platform's discount amount is recomputed from today's single prices first, then the look definition is updated, and the detail confirms "Setpreis gespeichert".
4. **Given** the discount was updated but the look definition write failed, **Then** the detail says "Setpreis im Shop noch nicht aktualisiert" with a retry, and the list marks the look "Setpreis weicht ab" until the retry succeeds.
5. **Given** a piece's price changed after authoring so the set no longer lands on the stored set price, **Then** list and detail show "Setpreis weicht ab", and "Setpreis neu berechnen" re-computes the discount amount from today's prices.
6. **Given** a photo path that is invalid or cannot be loaded, **When** the user saves it, **Then** saving is refused with a field error; clearing the path removes the photo.
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

1. **Given** View only, **Then** "Neuer Look", the "Aktiv" switches, "Wieder aktivieren", the set-price and photo inputs are disabled (not hidden), and "Nur Lesezugriff" is shown.
2. **Given** a user with neither permission, **Then** the menu entry is absent and a direct URL shows the Merchant Center's no-permission page.

---

### Edge Cases

- **Name collision**: two users save a look with the same name at the same moment. When the key was only suggested, the loser re-derives the next free key (suffix `-2`, `-3`, …) and retries once before showing an error; when the user chose the key, it is not changed and the user is asked to pick another.
- **Partial save failure** (network, conflict, permission) after the discount exists but before the definition: the discount stays inactive (harmless in every cart); the user sees what failed with "Erneut versuchen"; the look is "Unvollständig" until a retry completes. A retry continues where it stopped and never creates duplicates.
- **Activation fails** after both writes succeeded: the look exists and shows as inactive; it can be switched on from the list.
- **Edited form during a failed save**: a retry only resumes the earlier plan if the entered data still matches it; otherwise it re-plans.
- **Ordering range exhausted**: when the reserved discount rank range (0.7–0.799, 100 values, never ending in a zero) is full, saving is refused with a clear message.
- **Platform limit**: every active look discount counts toward the platform's limit of 100 active, store-independent, code-less Cart Discounts per project.
- **Project currencies change**: a look created before a currency was added to the project has no price in it; such a look is flagged like a missing price and cannot be repriced until the set price is entered for every project currency.
- **Piece list price changes** after authoring (see Story 5, drift).
- **Missing price in a project currency** on a piece: saving is refused, because the look would be unsellable in that currency.
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
- **FR-005**: Content values (look names, product names, colour names) MUST be read in the Merchant Center's data locale, falling back to `de`, then `en`, then the first available language.
- **FR-006**: Every success and error MUST surface through the Merchant Center notification channel; errors MUST be human-readable and name the failed operation; lists and details MUST show a loading indicator and an error state with retry.

#### Currencies

- **FR-007**: The currencies of a look are the **project's currencies**, read from the project settings at runtime. Set prices, sums, discount amounts, savings and sales revenue MUST be handled per project currency. No currency code MAY be hard-coded. Price columns show one line per currency, the first (the project's default currency, then the order of the project settings) in bold.
- **FR-008**: A piece's list price is taken per currency and country (price cell) from its master variant, else from another variant that has the cell, never from a price restricted to a customer group or channel, and only while it is valid. The set-price step shows a table with one row per cell in which every piece has a price (ordered by currency): the pieces' prices, their sum, the set price (money field, starting at the sum) and the saving in percent (number field); editing one updates the other. A row with an empty set price gets no Cart Discount; one Cart Discount is written per country with set prices (condition on the cart country).

#### Looks list

- **FR-010**: The list MUST show one row per look (a look definition joined with its same-key set-price discount) with the columns, in order: **Look** (photo 64 px wide 2:3 with name and key; takes remaining width, minimum 200 px), **Teile** (all piece images, 36 px wide 4:5, 4 px apart, up to five), **Setpreis** (one line per currency), **Summe** (live sum per currency), **Ersparnis** (percent, of the sum in the first currency), **Status**, and **Aktiv** (switch; Manage only).
- **FR-011**: The table MUST span the full content width; only the Look column grows. No column header MAY wrap in German or English; each fixed column MUST be at least as wide as its header in both languages. The look name MUST be cut with an ellipsis on one line.
- **FR-012**: Status MUST be read from the discount's active flag (the discount decides what the shopper pays), shown as "Aktiv"/"Inaktiv" plus the warnings "Unvollständig" and "Setpreis weicht ab".
- **FR-013**: The page MUST offer search by look name (field at most 360 px wide) and a count of all matching looks ("8 Looks") on the right. "Neuer Look" MUST sit at the right of the page heading (Manage only).
- **FR-013a**: The list MUST be paginated (page-size choice of 20, 50, 100; default 20; the page and size are kept while the user filters, sorts, switches a look, or returns from a detail) and sortable by Look (name in the data locale), Setpreis, Summe, Ersparnis and Status. Sorting and filtering apply to all looks, not only the visible page. Columns whose values are not comparable (Teile, Aktiv) are not sortable. The default sort is name ascending; a changed sort or filter returns to page 1. "Frühere Looks" is exempt from pagination and sorting: it is ordered by sets sold (FR-021), and shows all past looks.
- **FR-014**: The main list MUST contain active looks and incomplete looks (whatever their state); complete looks that are switched off MUST appear only under "Frühere Looks". With no active look the list MUST say "Zurzeit ist kein Look aktiv."
- **FR-015**: The list MUST show loading (skeleton rows), empty, filtered-empty, and error-with-retry states. Row click MUST open the look's detail.
- **FR-016**: A look without a look photo MUST show its first piece images stacked in the same 64 × 96 px box.

#### Frühere Looks

- **FR-020**: The section MUST list every complete, inactive look, one card each, four per row at 1440 px with equal columns. A card shows: photo or piece strip (92 px high), "Bester Look" badge (first card only, and only if at least one set sold), name, "aktiv <from> bis <until>" (only when both dates are known), then either the figures "Verkaufte Sets", "Bestellungen", "Umsatz" (one line per currency in which the look sold) or "Kein Set verkauft", and "Wieder aktivieren" (Manage only).
- **FR-021**: Cards MUST be sorted by sets sold (descending), then by name. A card opens the look's detail.
- **FR-022**: Sales MUST be derived from orders, read-only. A line sold as part of a set carries a portion of the look's discount; therefore: sets sold = units carrying the discount ÷ piece count, rounded down; orders = orders with at least one such unit; revenue = quantity × discounted unit price, summed per currency.
- **FR-023**: The order read MUST be bounded: orders from the last 90 days, newest first, at most 4 pages of 500. When the last page is full, the section MUST state that figures come from the most recent 2000 orders instead of claiming completeness. The section MUST load independently so a failing read never hides the list.
- **FR-024**: "Aktiv from" MUST be the discount's creation date. "Aktiv until" MUST be the date the look was switched off, recorded on the look definition when switched off and cleared when switched on again; it MUST NOT be the discount's last-modified date. A new set price or photo MUST keep the recorded end date.
- **FR-025**: The section MUST have loading (four skeleton cards), empty ("Noch keine früheren Looks" + "Ausgeschaltete Looks erscheinen hier mit ihren Verkäufen."), and error states ("Die Verkaufszahlen konnten nicht geladen werden." with "Erneut versuchen"; the cards and reactivation keep working).

#### Creating a look

- **FR-030**: "Neuer Look" MUST open a four-step flow (Grunddaten, Teile, Setpreis, Prüfen) with a step indicator that marks the current step, and the shop preview beside the form in every step.
- **FR-031**: Step 1 MUST collect the name with one input per project language (the Nimbus localized text field: the data locale first, the other languages behind its toggle; at least one language is required, empty translations are omitted when saving) and an optional look photo path (`looks/<name>.webp|jpg|png`, help text "Hochformat, das Model trägt den Look"). The photo's pixel size MUST be read from the loaded file and stored with the path. It MUST also collect an optional description with one multi-line input per project language (same localized field). The Discount Group of the look takes the name as its name and the description as its description.
- **FR-032**: Step 2 MUST search products and show per product: image, name, colour (the variant's colour name in the data locale, falling back to the colour attribute's label (attribute names per FR-084), so colourways of one model can be told apart), and sizes with availability from the default inventory. Sizes are the variants having a default inventory entry, labelled by their variant attributes (FR-084); several variants without any such attribute are listed by SKU, and only a product with a single such variant is one size. Pieces MUST be reorderable (drag). A look MUST have 2 to 5 pieces, no duplicates. The step shows no prices and no sum; prices appear from the set price step on.
- **FR-033**: Step 3 MUST collect one set price per project currency and show the sum of the pieces and the saving.
- **FR-034**: Step 4 MUST show a summary and the switch "Nach dem Anlegen aktiv" (default off).
- **FR-035**: Saving MUST be refused unless: at least one name is present; there are at least 2 distinct pieces (no upper limit); every piece has a list price (FR-008) in every project currency; the set price in each currency is a positive integer amount strictly below the live sum of the pieces in that currency; and the sum the user saw still equals the live sum at save time.
- **FR-036**: The look key MUST be shown and editable while the look is created: step 1 has a field "Key" that suggests the slug of the English name, else the German one, else the first translation (lowercase ASCII letters, digits and single hyphens; umlauts transliterated; at most 40 characters; `-2`, `-3`, … appended while taken) and follows the name until the user edits it. A key the user typed MUST follow the shared key rule (letters, digits, `-` and `_` only, trimmed, the whole key with its prefix at most 256 characters), MUST be unique (a taken key is flagged and refused, never renamed), and is saved as given. The field states how the key is stored and that it cannot be changed after creation; afterwards the key is shown read-only. Look definition and discount share the key `look-<lookKey>`.

#### Saving and consistency

- **FR-040**: Saving MUST write, in this order: (1) the set-price discount, inactive; (2) the look definition; (3) activation, only when "Nach dem Anlegen aktiv" is on. No order of failure MAY leave a half look live. Every step MUST check by key first and be idempotent, so a retry continues where it stopped.
- **FR-041**: The set-price discount MUST apply once per complete set: no cart condition, one pattern component per piece (exactly one unit of each, matched by product), an absolute amount per project currency equal to live sum minus set price, distributed proportionately over the matched lines, valid in no specific store, requiring no code, with a rank unique among all Cart Discounts.
- **FR-042**: App-created discounts MUST take the lowest free rank in the reserved range 0.7–0.799 in steps of 0.001, written without trailing zeros (the API rejects e.g. `0.700`). When the range is exhausted, saving MUST be refused with a message.
- **FR-043**: Discounts MUST carry readable names, in every language the look has a name in: name "Look-Set: <look name>" in German and "Look set: <look name>" in every other language; description "<look name>". Readers MUST take the look name from `name` when it has the "Look-Set: …" form and otherwise from `description`. Keys never change.
- **FR-044**: Look-building logic (key derivation, definition value, discount draft, price reader, validation rules, rank allocation) MUST live in one browser-safe module with unit tests; the app is its only writer.

#### Switching, repricing, completing

- **FR-050**: Switching MUST set the discount's active flag using its current version; the look definition MUST NOT be deleted by switching off. On a version conflict the app MUST re-read and show the current state without retrying blindly. The end-date write is best effort (see FR-024).
- **FR-051**: The switch MUST only be offered for complete looks (definition and discount both exist and name the same pieces).
- **FR-052**: A set-price change MUST validate as for a new look, then update the discount amount from today's live prices, then update the definition's set price using the object's current version. A failure between the two writes MUST be surfaced as in Story 5 scenario 4. "Setpreis neu berechnen" MUST perform the same with the unchanged price.
- **FR-053**: The detail MUST offer, with Manage, a field "Look-Foto (Pfad)" to set or clear the photo, validated as in step 1, with photo size read from the loaded file; a write of a look without photo MUST leave an existing photo untouched.
- **FR-054**: "Vervollständigen" MUST follow Story 6; completing MUST never switch a discount on.

#### Look detail

- **FR-060**: The detail MUST show a back link "Zurück zu Looks"; the look name as title; the look key below; on the right the "Aktiv" switch (Manage) or the tag "Nur Lesezugriff"; and "Im Shop ansehen" (link to the first piece's product page on the shop).
- **FR-061**: Below, three columns: look photo (280 px, 2:3; alt text = look name), the pieces (one card per row: image 120 px 4:5, name, colour, price per currency, stock per size; "Einheitsgröße" for sizeless pieces; 1–3 left shown as "<size>: nur noch N", sold out sizes as "<sizes>: ausverkauft"), and the shop preview (400 px). Then the set price with the saving, and the photo field.
- **FR-062**: The detail MUST show a warning when a piece is sold out in every size, and the "Setpreis weicht ab" notice with "Setpreis neu berechnen" when drift exists.

#### Shop preview

- **FR-070**: A shop preview ("Shop-Vorschau", caption "So erscheint der Look im Shop") MUST appear in every step of the new-look flow and on the detail. It mirrors the structure of the shop's product-page set block: "Set zu <set price>" with "Einzelpreise zusammen: <sum>" struck through, one row per piece with image, name and size dropdown including sold-out and low-stock states, the look photo above when there is one, and a full-width "Set in den Warenkorb" button, inert in the app. Without a set price it reads "Setpreis folgt". Without a first piece it shows a neutral placeholder.
- **FR-071**: The preview is neutral (Nimbus default theme, no brand colours, fonts or logos). It shows prices in the project's default currency. Like every other text of the app, its texts and the price format follow the Merchant Center user's language (FR-004, German and English); there is no fixed shop language. The preview MUST never write anything.

#### Platform integration, scopes, hosting

- **FR-080**: The app MUST request exactly these OAuth scopes. View: read products (including product search), read key-value documents, read cart discounts, read orders, read the project (for currencies). Manage: manage key-value documents, manage cart discounts. It MUST NOT request manage products, manage orders, manage project, or any customer scope.
- **FR-081**: The app MUST be deployable in **two ways from the same code and the same configuration**, both producing the same static bundle:
  - **Connect**: a `connect.yaml` declaring a single application of type `merchant-center-custom-application` with standard configuration `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH` (default `looks`), `INITIAL_PROJECT_KEY` and `CLOUD_IDENTIFIER` (default `gcp-eu`), plus any variable of FR-084 that differs per project;
  - **Netlify**: a `netlify.toml` with the build command, publish directory, a rewrite of every path to the entry page, an `X-Robots-Tag: noindex` header, and the production URL as the application URL.

  In both, the app MUST read project data only through the Merchant Center API with the signed-in user's permissions, MUST NOT sit behind any shared-password gate, and MUST take Application ID and URLs from environment variables, never literals. Netlify is also the way to preview and develop; Connect is the production path. A deploy MUST NOT require changing code, only environment variables.
- **FR-082**: Registration, installation for the project, and team permissions are manual steps performed in the Merchant Center and MUST be documented in a setup checklist naming each step and its owner (Organization → Custom Applications → add "Looks", entry-point path, scopes, menu label in de/en; after first deploy set URL, set state Ready, install for the project; assign Manage/View to teams). The checklist MUST have one section per deploy path: for Netlify, the site URL is the Application URL; for Connect, the checklist covers creating the connector deployment, its variables (FR-081), and the application URL that Connect provides. Switching between the two paths MUST be described as changing the Application URL in the registration.
- **FR-083**: Seeding or demo-data tooling is not part of this feature.
- **FR-084**: Everything that differs between projects MUST be a developer-set configuration value, defined in one place and never scattered as literals through the code. The values are:
  - **Variant attributes**: the names of the product-variant attributes that tell the variants of a product apart (for example search colour, finish colour and size), in display order; a variant is shown as the values of these attributes joined with " / " (text, number, enum, localized or set values), used for the variant choice, the preview dropdown and per-variant stock;
  - **Colour attributes**: the name of the localized colour-name attribute and the name of the fallback colour attribute;
  - **Shop origin**: where look photos are loaded from and "Im Shop ansehen" points to;
  - **Price country** (optional): the country whose price is used when a product has several country prices with different amounts in one currency (FR-008);
  - **Application ID** and **production URL** (FR-081).
- **FR-085**: The configuration MUST be designed so it can move to environment variables (`.env`, with a committed example file listing every variable, a description and a default) without changing any code that reads it: all reads go through one configuration module. Until then the module holds the defaults. Missing or empty required values MUST fail loudly at start-up or build time with a message naming the variable, not silently at first use. A product that lacks the configured size attribute is shown as "Einheitsgröße" (one size).

### Key Entities *(include if feature involves data)*

- **Look**: a curated set of at least 2 products. Attributes: look key, name per project language, ordered pieces, set price per project currency, optional look photo (path, width, height), optional switch-off time. It is the pairing of a *look definition* and a *set-price discount*; neither alone is a complete look.
- **Look definition**: the key-value document in the container `look`, key `look-<lookKey>`, value `{ componentProductIds[], setPrice{<currency>: cent amount}, image?{path,width,height}, endedAt? (ISO time) }`. Written by the app; read by the storefront.
- **Set-price discount**: the Cart Discount with the same key. It decides what the shopper pays and whether the look is live (`isActive`). Its name carries the look name (FR-043).
- **Piece**: a product as the app shows it: image, localized name, colour, list prices per currency, sizes with default-inventory stock, sold-out-everywhere flag.
- **Past look sales**: per look, derived from orders: orders, sets sold, revenue per currency (see FR-022).
- **Completeness**: complete / missing discount / missing definition / inconsistent (the two name different pieces).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A merchandiser can create, review and switch on a new look without a developer or a deployment, and the look is visible in the shop (product-page set block and a cart holding one unit of each piece at the set price) immediately after switching on.
- **SC-002**: A trained merchandiser completes the four-step creation of a three-piece look in under 3 minutes, from clicking "Neuer Look" to "Look speichern".
- **SC-003**: Switching a look off or on takes one interaction and is confirmed on screen within 2 seconds on a normal connection; the next cart recalculation reflects it.
- **SC-004**: The looks list for a project with 1,000 looks renders its first page within 1 second and is fully populated within 3 seconds on a normal connection; changing page, page size, sort or filter responds within 1 second.
- **SC-005**: 100% of looks created by the app are valid under the shop's rules: every one is complete (definition and discount, same key, same pieces), has 2–5 pieces, and a set price below the live sum in every project currency. No save leaves a live half-look at any point, including when any single write fails.
- **SC-006**: In a test with a deliberately failed second or third write, retrying never creates a duplicate discount or definition (0 duplicates over all failure points).
- **SC-007**: In a project with one, two or three currencies, set prices, sums, savings and revenue appear for exactly those currencies; no currency code is hard-coded (verified automatically).
- **SC-008**: No write control is operable by a View-only user (0 enabled write actions), and no write control is hidden from them without an explanation.
- **SC-009**: Every UI string exists in German and English with identical key sets and placeholders; 0 raw string literals in rendered UI; verified automatically.
- **SC-010**: The sales figures on a past-look card match a manual count of qualifying orders in a test project exactly (sets, orders, revenue).
- **SC-011**: In a 1440 px window, no table column header wraps in either language, and five piece images fit without shrinking.

## Assumptions

- **Users and permissions**: Users are merchandisers and team leads who already have Merchant Center access; teams get View or Manage via the Organization's custom-application settings.
- **Platform**: The shop reads looks as described in the data contract (product-page set block, cart summary line) and applies the set price from the discount. Changing the storefront is out of scope; this app only writes the data it reads. Because the naming changes from `sim-look`/`sim-demo-look-` to `look`/`look-`, any shop reader of the old names must be pointed at the new ones; that work is outside this spec.
- **Naming**: container `look`, key prefix `look-` (the decision was "just `look-`"; the container name follows the same rule).
- **Language**: German is the reference UI language, English the second; profile language drives UI labels, data locale drives content. Look names are entered in the **project's languages** (read from the project settings, like the currencies); one name is enough, readers fall back data locale, de, en, first.
- **No brands**: looks are not tied to a brand. Product search covers the whole catalog; there is no brand filter, badge, brand-pure rule or brand-themed preview. Brands can be reintroduced later as a separate feature.
- **Currencies**: from the project settings (FR-007). Percent saving is computed on the first currency.
- **Stock**: sizes and stock come from the default inventory (inventory entries without a supply channel); no stock channel is configured. A variant has a size only if it has such an entry; when no variant of a product has one, all variants are listed as sold out so the sold-out warning still shows.
- **Configuration**: the size attribute, colour attributes and shop origin are developer-set (FR-084), initially in one configuration module and later in `.env` (FR-085). Default size attribute name: `size`; default colour attributes: `color-name` and `color`, as in the source catalog. There is no admin UI for them; the person setting up the app is a developer.
- **Seeding**: no seed, demo-data or reset tooling is built or maintained. Looks exist only through the app.
- **Resolved source conflicts**:
  - Column widths: the later spec decision wins over the design board (Ersparnis 100 px, Status 120 px, Aktiv 88 px) because "Aktiv" broke across lines at 60 px. The Marke column is removed with brands.
  - Piece count: at least 2, no upper limit (earlier versions allowed 2 to 5, and 2 or 3). The list strip shows the first five piece images and counts the rest (+N).
  - Look and product names follow the data locale (not the UI language).
  - Design placeholder text (e.g. the step 2 error "Aktuell sind 6 gewählt") is an example; the built wording wins.
  - The detail's stock text in the design ("Größen … verfügbar") is a summary; the real app shows per-size stock from inventory.
- **Not in scope**: pagination of "Frühere Looks"; an approval workflow (the inactive state is the review place); deleting looks; editing the pieces of an existing look; analytics beyond the "Frühere Looks" figures; the storefront; seeding; brands; drift snapshot tooling.
- **Platform limits relied on**: at most 100 active, store-independent, code-less Cart Discounts per project; a Cart Discount `sortOrder` must be unique and must not end in a zero; Custom Application entry-point paths are unique within a region.
- **Developer setup**: a developer sets these values per project before first deploy; the setup checklist (FR-082) lists them for both deploy paths.
- **Two deploy paths**: Netlify and Connect are both required (FR-081). Connect is production; Netlify is development, preview and fallback. Both serve the same bundle, so there is no code branch per host.
- **Dependencies**: Merchant Center application shell with Nimbus support (React 19); Connect (`connect.yaml`) and Netlify (`netlify.toml`) for hosting; the Merchant Center API for project settings, products, custom objects, cart discounts, orders; Product Search; static hosting; a manual registration by an organization admin.
- **Design reference**: Visual detail (spacing, radius, tokens, component choice) lives in `Looks.dc.html` (boards 1a–3b) and `HANDOFF.md`, minus everything brand-related; this spec states behaviour.
