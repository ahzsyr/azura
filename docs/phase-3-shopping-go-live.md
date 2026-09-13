# Phase 3 — Shopping go-live runbook (operator)

AZURA Phases 1–2 ship the feed. This document is the **operator-only** launch path.
No Content API. Excel is never the production GMC feed.

## Responsibility split

| Layer | Question | Source of truth |
|---|---|---|
| **AZURA** | What should we send? | Feed Health + eligibility diagnostics |
| **Google Merchant Center** | What did Google accept? | GMC Diagnostics / Approved |
| **Google Ads** | What can enter an ad auction? | Campaign eligibility / impressions |

**Feed Health: Green does not mean Google Shopping approved.**
Google approval—not AZURA diagnostics—is the final product eligibility gate before ads launch.

---

## Defaults (locked)

- Verified store URL (`storeUrl`): `https://brt-me.com` — **must match** GMC Business info online store (exact host; apex ≠ `www`)
- Feed URL: `https://brt-me.com/feeds/google-shopping.xml` (or your production origin + `/feeds/google-shopping.xml`)
- Market: **AE** / **en** / **AED** / Shopping ads
- Campaign: **Performance Max** with product feed (Shopping OK if preferred)
- `validationMode`: **`standard`** for the first production cycle — do **not** switch to `strict` at launch
- Production source: **live XML only**

### Fix: Mismatched online store URL

Google requires every product `g:link` host to match the verified online store in Merchant Center.

**BRT host rule (locked):** use apex **`https://brt-me.com`** only.

- Live product pages: `https://brt-me.com/...` → **200** (final URL)
- `https://www.brt-me.com/...` → **308** → apex

Do **not** rewrite feed `g:link` to `www` — that creates a cross-host redirect Google also rejects. If GMC claimed `www.brt-me.com`, change Business info to apex instead.

1. GMC → Business info → Website = **`https://brt-me.com`** (no `www`) → claim/verify.
2. Admin → Merchant Center → **Verified store URL** = `https://brt-me.com`; save.
3. Refresh diagnostics → **Store domain (g:link)** and **Final host (not www)** green.
4. Remove any Excel / supplemental production feeds so only scheduled fetch of the live XML remains.
5. Re-fetch the feed in GMC; wait 24–48h+ for UAE/SA to clear.

### Fix: Inconsistent currencies

Product `g:price` and shipping must use the same currency. The feed converts catalog prices into the market default (**AED**) using site FX rates so they match `g:shipping` (`0.00 AED`). After deploy, re-fetch the XML in GMC.

---

## Initial campaign product set (MVP)

Do **not** use catalog-wide approval % as the launch gate.

1. In **Admin → SEO → Google → Merchant Center**, open Configuration.
2. Fill **Initial campaign product set** with one product id, slug, or MPN per line (the SKUs you will advertise first).
3. Save configuration.
4. In diagnostics / public XML, confirm each listed product appears (Ready or Warning, not Excluded).

### MVP set template

```
# One id, slug, or MPN per line. Lines starting with # are ignored.
# Example:
# sku-rb5009
# mikrotik-rb5009
# RB5009UG+S+IN
```

Copy your final list into the Merchant Center config field and keep a copy with the ads brief.

Launch gate: **every product in this set is Approved in GMC** before creating PMax.

---

## Go-live checklist

### AZURA

- [ ] Merchant ID + production Feed URL saved
- [ ] **Verified store URL** = GMC Business info online store (e.g. `https://brt-me.com`)
- [ ] Country AE, language en, currency AED, destination Shopping ads
- [ ] Feed shipping: AE / Standard / explicit price (often `0`)
- [ ] `validationMode` = **standard**
- [ ] Initial campaign product set filled
- [ ] Production feed HTTP 200
- [ ] XML valid; Feed Health shows items, HTTPS, **store domain**, AED, shipping
- [ ] Feed contains intended MVP products
- [ ] Quote-only / external-purchase products excluded (not `out of stock`)
- [ ] No unexpected exclusions for the MVP set
- [ ] GTIN coverage for MVP set understood (warnings OK in standard)

### GMC ([merchants.google.com](https://merchants.google.com/))

Tick the matching checkbox in AZURA **only after** each Google action is done.

- [ ] Website claimed / verified (`https://brt-me.com`)
- [ ] AE / English configured
- [ ] Account shipping configured (UAE)
- [ ] Returns configured
- [ ] Scheduled fetch of production XML successful (**not** Excel upload)
- [ ] Shopping Ads destination enabled
- [ ] **Every MVP product is Approved** for Shopping ads

### Google Ads

- [ ] Merchant Center linked
- [ ] Billing active
- [ ] PMax / Shopping created
- [ ] UAE targeting, AED
- [ ] Campaign enabled
- [ ] MVP products eligible in Ads

---

## Step-by-step

### 0 — MVP + AZURA pre-flight

1. Set **Verified store URL** to `https://brt-me.com` (exact match to GMC Business info).
2. Define MVP product set; paste into Merchant Center config; save Merchant ID + feed URL.
3. Admin → SEO → Google → Merchant Center → Refresh diagnostics (Store domain green).
4. Open the public feed logged out; spot-check MVP `g:link` hosts.
5. Fix unexpected Excluded products for the MVP set in Product Manager.
6. Leave validation mode on **standard**.

### 1 — GMC account

1. Align business info with the live site.
2. Claim and verify `https://brt-me.com` (same origin as AZURA `storeUrl`).
3. Configure account-level UAE shipping + returns.
4. Primary country UAE, language English.
5. Tick AZURA checklist items that match completed actions.

### 2 — Register scheduled feed

1. Products → Feeds → Add feed → **Scheduled fetch**.
2. URL = production `/feeds/google-shopping.xml`.
3. Enable **Shopping ads**.
4. Confirm successful fetch. Do **not** also upload Excel (remove any Excel/supplemental production sources that still carry foreign landing URLs).

### 3 — Approve the MVP set

1. GMC → Diagnostics for MVP products.
2. Fix issues in AZURA Product Manager; wait for re-fetch.
3. Gate: each MVP product **Approved** (catalog % is informational only).

### 4 — Ads launch

1. Link GMC ↔ Google Ads; billing on.
2. Create PMax (or Shopping): UAE, AED, Merchant attached, Enabled.
3. Confirm MVP products eligible. Only then treat Shopping as live.

### 5 — First production cycle

Keep **`validationMode = standard`**. After 1–2 weeks compare:

1. AZURA warnings  
2. GMC diagnostics  
3. Approved products  
4. Products with impressions  

Only then evaluate `strict` (exclude missing GTIN). Re-check AZURA diagnostics after large imports. Weekly GMC Diagnostics for the first month.

---

## AZURA checklist keys (tick only after Google)

| Google action | Config key |
|---|---|
| Website verified | `checklistWebsiteVerified` |
| UAE shipping in GMC | `checklistGmcShipping` |
| Returns in GMC | `checklistReturns` |
| Shopping Ads destination | `checklistShoppingAds` |
| Scheduled fetch registered | `checklistFeedRegistered` |
| MVP set Approved | `checklistMvpApproved` |
| Ads linked + campaign live | `checklistAdsLinked` |

These flags are operator memory only; they never change the XML.

---

## Done when

- MVP set defined and present in production XML  
- GMC scheduled fetch OK; Shopping ads on  
- All MVP products Approved in GMC  
- Ads linked; PMax/Shopping Enabled; MVP eligible  
- AZURA checklist matches completed Google actions only  
- First cycle on **standard**; strict deferred  
- Team can state: send → accept → auction  

`Product DB → AZURA XML → GMC scheduled fetch → Google approval → GMC/Ads link → PMax → Shopping ads`
