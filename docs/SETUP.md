# Setting up Looks

Looks is a Merchant Center custom application. Registering it, installing it and giving teams access are manual steps in the Merchant Center. The app is built once and can be hosted on **Connect** (production) or **Netlify** (development, preview); both serve the same bundle and only environment variables differ.

## 1. Developer configuration (once per project)

All per-project values are read in one module, `mc-looks-app/src/config.ts`, with the defaults below. They will move to environment variables without any code change (see `.env.example`).

| Value | Variable | Default | Meaning |
|---|---|---|---|
| Variant attributes | `VARIANT_ATTRIBUTES` | `size` | Comma-separated product-variant attributes that tell the variants of a product apart, in display order, e.g. `searchColor,finishColor,size`. A variant is shown as the values joined with " / " (text, number, enum, localized or set values); variants without any value are listed by SKU, and a product with a single such variant is "one size" |
| Colour name attribute | `COLOR_NAME_ATTRIBUTE` | `color-name` | Localized colour name |
| Colour attribute | `COLOR_ATTRIBUTE` | `color` | Fallback colour (enum or localized enum) |
| Shop origin | `SHOP_ORIGIN` | empty | The shop address "Im Shop ansehen" points to. Empty disables the link |

Each look gets one Discount Group (`look-<key>`) that holds its country Cart Discounts; the app assumes the `view_cart_discounts` and `manage_cart_discounts` scopes also cover Discount Groups (not yet confirmed against a live project, task T021).

Product stock is read from the default inventory (inventory entries without a supply channel). Currencies and the languages of the look name are the project's currencies and languages (read from the project settings, hence the `view_project_settings` scope).

Deployment variables: `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH` (default `looks`), `APPLICATION_URL`, `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER` (`gcp-eu`, `gcp-us`, `aws-eu`, `aws-us`).

## 2. Register the application (Organization admin)

1. Merchant Center, profile icon, "Manage organizations & teams", the Organization, tab "Custom Applications", "Configure Custom Applications". Verify the contact email once.
2. "Add a Custom Application": name "Looks", entry point URI path `looks`, main menu label "Looks" (de and en), and these OAuth scopes:
   - View: `view_products`, `view_key_value_documents`, `view_cart_discounts`, `view_orders`, `view_project_settings`
   - Manage: `manage_key_value_documents`, `manage_cart_discounts`

   Use a placeholder Application URL until the first deploy. Note the Application ID (it is the `CUSTOM_APPLICATION_ID` variable).
3. After the first deploy: set the Application URL to the URL of the chosen host, move the state to "Ready", install it for the project.
4. Teams: give the merchandising teams **Manage** (create, switch, reprice) and others **View**. A user with Manage can edit every look; there is no fencing by brand or store.

Switching between the two hosting paths changes only the Application URL in the registration and the environment variables.

## 3a. Deploy on Connect (production)

1. The repository root holds `connect.yaml` with one application `mc-looks-app` of type `merchant-center-custom-application`; the folder `mc-looks-app/` matches that name.
2. Create the Connect deployment for the repository with the standard configuration `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER`. Connect provides `APPLICATION_URL` itself.
3. Use the URL Connect gives the application as the Application URL (step 2.3).

## 3b. Deploy on Netlify (development, preview)

1. New site from the repository; `netlify.toml` sets base `mc-looks-app`, build `npm run build`, publish `public`, Node 22, a rewrite of every path to the entry page and the header `X-Robots-Tag: noindex`.
2. Set the environment variables `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `APPLICATION_URL` (the Netlify site URL), `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER`.
3. Do not put the site behind a password gate: the Merchant Center loads it through its own proxy. Opened directly, the site shows only the bundle and reads no project data.

## 4. Local development

```shell
cd mc-looks-app
npm install            # also generates the Nimbus theme types
cp ../.env.example .env.local   # set INITIAL_PROJECT_KEY, CLOUD_IDENTIFIER, ...
npm start              # dev server, opens the Merchant Center
```

`npm run generate-types:ctp` (interactive browser login, writes `schemas/ctp.json` and the generated GraphQL types) must be run by a person, not in a headless job.

## 5. Permissions check

A user with neither View nor Manage has no "Looks" menu entry, and a direct URL shows the Merchant Center's no-permission page. Record the result of this check for your project here when you run it.
