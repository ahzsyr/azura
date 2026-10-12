# Theme package migration

Status: later. The theme engine in `src/features/theme/` stays in Core.

Individual presets from the theme catalog become installable theme packages. A theme ZIP carries tokens and templates, not a second theme engine.

## Move

- Package kind `theme`.
- Contributions are presentation tokens and template ids, plus optional admin links.
- Activating a theme does not deactivate Core, apps, or extensions.
- Import of a theme whose files are only tokens can apply without a rebuild. A theme that adds new React components stays pending until that code is deployed.

## Guards

- Switching themes does not rewrite page block JSON.
- A failed package-ledger read keeps the current published theme.
