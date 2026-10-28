# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## Layout

The repository root holds `connect.yaml`, `netlify.toml`, `.env.example`, `specs/` (spec-kit) and `docs/`. The application is the **`mc-looks-app/`** subdirectory, its own npm project (no workspaces): Connect builds from inside the folder named in `connect.yaml`. **Run every command below from inside `mc-looks-app/`.**

## Commands

```shell
npm install                 # postinstall generates the Nimbus theme types
npm start                   # mc-scripts dev server
npm run build               # production build
npm test                    # jest (jest.test.config.js)
npm test -- path/to/file.spec.tsx
npm run lint                # eslint, prettier rules included
npm run format              # prettier --write
npm run typecheck           # tsc --noEmit
npm run build-i18n          # extract messages to core.json/de.json, merge messages.en.json into en.json
npm run generate-types:ctp  # interactive browser login, then graphql-codegen; do not run headless
```

CI (`.github/workflows/ci.yml`) runs build, lint, typecheck and test on PRs into `main`.

## Architecture

- **Merchant Center custom application** on Nimbus (`@commercetools/nimbus`), React 19, deployed via Connect (production) or Netlify (development/preview) from the same bundle. Entry point path `looks`.
- **Data** goes through the Merchant Center GraphQL proxy (`ctp` target). `src/domain/look-api.ts` is the port the domain flows run against; `src/hooks/use-looks-connector/look-api.ts` implements it with the shell's Apollo client. Reads that feed a write bypass the cache so versions are fresh.
- **`src/domain/`** is pure logic with unit specs: keys, rank allocation (0.7 to 0.799, never ending in a zero), prices per project currency, validation, discount drafts and update actions, rows and completeness, sorting and paging, past-look sales, and the write flows (`save-look.ts`: discount inactive, then object, then optional activation, resumable; `look-writes.ts`: switch, reprice, photo, complete).
- **Configuration** (the variant attributes) is read only in `src/config.ts`; `config.spec.ts` guards that no other file reads `process.env`, hard-codes the default attribute names or contains a currency code.
- **Rules from the constitution** (`.specify/memory/constitution.md`): View/Manage with controls disabled, never hidden; every UI string through react-intl in German and English (`messages.ts` next to the component, English in `messages.en.json`, run `npm run build-i18n`); updates send the current version and make no call when nothing changed.

- **Components** are arrow functions typed with `FC`, props in a `type <Name>Props` above them: `const NewLookButton: FC<NewLookButtonProps> = ({ onPress }) => { ... };` (define a component before the one that uses it; default exports as `export default Name;` after the definition).

## Testing

- Jest preset `@commercetools-frontend/jest-preset-mc-app/typescript` plus Nimbus fixes: `jest.setup.nimbus.js` (browser API polyfills) and `jest.resolver.js` (Nimbus CJS packaging bug).
- Component specs use `renderLooks` with an in-memory `LookApi` (`src/test-utils/fake-look-api.ts`: versions, conflicts, `failNext` for failure injection). The GraphQL layer is covered by `msw` specs of `createLookApi`.
- Nimbus `Select` has no `isReadOnly`, and `isDisabled` on `Select.Root` inside a `FormField` is overridden by the field's state: put `isDisabled` on the `FormField` root and assert `disabled`.
- Nimbus injects a theme-bootstrapping `<script>` into the render container, so assert through `screen`, not `container.textContent`.

## Environment notes

- `.env` is tracked (non-secret defaults); `.env.local` is gitignored and wins.
- If npm fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` behind a TLS-inspecting proxy, run npm with `NODE_OPTIONS=--use-system-ca` (keeps verification on). The registry may refuse very recent releases; pin the offending package in `overrides`.
- `tsconfig` `typeRoots` includes `@types-extensions`; TypeScript loads every folder in a type root, so a stray empty folder there aborts `tsc`.
