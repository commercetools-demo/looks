# Contributing

Looks is reference code and **unsupported** (see [`SUPPORT.md`](./SUPPORT.md)). Contributions are welcome but may not be reviewed quickly or at all.

- Keep a change small and say why it is needed. Open an issue first for anything larger.
- Run everything from `mc-looks-app/`: `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` must pass (CI runs the same).
- Follow the conventions in [`CLAUDE.md`](./CLAUDE.md): `FC` components with a `<Name>Props` type, every UI text through react-intl in German and English (`messages.ts` plus `messages.en.json`, then `npm run build-i18n`), controls disabled and never hidden without Manage permission.
- Changes to behaviour update `specs/001-looks-app/` (spec, data model, contracts) and `FEATURES.md`.
- New source files carry the SPDX header used in the existing files.
- By contributing you agree that your contribution is licensed under the MIT license of this repository.
