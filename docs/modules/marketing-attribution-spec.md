# Marketing Attribution Spec

## Source of truth

Raw `MarketingTouch` rows. First-touch / last-touch / session attribution are computed, never stored as JSON blobs on the visitor.

## Identity boundary

Anonymous Visitor → Sessions → Touches → Events  
→ Form Submission / Lead Creation (identity boundary)  
→ Lead Identity → Attributed Conversion

## Click IDs

Stored as `clickIdType` + `clickId` (GCLID | FBCLID | MSCLKID | LI_FAT_ID | OTHER).

## Events

Internal `MarketingEvent` is the source of truth. GA4 / Meta Pixel / CAPI / Google Ads / LinkedIn are downstream destinations.

Idempotency: `idempotencyKey` unique on events and conversions. Dual timestamps: `clientOccurredAt`, `serverReceivedAt`.
