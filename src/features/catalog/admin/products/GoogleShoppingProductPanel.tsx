"use client";

import { useMemo } from "react";
import { getSiteUrl } from "@/config/site";
import type { Product } from "@/features/products/types";
import { resolveGoogleShoppingEligibility } from "@/features/feeds/google-shopping-eligibility";
import { labelForGoogleShoppingIssue } from "@/features/feeds/google-shopping-issues";
import { resolveGoogleShoppingMarket } from "@/features/feeds/google-shopping-market";
import type { GoogleShoppingEligibilityResult } from "@/features/feeds/google-shopping-feed.types";

type Props = {
  product: Product & { slug?: string; status?: string };
  onPatch: (patch: Partial<Product>) => void;
};

/**
 * Product Manager Google Shopping panel.
 * Displays resolver status only — does not re-implement eligibility rules.
 */
export function GoogleShoppingProductPanel({ product, onPatch }: Props) {
  const result: GoogleShoppingEligibilityResult = useMemo(() => {
    const market = resolveGoogleShoppingMarket(
      {
        country: "AE",
        language: "en",
        defaultCurrency: "AED",
        destination: "shopping_ads",
        validationMode: "standard",
        shippingCountry: "AE",
        shippingService: "Standard",
        shippingPrice: 0,
      },
      {
        siteOrigin: getSiteUrl().replace(/\/$/, "") || "https://brt-me.com",
        localePrefix: "en",
      },
    );
    return resolveGoogleShoppingEligibility(
      {
        ...product,
        slug: product.slug || product.id,
        publishStatus: product.status ?? "published",
      },
      market,
    );
  }, [product]);

  const statusLabel =
    result.status === "ready"
      ? "READY"
      : result.status === "warning"
        ? "WARNING"
        : "NOT READY";

  const statusClass =
    result.status === "ready"
      ? "text-emerald-700 dark:text-emerald-300"
      : result.status === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : "text-destructive";

  return (
    <fieldset className="apm-fieldset">
      <legend className="apm-fieldset__legend">Google Shopping</legend>
      <p className="apm-fieldset__hint">
        Status comes from the same eligibility resolver used by{" "}
        <code>/feeds/google-shopping.xml</code>. AZURA reports what it would send; Google
        decides approval.
      </p>

      <div className="rounded-md border p-3 space-y-2 text-sm mb-3">
        <div className={`font-semibold ${statusClass}`}>{statusLabel}</div>
        {result.status === "ready" ? (
          <div className="text-muted-foreground space-y-0.5">
            <div>Feed: Included</div>
            <div>Destination: Shopping Ads</div>
            <div>Market: AE / English / AED</div>
          </div>
        ) : null}
        {result.issues.length > 0 ? (
          <div>
            <div className="font-medium">Reasons:</div>
            <ul className="list-disc pl-5">
              {result.issues.map((code) => (
                <li key={code}>{labelForGoogleShoppingIssue(code)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {result.warnings.length > 0 ? (
          <div>
            <div className="font-medium">Warnings:</div>
            <ul className="list-disc pl-5">
              {result.warnings.map((code) => (
                <li key={code}>{labelForGoogleShoppingIssue(code)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <label className="pm-inline-check">
        <input
          type="checkbox"
          checked={Boolean(product.excludeFromGoogleShopping)}
          onChange={(e) =>
            onPatch({
              excludeFromGoogleShopping: e.target.checked ? true : undefined,
            })
          }
        />
        Exclude from Google Shopping feed
      </label>

      <div className="pm-grid mt-3">
        <label>
          GTIN / EAN
          <input
            value={product.ean || ""}
            onChange={(e) => onPatch({ ean: e.target.value || undefined })}
            placeholder="4752224001234"
          />
        </label>
        <label>
          MPN
          <input
            value={product.mpn || product.manufacturer_part_number || ""}
            onChange={(e) => onPatch({ mpn: e.target.value || undefined })}
            placeholder="RB5009UG+S+IN"
          />
        </label>
        <label>
          Brand
          <input
            value={product.brand || ""}
            onChange={(e) => onPatch({ brand: e.target.value || undefined })}
          />
        </label>
        <label>
          Google product category
          <input
            value={product.googleProductCategory || ""}
            onChange={(e) =>
              onPatch({ googleProductCategory: e.target.value || undefined })
            }
            placeholder="278 or Networking &gt; …"
          />
        </label>
        <label className="pm-span-2">
          Google title override
          <input
            value={product.googleTitle || ""}
            onChange={(e) => onPatch({ googleTitle: e.target.value || undefined })}
            placeholder="Optional Shopping title"
          />
        </label>
        <label className="pm-span-2">
          Google description override
          <textarea
            value={product.googleDescription || ""}
            onChange={(e) =>
              onPatch({ googleDescription: e.target.value || undefined })
            }
            placeholder="Optional Shopping description"
            rows={3}
          />
        </label>
        <label>
          Custom label 0
          <input
            value={product.customLabel0 || ""}
            onChange={(e) => onPatch({ customLabel0: e.target.value || undefined })}
          />
        </label>
      </div>
    </fieldset>
  );
}
