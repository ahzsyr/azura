# Catalog and Ecommerce migration

Status: later. Catalog is still the `product` preset, not an app.

`src/features/catalog` and `src/features/products` become an Ecommerce app. The commerce block category in `src/features/builder/registry/definitions.ts` becomes an extension that requires that app. There is no Order, Cart, or Shop model yet, so this plan does not invent checkout.

## Move

- Promote the `product` preset to an app once it needs its own installer lifecycle.
- Keep product rows in the existing tables. Do not drop them when the extension is deactivated.
- The ecommerce-blocks extension declares `requiredPackages: ["ecommerce"]` and contributes the commerce block types.

## Guards

- Product block JSON is retained when the extension is inactive.
- The editor may mark those blocks Inactive. The public site still renders them from stored JSON until a later milestone gates the renderer on availability — do not claim public “unavailable” today.
- The picker hides commerce blocks only while the extension is inactive.
- Admin product links disappear in the same step that product admin routes start returning 404.
- Modules Manager is not a plugin host and does not hot-load executable ZIP code.
