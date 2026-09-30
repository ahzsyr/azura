# Marketing Campaign Spec

## Primary rule

Internal `MarketingCampaign` is the business-level master campaign.
External Meta / Google Ads / LinkedIn campaigns are execution objects linked via `MarketingCampaignProviderBinding`.

## Models

- `MarketingCampaign` — no mandatory providerId / adAccountId
- `MarketingCampaignProviderBinding` — per-platform link
- `MarketingExternalCampaign` → `MarketingAdGroup` → `MarketingAd` → `MarketingCreative`
- `MarketingTrackingUrl` — UTM URLs keyed to internal campaign

## Canonical ad group mapping

| Provider | Maps to MarketingAdGroup |
|----------|--------------------------|
| Meta Ad Set | yes |
| Google Ad Group | yes |
| LinkedIn Campaign | yes |
