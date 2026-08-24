import Link from "next/link";

type Props = {
  sitemapUrl?: string;
  compact?: boolean;
};

export function StructuredDataGoogleInstructions({ sitemapUrl, compact = false }: Props) {
  const sitemap = sitemapUrl ?? "/sitemap.xml";

  return (
    <div className={compact ? "space-y-3 text-sm" : "rounded-xl border bg-muted/20 p-4 space-y-4 text-sm"}>
      {!compact ? (
        <div>
          <h2 className="font-semibold">Submit sitemap &amp; structured data to Google</h2>
          <p className="mt-1 text-muted-foreground">
            Valid JSON-LD in admin does not notify Google automatically. Complete these steps after
            fixing missing fields below.
          </p>
        </div>
      ) : (
        <p className="font-medium">Google Search Console checklist</p>
      )}

      <ol className="list-decimal list-inside space-y-2 text-muted-foreground marker:text-foreground">
        <li>
          Connect and verify your production domain in{" "}
          <Link href="/admin/seo/google" className="text-primary hover:underline">
            SEO → Google
          </Link>
          .
        </li>
        <li>
          Review the live sitemap at{" "}
          <a href={sitemap} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            {sitemap}
          </a>{" "}
          and exclusions in{" "}
          <Link href="/admin/seo/sitemap" className="text-primary hover:underline">
            SEO → Sitemap
          </Link>
          .
        </li>
        <li>
          In Google Search Console → <strong>Sitemaps</strong>, submit exactly{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{sitemap}</code> (include{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">https://</code> and your domain).
        </li>
        <li>
          Fix any <strong>Missing</strong> entity fields in the audit below, save in admin, then run{" "}
          <strong>Public HTML audit</strong> until generated graph matches published HTML.
        </li>
        <li>
          Test live URLs with{" "}
          <a
            href="https://search.google.com/test/rich-results"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Google Rich Results Test
          </a>{" "}
          — home, about, contact, and a product page.
        </li>
        <li>
          In GSC → <strong>URL Inspection</strong>, request indexing for those same URLs after deploy.
        </li>
        <li>
          Monitor GSC → <strong>Enhancements → Structured data</strong> for errors (allow several days
          after submission).
        </li>
      </ol>

      <p className="text-xs text-muted-foreground">
        Sitelinks, knowledge panels, and rich-result appearance are Google-controlled — structured data
        improves eligibility but does not guarantee display.
      </p>
    </div>
  );
}
