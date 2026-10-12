# Catalog and Ecommerce migration

Status: later. Catalog is still the `product` preset, not an app.

`src/features/catalog` and `src/features/products` become an Ecommerce app. The commerce block category in `src/features/builder/registry/definitions.ts` becomes an extension that requires that app. There is no Order, Cart, or Shop model yet, so this plan does not invent checkout.

## Move

- Promote the `product` preset to an app once it needs its own installer lifecycle.
- Keep product rows in the existing tables. Do not drop them when the extension is deactivated.
- The ecommerce-blocks extension declares `requiredPackages: ["ecommerce"]` and contributes the commerce block types.

## Guards

- Saved product blocks keep rendering from stored page JSON when the extension is inactive.
- The editor may mark those blocks inactive. It does not replace them with an unavailable error.
- The picker hides commerce blocks only while the extension is inactive.
- Admin product links disappear in the same step that product admin routes start returning 404.
