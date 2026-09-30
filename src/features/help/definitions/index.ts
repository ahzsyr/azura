import type { HelpEntityDefinition } from "@/features/help/inventory/types";
import type {
  HelpInventoryBundle,
  HelpInventoryPage,
  HelpPageKind,
} from "@/features/help/inventory/types";
import { helpInventory } from "@/features/help/inventory";

function kindCopy(kind: HelpPageKind, label: string): Pick<
  HelpEntityDefinition,
  "purpose" | "whenToUse" | "prerequisites" | "configurationSteps" | "bestPractices" | "mistakes" | "warnings"
> {
  switch (kind) {
    case "dashboard":
      return {
        purpose: `Review status and take recommended actions for ${label}.`,
        whenToUse: [
          `You need a quick health check of ${label}`,
          "You want to jump to related configuration pages",
          "You are monitoring recent activity or scores",
        ],
        prerequisites: ["Administrator access", "Relevant content or integrations configured"],
        configurationSteps: [
          `Open ${label} from the admin sidebar`,
          "Review the summary metrics and status indicators",
          "Follow recommended actions or quick links to fix issues",
          "Return here after changes to confirm improvements",
        ],
        bestPractices: [
          "Check this dashboard after major content or settings changes",
          "Treat red/warning indicators as actionable work items",
        ],
        mistakes: ["Ignoring warning indicators until launch day"],
      };
    case "table":
      return {
        purpose: `Find, filter, and act on records related to ${label}.`,
        whenToUse: [
          "You need to locate a specific record",
          "You want to review recent activity",
          "You need to take row-level actions",
        ],
        prerequisites: ["Administrator access", "Records have been created or collected"],
        configurationSteps: [
          `Open ${label}`,
          "Use search and filters to narrow results",
          "Open a row for details or run an allowed action",
          "Confirm the change and refresh the list if needed",
        ],
        bestPractices: ["Use filters before bulk actions", "Verify the correct row before destructive actions"],
        mistakes: ["Acting on filtered results without confirming filters are correct"],
        warnings: ["Bulk or delete actions can affect many records at once."],
      };
    case "informational":
      return {
        purpose: `Understand reports and guidance shown on ${label}.`,
        whenToUse: [
          "You need to interpret audit or rule results",
          "You are deciding what to fix next",
        ],
        prerequisites: ["Administrator access", "Source data or audits have been generated"],
        configurationSteps: [
          `Open ${label}`,
          "Read the listed findings or rules",
          "Follow linked pages to apply fixes",
          "Re-check this page after changes",
        ],
        bestPractices: ["Prioritize high-severity findings first", "Document why you accept or defer an item"],
        mistakes: ["Treating informational lists as already applied configuration"],
      };
    default:
      return {
        purpose: `Configure and manage ${label} for your website.`,
        whenToUse: [
          `You need to set up or update ${label}`,
          "You are preparing for launch or a content change",
        ],
        prerequisites: ["Administrator access", "Any dependent modules already enabled for your profile"],
        configurationSteps: [
          `Open ${label} from the admin sidebar`,
          "Review the current settings or records",
          "Make the required changes",
          "Save, then preview or publish when available",
          "Verify the public site reflects the update",
        ],
        bestPractices: [
          "Save frequently while editing",
          "Preview before publishing when the action is available",
          "Use the locale switcher when editing translated fields",
        ],
        mistakes: [
          "Leaving draft changes unpublished when they should be live",
          "Editing the wrong locale by mistake",
        ],
      };
  }
}

const WORKFLOWS_BY_NAV: Record<string, string[]> = {
  dashboard: ["workflow-first-setup"],
  pages: ["workflow-create-page"],
  products: ["workflow-add-products"],
  theme: ["workflow-customize-design"],
  studio: ["workflow-customize-design"],
  "form-templates": ["workflow-configure-forms"],
  languages: ["workflow-enable-languages"],
  "seo-overview": ["workflow-seo-setup"],
  "seo-metadata": ["workflow-seo-setup"],
  "seo-tasks": ["workflow-seo-setup"],
  "seo-audit": ["workflow-seo-setup"],
  "site-access": ["workflow-launch-website"],
  "email-accounts": ["workflow-configure-email"],
  "marketing-dashboard": ["workflow-configure-marketing"],
};

function pageDefinition(page: HelpInventoryPage): HelpEntityDefinition {
  const copy = kindCopy(page.pageKind, page.label);
  return {
    id: page.id,
    version: 1,
    reviewedAgainstInventoryVersion: page.version,
    title: page.label,
    summary: `${page.label} helps administrators ${copy.purpose?.replace(/^Configure and manage |^Review status and take recommended actions for |^Find, filter, and act on records related to |^Understand reports and guidance shown on /i, "").replace(/\.$/, "") ?? "operate this area of the site"}.`,
    purpose: copy.purpose,
    whenToUse: copy.whenToUse,
    prerequisites: copy.prerequisites,
    configurationSteps: copy.configurationSteps,
    bestPractices: copy.bestPractices,
    mistakes: copy.mistakes,
    warnings: copy.warnings,
    keywords: [page.label.toLowerCase(), page.navItemId, page.pageKind],
    readingTime: page.pageKind === "dashboard" ? 2 : 3,
    difficulty: page.pageKind === "informational" ? "intermediate" : "beginner",
    relatedWorkflowIds: WORKFLOWS_BY_NAV[page.navItemId],
    faq: [
      {
        id: `${page.id}-faq-1`,
        question: `Where do I open ${page.label}?`,
        answer: `Use the admin sidebar and open ${page.label}, or go directly to ${page.href}.`,
      },
    ],
    troubleshooting: [
      {
        id: `${page.id}-ts-1`,
        problem: `${page.label} is missing from the sidebar`,
        causes: [
          "Your deployment profile disables this navigation item",
          "You are not signed in as an administrator",
        ],
        fixes: [
          "Confirm you are logged into /admin",
          "Check deployment profile enabled nav items",
        ],
      },
    ],
  };
}

function entityDefinition(
  id: string,
  title: string,
  summary: string,
  inventoryVersion: number,
  extra?: Partial<HelpEntityDefinition>
): HelpEntityDefinition {
  return {
    id,
    version: 1,
    reviewedAgainstInventoryVersion: inventoryVersion,
    title,
    summary,
    ...extra,
  };
}

export function buildAllHelpDefinitions(
  inventory: HelpInventoryBundle = helpInventory
): Map<string, HelpEntityDefinition> {
  const map = new Map<string, HelpEntityDefinition>();

  for (const page of inventory.pages) {
    map.set(page.id, pageDefinition(page));
  }

  map.set("page-seo-sitemap", {
    ...map.get("page-seo-sitemap")!,
    purpose: "Review the generated sitemap and submit it to Google Search Console.",
    configurationSteps: [
      "Open SEO → Sitemap and review the URL preview and XML output",
      "Confirm important public pages are included and admin-only paths are excluded",
      "Add manual extra paths only when a public URL is missing from the auto-generated list",
      "Copy the sitemap URL (https://your-domain.com/sitemap.xml)",
      "In Google Search Console → Sitemaps, paste the full sitemap URL and submit",
      "Return here after deploys to confirm new URLs appear in the preview",
    ],
    bestPractices: [
      "Submit the sitemap after launch and after major catalog or CMS changes",
      "Use exclude paths for thank-you pages, previews, and internal routes",
      "Request indexing for key landing pages in GSC after sitemap processing",
    ],
    mistakes: [
      "Submitting http:// instead of https:// when the site redirects to HTTPS",
      "Submitting a sitemap before the production domain is verified in GSC",
    ],
  });

  map.set("page-seo-structured-data", {
    ...map.get("page-seo-structured-data")!,
    purpose:
      "Configure JSON-LD pipeline settings, fix entity readiness gaps, and verify structured data before Google submission.",
    configurationSteps: [
      "Open Structured data → Readiness and follow the Google Search Console checklist",
      "Fill verified business fields in Company → Schema entity (legal name, description, geo, area served)",
      "Open Audit & preview — use Update links next to Missing fields, then re-run the audit",
      "Run Public HTML audit on home, about, contact, and product routes until diffs are clean",
      "Submit https://your-domain.com/sitemap.xml in GSC (see SEO → Sitemap)",
      "Test live URLs in Google Rich Results Test and request indexing in GSC URL Inspection",
      "Monitor GSC → Enhancements → Structured data for errors over the following days",
    ],
    bestPractices: [
      "Only emit verified company data — do not invent founding dates or coordinates",
      "Treat Audit & preview simulations as eligibility hints, not guaranteed Google appearance",
      "Re-audit after publishing company, theme, or SEO metadata changes",
    ],
    mistakes: [
      "Expecting knowledge panels or sitelinks from schema alone",
      "Skipping Public HTML audit while admin shows Provided but live HTML differs",
      "Expecting FAQ rich results from FAQPage schema (deprecated in Google Search May 2026)",
      "Using WebSite overrides to configure sitelinks search box (retired 2024)",
    ],
    relatedWorkflowIds: ["workflow-seo-setup"],
  });

  map.set("page-seo-integrations", {
    ...map.get("page-seo-integrations")!,
    readingTime: 8,
    purpose:
      "Configure Bing Webmaster, IndexNow, and Google Indexing API for fast URL discovery and priority indexing requests.",
    whenToUse: [
      "You want Bing and other IndexNow engines notified when pages are published or updated",
      "You need to set up IndexNow key verification for instant URL submission",
      "You want Search Operations to submit priority URLs to Google's Indexing API",
      "You are troubleshooting failed search-engine submission jobs",
    ],
    prerequisites: [
      "Production domain is live and publicly reachable over HTTPS",
      "Administrator access",
      "You know which host is canonical after redirects (open www and non-www in a browser — use the host that stays in the address bar)",
      "For Google Indexing API: a Google Cloud project with the Indexing API enabled and a service account key",
    ],
    configurationSteps: [
      "IndexNow setup (do this first) — decide the live host. For BRT, https://www.brt-me.com permanently redirects to https://brt-me.com, so every IndexNow value must use brt-me.com (no www)",
      "Generate an IndexNow key: 8–128 characters, letters, numbers, and dashes only. In Bing Webmaster Tools open your site → IndexNow → generate a key, or create a random hex string (for example 32 characters)",
      "If you use Bing Webmaster, add the site as https://brt-me.com (not www.brt-me.com). A www property is a different site to IndexNow and causes InvalidRequestParameters",
      "Open SEO → Search Engines → Configure → IndexNow",
      "Check Enabled, paste the API key into API key, and leave Endpoint blank (the platform uses https://api.indexnow.org/indexnow)",
      "Leave Key location blank, or set it to https://brt-me.com/{your-key}.txt — never https://www.brt-me.com/{your-key}.txt on this site",
      "Click Save integrations. The platform serves GET /{your-key}.txt automatically with the key as plain text, so you do not need to upload a file to public/",
      "Verify the key file: open https://brt-me.com/{your-key}.txt in a private window. You must see only the key (no HTML, no 404 page). Opening https://www.brt-me.com/{your-key}.txt should redirect to the apex URL",
      "Publish or update one product or page, then open Queue & jobs. An indexnow URL job should complete. If it failed earlier with InvalidRequestParameters, fix Key location, save, and re-run that job",
      "Optional — Bing Webmaster sitemap: on the Bing tab, enable the integration, set Site URL to https://brt-me.com, paste your Bing API key, and use Queue → submit sitemap. IndexNow never accepts sitemap.xml",
      "Google Indexing API — open Google Cloud Console and select (or create) a project for your site",
      "In APIs & Services → Library, search for Web Search Indexing API and click Enable",
      "In IAM → Service Accounts, create a service account (for example indexing-api@your-project.iam.gserviceaccount.com)",
      "Create a JSON key for that service account and download the file — keep it private",
      "In Google Search Console, open your property → Settings → Users and permissions → Add user → paste the service account email → set permission to Owner",
      "In admin, open SEO → Search Engines → Configure → Google Indexing API tab",
      "Check Enabled, paste the full JSON key, and click Save integrations",
      "Run Submit priority URLs (or Request Homepage Index) in Search Operations to verify — fix any “API not enabled” message using the link in the error",
    ],
    bestPractices: [
      "Use one host everywhere: live pages, IndexNow key location, Bing Webmaster property, and sitemap submissions",
      "Use IndexNow for individual page URLs; submit sitemaps through Bing Webmaster or Google Search Console instead",
      "Use Google Indexing API only for job postings and livestream pages per Google policy, or for limited priority URLs your property owns",
      "After changing the API key, confirm /{new-key}.txt returns the new key before re-running the queue",
      "Review the Monitoring and Queue & jobs tabs after major content publishes",
      "Enable required Google Cloud APIs in the same project as the service account JSON you paste in admin",
    ],
    mistakes: [
      "Setting Key location to the www host when the live site redirects www to apex (or the reverse) — IndexNow then reports URLs are not related to the keylocation site",
      "Registering Bing Webmaster as https://www.brt-me.com while pages are https://brt-me.com",
      "Submitting sitemap.xml URLs to IndexNow — it accepts page URLs only",
      "Using http:// key locations when the live site is HTTPS",
      "Disabling IndexNow while expecting automatic notifications on publish",
      "Pasting Indexing API JSON but not adding the service account as Owner in Search Console",
      "Enabling Indexing API in one Google Cloud project while using a service account key from another project",
    ],
    warnings: [
      "Submissions run asynchronously through a background queue — they are not instant in the admin UI.",
      "IndexNow notifies participating engines (including Bing); it does not replace Google Search Console indexing.",
      "Google Indexing API has strict daily quotas and eligibility rules — failed requests may still mean Google chose not to index the URL.",
      "www and non-www are different sites to IndexNow. On this deployment, www.brt-me.com 308-redirects to brt-me.com — always submit and verify the apex host.",
    ],
    keywords: [
      "indexnow",
      "bing",
      "search engines",
      "url submission",
      "instant indexing",
      "webmaster",
      "google indexing api",
      "service account",
    ],
    relatedWorkflowIds: ["workflow-seo-setup"],
    relatedTopicIds: ["topic-seo-google"],
    faq: [
      {
        id: "seo-integrations-faq-indexing-api",
        question: "Where do I configure Google Indexing API?",
        answer:
          "SEO → Search Engines → Configure → Google Indexing API. Paste a Google Cloud service account JSON key there — not under Google OAuth settings. The service account must be Owner on your Search Console property and the Web Search Indexing API must be enabled in the same Cloud project.",
      },
      {
        id: "seo-integrations-faq-indexing-403",
        question: "Indexing API failed with HTTP 403 / API not enabled",
        answer:
          "Open the enable link shown in the error (Google Cloud Console → APIs & Services → Web Search Indexing API → Enable) for the project ID in the message. Wait a few minutes, then retry. Confirm the JSON key you saved belongs to that same project.",
      },
      {
        id: "seo-integrations-faq-indexnow-key",
        question: "Where do I get an IndexNow API key?",
        answer:
          "Generate one in Bing Webmaster Tools (IndexNow section for the https://brt-me.com property) or create your own random string of 8–128 letters, numbers, or dashes. Paste that exact value into SEO → Search Engines → Configure → IndexNow. The platform then serves it at https://brt-me.com/{key}.txt.",
      },
      {
        id: "seo-integrations-faq-key-file",
        question: "Do I need to upload an IndexNow {key}.txt file?",
        answer:
          "No. After you save an enabled IndexNow API key, GET https://brt-me.com/{your-key}.txt is served automatically and must return only the key. Leave Key location blank unless the file is on a CDN. Never point Key location at https://www.brt-me.com — that host redirects to brt-me.com and Bing rejects the URLs.",
      },
      {
        id: "seo-integrations-faq-www",
        question: "Why do IndexNow jobs fail with InvalidRequestParameters / keylocation?",
        answer:
          "IndexNow treats www and non-www as different sites. This website redirects https://www.brt-me.com to https://brt-me.com. If Key location or Bing Webmaster uses www, Bing verifies www then rejects apex product URLs (or the reverse). Set Key location to https://brt-me.com/{key}.txt or leave it blank, save, and re-run the queue.",
      },
      {
        id: "seo-integrations-faq-auto",
        question: "When are URLs submitted automatically?",
        answer:
          "When IndexNow is enabled and configured, publishing, unpublishing, slug changes, and similar content events enqueue URL submission jobs. Check SEO → Search Engines → Queue & jobs for status. Failed jobs can be re-run after you fix Key location.",
      },
    ],
    troubleshooting: [
      {
        id: "seo-integrations-ts-indexing-not-configured",
        problem: "Submit priority URLs fails — service account not configured",
        causes: [
          "Google Indexing API tab is disabled or JSON was never saved",
          "JSON was saved under legacy Google Search Console settings before migration",
        ],
        fixes: [
          "Open SEO → Search Engines → Configure → Google Indexing API",
          "Check Enabled, paste the service account JSON, save, and retry the Search Operations action",
        ],
      },
      {
        id: "seo-integrations-ts-indexing-api-disabled",
        problem: "Indexing API returns 403 — API not enabled",
        causes: [
          "Web Search Indexing API is disabled in the Google Cloud project tied to the service account",
          "Wrong project — JSON key is from a different project than the one where the API was enabled",
        ],
        fixes: [
          "Follow the Google Cloud Console link in the error to enable Web Search Indexing API",
          "Re-download a key from the project where the API is enabled if projects were mixed up",
          "Ensure the service account email is Owner on the Search Console property",
        ],
      },
      {
        id: "seo-integrations-ts-indexing-ownership",
        problem: "Indexing API returns 403 — Failed to verify URL ownership",
        causes: [
          "The service account email from the JSON key was never added to Search Console",
          "The service account was added as Full or Restricted user instead of Owner",
          "Search Console property does not cover the submitted URL (for example www vs apex, or wrong domain)",
        ],
        fixes: [
          "Open the JSON key and copy client_email (for example indexing-api@your-project.iam.gserviceaccount.com)",
          "In Search Console → Settings → Users and permissions → Add user → paste that email → set permission to Owner",
          "Use a property that includes the URL you submit — for brt-me.com use https://brt-me.com/ or sc-domain:brt-me.com, not www.brt-me.com",
          "Retry Request Indexing in Search Operations → Google after saving",
        ],
      },
      {
        id: "seo-integrations-ts-indexnow-not-configured",
        problem: "IndexNow shows as not configured or setup",
        causes: [
          "Enabled checkbox is off",
          "API key field is empty",
          "Key was saved but Enabled was not checked before save",
        ],
        fixes: [
          "Open Configure → IndexNow, check Enabled, enter the API key, and save",
          "Confirm Monitoring shows IndexNow as configured with a green status",
        ],
      },
      {
        id: "seo-integrations-ts-indexnow-failed",
        problem: "IndexNow jobs fail in the queue",
        causes: [
          "Key location uses www.brt-me.com while product URLs are https://brt-me.com/… (www redirects to apex)",
          "Bing Webmaster property is the www host",
          "Verification file returns HTML or a 404 instead of the raw key",
          "Endpoint URL is incorrect",
        ],
        fixes: [
          "Open https://brt-me.com/{your-key}.txt — it must be plain text containing only the API key",
          "On Configure → IndexNow, clear Key location or set https://brt-me.com/{your-key}.txt, then save",
          "Reset Endpoint to blank or https://api.indexnow.org/indexnow",
          "Re-run the failed URL job from Queue & jobs",
        ],
      },
      {
        id: "seo-integrations-ts-indexnow-keylocation",
        problem: "InvalidRequestParameters — URLs are not related to the site verified through keylocation",
        causes: [
          "Key location host does not match the page URL host after redirects",
          "www vs non-www mismatch (this site: www → brt-me.com)",
        ],
        fixes: [
          "Use brt-me.com in Key location, Bing Webmaster, and submitted URLs — not www.brt-me.com",
          "Save IndexNow, confirm the key file on the apex host, then re-run the queue",
        ],
      },
    ],
  });

  const platformsPage = map.get("page-marketing-platforms");
  if (platformsPage) {
  map.set("page-marketing-platforms", {
    ...platformsPage,
    readingTime: 10,
    purpose:
      "Connect Meta and LinkedIn advertising OAuth apps here. Google Ads OAuth and API credentials are configured under SEO → Google → Ads; this page shows Google status and links to Ad Accounts.",
    whenToUse: [
      "You need Meta or LinkedIn app credentials and OAuth",
      "You want a status checklist for Google Ads without editing credentials here",
      "You are connecting LinkedIn Company Pages / Ads for Marketing",
      "OAuth fails with redirect_uri_mismatch for LinkedIn or Meta",
    ],
    prerequisites: [
      "Administrator access",
      "For LinkedIn: a LinkedIn Developer application with Marketing Developer Platform / Ads products enabled for r_ads and rw_ads",
      "Authorized redirect URI: {your-origin}/api/marketing/oauth/linkedin/callback",
      "For Google Ads: SEO → Google OAuth client and Ads configuration (not on this page)",
    ],
    configurationSteps: [
      "LinkedIn — create an app at LinkedIn Developers and enable products that grant organization + ads scopes",
      "LinkedIn — add Authorized redirect URL: {your-origin}/api/marketing/oauth/linkedin/callback (exact origin/port)",
      "Open Marketing → Advertising Platforms → LinkedIn",
      "Enter Client ID and Client Secret, then Save LinkedIn credentials",
      "Click Connect LinkedIn and approve scopes (organization admin/social + ads)",
      "Confirm connection status shows Connected and organization accounts appear after callback",
      "Optional: set LinkedIn Partner ID under Marketing → Tracking for Insight Tag",
      "For Google Ads: configure under SEO → Google → Ads, then Sync Ad Accounts",
    ],
    bestPractices: [
      "Register the exact redirect URI origin and port you use in the browser",
      "Keep Client Secret only in AZURA — leave the field blank on later saves to retain the stored secret",
      "Connect with a LinkedIn user that administers the Company Page and Ads accounts you need",
      "Do not maintain a second Google Ads Client ID/Secret under Marketing Platforms",
      "MCC for Google Ads must be numeric — emails are invalid",
    ],
    mistakes: [
      "Registering the wrong LinkedIn redirect URI (wrong port, http vs https, or missing /callback path)",
      "Clicking Connect before saving Client ID and Client Secret",
      "Expecting Marketing Platforms Connect to own Google Ads tokens",
      "Assuming LinkedIn OAuth alone creates Google-style Ad Account inventory without further sync",
    ],
    warnings: [
      "LinkedIn Connect uses Marketing OAuth: /api/marketing/oauth/linkedin/callback — not the SEO Google callback.",
      "OAuth connected ≠ Google Ads operational. Google Ads requires SEO → Google setup.",
      "Connecting an Ads account does not auto-link campaigns — linking is a separate Campaigns step.",
    ],
    keywords: [
      "linkedin",
      "linkedin ads",
      "oauth",
      "client id",
      "client secret",
      "redirect_uri_mismatch",
      "advertising platforms",
      "google ads",
      "meta",
      "r_ads",
      "rw_ads",
    ],
    relatedWorkflowIds: [
      "workflow-linkedin-ads-setup",
      "workflow-google-ads-setup",
      "workflow-configure-marketing",
    ],
    relatedTopicIds: [
      "topic-marketing-ad-accounts",
      "topic-marketing-campaigns",
      "topic-seo-google",
    ],
    faq: [
      {
        id: "mkt-platforms-faq-linkedin-connect",
        question: "How do I connect LinkedIn Advertising?",
        answer:
          "Create a LinkedIn Developer app, add redirect URI {your-origin}/api/marketing/oauth/linkedin/callback, enable products for organization + ads scopes (r_ads, rw_ads), then open Marketing → Advertising Platforms → LinkedIn, save Client ID/Secret, and click Connect LinkedIn. Full steps: workflow “Connect LinkedIn advertising”.",
      },
      {
        id: "mkt-platforms-faq-linkedin-redirect",
        question: "Why do I get redirect_uri_mismatch for LinkedIn?",
        answer:
          "The redirect URI LinkedIn receives must exactly match an Authorized redirect URL on your app: {your-origin}/api/marketing/oauth/linkedin/callback (including https/http and localhost port).",
      },
      {
        id: "mkt-platforms-faq-linkedin-scopes",
        question: "Which LinkedIn OAuth scopes does AZURA request?",
        answer:
          "r_organization_social, w_organization_social, rw_organization_admin, r_ads, and rw_ads. Your LinkedIn app must have products that allow these scopes.",
      },
      {
        id: "mkt-platforms-faq-redirect",
        question: "Why do I get Error 400: redirect_uri_mismatch for Google Ads?",
        answer:
          "Google Ads Connect uses the SEO Google OAuth callback: {your-origin}/api/seo/analytics/google/oauth/callback. Register that exact URI on your Google Cloud OAuth client.",
      },
      {
        id: "mkt-platforms-faq-oauth-vs-ops",
        question: "OAuth is connected but Google Ads checks still fail. Why?",
        answer:
          "Finish developer token, numeric MCC, and customer ID under SEO → Google → Ads, then Sync Ad Accounts. Until then the badge shows Setup incomplete.",
      },
      {
        id: "mkt-platforms-faq-403",
        question: "What does Google Ads API 403: The caller does not have permission mean?",
        answer:
          "The connected Google user cannot access that Ads customer via the API. Fix user access and numeric MCC/customer IDs under SEO → Google → Ads, then Sync again. See Help → troubleshooting “Google Ads API 403”.",
      },
    ],
    troubleshooting: [
      {
        id: "mkt-platforms-ts-linkedin-connect",
        problem: "Cannot Connect LinkedIn / button disabled",
        causes: [
          "Client ID or Client Secret not saved",
          "Wrong redirect URI in LinkedIn Developer Portal",
          "App missing Ads / Marketing products for required scopes",
        ],
        fixes: [
          "Save Client ID and Client Secret under Advertising Platforms → LinkedIn",
          "Add {your-origin}/api/marketing/oauth/linkedin/callback as Authorized redirect URL",
          "Enable LinkedIn products that grant r_ads and rw_ads, then reconnect",
        ],
      },
      {
        id: "mkt-platforms-ts-not-connected",
        problem: "OAuth token check says Not connected (Google Ads)",
        causes: ["Never clicked Connect under SEO Google Ads", "Token refresh failed", "Missing Ads scope"],
        fixes: [
          "Open SEO → Google → Ads and Connect",
          "Confirm the OAuth client matches the SEO redirect URI",
          "Reconnect if Ads scope (adwords) is missing",
        ],
      },
      {
        id: "mkt-platforms-ts-403",
        problem: "Google Ads API 403 on Ads account check",
        causes: [
          "OAuth user lacks Ads account access",
          "Wrong MCC / customer ID",
          "Developer token restrictions",
        ],
        fixes: [
          "Follow Help troubleshooting: Google Ads API 403 — The caller does not have permission",
          "Open SEO → Google → Ads and correct Configuration, then Sync Ad Accounts",
        ],
      },
    ],
  });
  }

  {
    const page = map.get("page-marketing-ad-accounts");
    if (page) {
  map.set("page-marketing-ad-accounts", {
    ...page,
    readingTime: 7,
    purpose:
      "Discover Google Ads customers under your MCC (using the SEO Google connection), sync campaign inventory, and optionally link Google campaigns to internal Marketing campaigns.",
    whenToUse: [
      "You finished SEO → Google → Ads OAuth and credentials",
      "You need to import Google Ads customers into Marketing inventory",
      "You want to link a synced Google campaign to an internal campaign from the Ads side",
    ],
    prerequisites: [
      "SEO Google Ads OAuth connected with adwords scope",
      "Developer token and numeric MCC saved under SEO → Google → Ads",
    ],
    configurationSteps: [
      "Open Marketing → Ad Accounts",
      "Click Sync Google Ads accounts so google_ads_customer rows appear",
      "Select the Ads customer that contains the campaigns you care about",
      "Sync campaigns for that account",
      "For unlinked Google campaigns, use Link to internal campaign — or link from Campaigns → Ads instead",
    ],
    bestPractices: [
      "Remember: connecting an Ads account does not auto-link campaigns to Marketing campaigns",
      "MCC is login-customer-id; the selected customer is the Ads account in GAQL customerId",
      "A customer ID on SEO alone does not create Ad Account rows — Sync is required",
    ],
    mistakes: [
      "Expecting spend and campaigns on an internal campaign before creating a provider binding",
      "Selecting the MCC itself when campaigns live under a client customer",
      "Using an email as MCC",
      "Syncing while the OAuth Google user cannot access the customer (causes 403)",
    ],
    warnings: [
      "Campaign linking is a separate step after inventory sync.",
      "Google Ads API 403 means access/permission — not a broken Sync button. Fix MCC + user access, then sync again.",
    ],
    keywords: [
      "ad accounts",
      "google ads customer",
      "sync",
      "mcc",
      "inventory",
      "403",
      "permission",
    ],
    relatedWorkflowIds: ["workflow-google-ads-setup"],
    relatedTopicIds: ["topic-marketing-platforms", "topic-marketing-campaigns", "topic-seo-google"],
    faq: [
      {
        id: "mkt-ad-accounts-faq-403",
        question: "Sync or health shows Google Ads API 403: The caller does not have permission",
        answer:
          "OAuth succeeded, but the signed-in Google user (or developer token) cannot call that customer ID. Use a numeric MCC as Manager Account when the account sits under a manager, confirm the Connect user is Admin/Standard on that Ads account in Google Ads → Access and security, ensure the developer token is approved for production, then Sync again. Full steps: Help → troubleshooting “Google Ads API 403”.",
      },
      {
        id: "mkt-ad-accounts-faq-sync-empty",
        question: "I clicked Sync Google Ads accounts but nothing appeared",
        answer:
          "Check for a red/green banner after Sync. If you see 403, fix access first. If MCC was an email, replace it with a numeric manager ID under SEO → Google → Ads. Customer ID alone does not create rows until Sync succeeds against an accessible account.",
      },
    ],
    troubleshooting: [
      {
        id: "mkt-ad-accounts-ts-403",
        problem: "Google Ads API 403: The caller does not have permission",
        causes: [
          "OAuth Google user lacks access to customer 2698879313 (or your ID)",
          "Wrong or missing numeric MCC (login-customer-id)",
          "Developer token is Test-only / not approved for this account",
        ],
        fixes: [
          "Verify Customer ID and Manager Account (MCC) under SEO → Google → Ads → Configuration",
          "In Google Ads → Access and security, grant Admin/Standard to the Connect user",
          "Reconnect OAuth, then Sync Google Ads accounts again",
          "Open Help troubleshooting: Google Ads API 403 — The caller does not have permission",
        ],
      },
    ],
  });
  }
  }

  {
    const page = map.get("page-marketing-campaigns");
    if (page) {
  map.set("page-marketing-campaigns", {
    ...page,
    readingTime: 10,
    purpose:
      "Use internal MarketingCampaign as the scoreboard: link one or more Google Ads campaigns via bindings, generate tracking, attribute GCLID traffic, and review Google + website + joined metrics.",
    whenToUse: [
      "You have synced Google campaigns and want them on an internal campaign",
      "You need Final URL suffix / tracking for Google Ads",
      "You are reviewing spend, clicks, leads, or sync errors on a campaign",
    ],
    prerequisites: [
      "Operational Google Ads connection under SEO → Google (OAuth + developer token + MCC + customer)",
      "Synced Google campaign inventory on Ad Accounts",
    ],
    configurationSteps: [
      "Open Marketing → Campaigns and create or open an internal campaign",
      "On the Ads tab, pick a Google Ads account and campaign, then Link (do not type IDs unless Advanced)",
      "Copy the Final URL suffix / tracking guidance into Google Ads",
      "Confirm binding cards show spend, sync status, and Retry if needed",
      "Optionally link additional Google campaigns (Search + PMax + remarketing) to the same internal campaign",
    ],
    bestPractices: [
      "One internal campaign may have many Google bindings",
      "Use campaign= and binding= discriminators when multiple Google campaigns fund one internal campaign",
      "Unlink deletes the binding only — inventory stays",
    ],
    mistakes: [
      "Using account-level spend as campaign spend",
      "Guessing which Google campaign when multiple bindings exist without binding= / utm_content",
    ],
    warnings: [
      "Suggested matches are not auto-linked unless the name/internalId match is exact and unique.",
    ],
    keywords: [
      "campaign linking",
      "binding",
      "gclid",
      "scoreboard",
      "tracking url",
      "google ads",
    ],
    relatedWorkflowIds: ["workflow-google-ads-setup"],
    relatedTopicIds: ["topic-marketing-platforms", "topic-marketing-ad-accounts"],
  });
  }
  }

  {
    const page = map.get("page-seo-google");
    if (page) {
  map.set("page-seo-google", {
    ...page,
    readingTime: 8,
    purpose:
      "Manage Google SEO tools and own the Google Ads connection (OAuth, developer token, MCC, customer). Marketing consumes this connection for sync and the scoreboard.",
    whenToUse: [
      "You need to connect or repair Google Ads OAuth",
      "You must set developer token, numeric MCC, or Ads customer",
      "You work in SEO → Google for Search Console and other tools",
    ],
    prerequisites: [
      "Google Cloud OAuth client with Client ID/Secret on SEO Google Settings",
      "Authorized redirect URI: /api/seo/analytics/google/oauth/callback",
      "Google Ads API developer token",
    ],
    configurationSteps: [
      "Open SEO → Google → Ads",
      "Connect OAuth (grants adwords scope)",
      "Save Customer ID, Manager Account (MCC — numeric only), and Developer token under Configuration",
      "Open Marketing → Ad Accounts and Sync Google Ads accounts",
      "Link campaigns under Marketing → Campaigns",
    ],
    bestPractices: [
      "Keep all Ads credentials on this page — Marketing Platforms is status-only for Google Ads",
      "Never use an email address as MCC — only the numeric Manager ID from Google Ads",
      "Connect with the Google user that is Admin on the Ads customer (and MCC if used)",
      "MCC (login-customer-id) is the manager; Customer ID is the account whose campaigns you sync",
    ],
    mistakes: [
      "Creating a second Ads OAuth under Marketing Platforms",
      "Treating a customer ID as operational without Connect + Sync",
      "Using social@… or any email as Manager Account (MCC)",
      "Assuming OAuth Connected means the API can read that customer (403 means it cannot)",
    ],
    warnings: [
      "Marketing Ad Accounts stay empty until Sync runs against an operational SEO connection.",
      "403 The caller does not have permission is an Ads access problem in Google, not an AZURA Connect bug.",
    ],
    keywords: [
      "seo google",
      "google ads",
      "developer token",
      "mcc",
      "403",
      "permission",
      "caller does not have permission",
    ],
    relatedWorkflowIds: ["workflow-google-ads-setup"],
    relatedTopicIds: ["topic-marketing-platforms", "topic-marketing-ad-accounts"],
    faq: [
      {
        id: "seo-google-faq-ads-403",
        question: "Ads account shows Google Ads API 403: The caller does not have permission",
        answer:
          "Your OAuth token is valid, but Google Ads rejects API calls to that customer ID. Fix access: (1) set numeric Manager Account MCC if the account is under a manager, (2) set the correct Customer ID, (3) ensure the Google user used for Connect has Admin/Standard access on that account in Google Ads → Access and security, (4) confirm the developer token is approved, (5) Reconnect if needed, then Sync Ad Accounts. See Help troubleshooting “Google Ads API 403”.",
      },
      {
        id: "seo-google-faq-mcc-email",
        question: "Why can’t I use an email as Manager Account (MCC)?",
        answer:
          "Google Ads API login-customer-id must be the numeric manager customer ID (10 digits). Emails like social@brt-me.com are not valid MCC values and block sync/health.",
      },
    ],
    troubleshooting: [
      {
        id: "seo-google-ts-ads-403",
        problem: "Google Ads API 403: The caller does not have permission",
        causes: [
          "Connect user cannot access the Ads customer",
          "Customer ID / MCC mismatch",
          "Developer token not allowed for this account",
        ],
        fixes: [
          "Copy numeric IDs from Google Ads UI (account menu), not emails",
          "Grant the Connect Google user access under Ads → Access and security",
          "Reconnect on SEO → Google → Ads, then Sync under Marketing → Ad Accounts",
        ],
      },
    ],
  });
  }
  }

  for (const field of inventory.fields) {
    map.set(
      field.id,
      entityDefinition(field.id, field.label, field.description ?? field.label, field.version, {
        purpose: field.description,
        recommended: `Complete ${field.label} with accurate, unique values.`,
        mistakes: [`Leaving ${field.label} empty on public pages`],
      })
    );
  }

  for (const component of inventory.components) {
    map.set(
      component.id,
      entityDefinition(
        component.id,
        component.label,
        component.description ?? component.label,
        component.version,
        {
          purpose: component.description,
          whenToUse: [`You need to configure ${component.label} on a content or SEO screen`],
          configurationSteps: [
            `Locate the ${component.label} block on the page`,
            "Fill required fields",
            "Save the parent page",
          ],
          bestPractices:
            component.id === "component-seo-meta"
              ? [
                  "Write unique titles and descriptions per page",
                  "Keep titles under ~60 characters when possible",
                  "Use Auto-fill as a starting point, then edit",
                ]
              : [`Keep ${component.label} consistent across related pages`],
          mistakes:
            component.id === "component-seo-meta"
              ? [
                  "Reusing the same meta title on many pages",
                  "Leaving meta description empty on key landing pages",
                ]
              : undefined,
        }
      )
    );
  }

  for (const section of inventory.sections) {
    map.set(
      section.id,
      entityDefinition(section.id, section.label, section.description ?? section.label, section.version, {
        purpose: `Group related ${section.label} settings together.`,
      })
    );
  }

  for (const table of inventory.tables) {
    map.set(
      table.id,
      entityDefinition(table.id, table.label, table.description ?? table.label, table.version, {
        purpose: "Browse and act on records in a table.",
        whenToUse: ["You need to search, filter, or open a record"],
      })
    );
  }

  for (const action of inventory.actions) {
    map.set(
      action.id,
      entityDefinition(action.id, action.label, action.description ?? action.label, action.version, {
        purpose: action.description,
      })
    );
  }

  for (const dialog of inventory.dialogs) {
    map.set(
      dialog.id,
      entityDefinition(dialog.id, dialog.label, dialog.description ?? dialog.label, dialog.version)
    );
  }

  for (const tab of inventory.tabs) {
    map.set(
      tab.id,
      entityDefinition(tab.id, tab.label, tab.description ?? tab.label, tab.version)
    );
  }

  map.set("tab-seo-integrations-configure", {
    ...map.get("tab-seo-integrations-configure")!,
    purpose: "Enter credentials and enable IndexNow, Bing Webmaster, and Google Indexing API.",
    configurationSteps: [
      "Open the IndexNow ribbon tab first",
      "Check Enabled and paste the API key from Bing Webmaster (or your own 8–128 character key)",
      "Leave Endpoint blank unless you were given a partner IndexNow URL",
      "Leave Key location blank, or enter https://brt-me.com/{key}.txt — the host must match live pages (no www on this site)",
      "Save integrations, then open https://brt-me.com/{key}.txt and confirm it returns only the key",
      "Switch to Bing only if you also need sitemap submission; set Site URL to https://brt-me.com",
      "Switch to Google Indexing API to paste a service account JSON key when you need priority Google updates",
    ],
    mistakes: [
      "Saving a www Key location while product URLs are on brt-me.com",
      "Expecting IndexNow to accept sitemap.xml",
    ],
  });

  map.set("tab-seo-integrations-queue", {
    ...map.get("tab-seo-integrations-queue")!,
    purpose: "Inspect, retry, and manually trigger outbound URL and sitemap submission jobs.",
    whenToUse: [
      "You published content and want to confirm IndexNow jobs were enqueued",
      "A submission failed and you need the error message",
      "You want to manually enqueue sitemap jobs for Bing or Google",
    ],
    bestPractices: [
      "After enabling IndexNow, publish a test page and confirm an indexnow URL job completes",
      "If a job fails with InvalidRequestParameters, fix Key location to the non-redirecting host (https://brt-me.com), save, then re-run that row",
      "Use sitemap jobs for Bing and Google — IndexNow URL jobs are for individual pages only",
    ],
  });

  map.set("field-indexnow-api-key", {
    ...map.get("field-indexnow-api-key")!,
    recommended:
      "Use the key Bing Webmaster generated for https://brt-me.com, or a random 32-character hex string. Paste it once; leave the field blank on later saves to keep the stored key.",
    example: "a1b2c3d4e5f6789012345678abcdef01",
    mistakes: [
      "Reusing a key issued for a different host (www vs apex)",
      "Including spaces, quotes, or line breaks in the key",
    ],
  });

  map.set("field-indexnow-endpoint", {
    ...map.get("field-indexnow-endpoint")!,
    recommended: "Leave blank to use https://api.indexnow.org/indexnow.",
    mistakes: ["Pointing at a Bing-only HTML page or an endpoint that does not accept IndexNow JSON"],
  });

  map.set("field-indexnow-key-location", {
    ...map.get("field-indexnow-key-location")!,
    recommended:
      "Leave blank. The platform publishes https://brt-me.com/{apiKey}.txt automatically. Never paste a Media Library /uploads/ URL — IndexNow requires the filename to be exactly {apiKey}.txt at the site root.",
    example: "https://brt-me.com/a1b2c3d4e5f6789012345678abcdef01.txt",
    mistakes: [
      "Pasting an uploaded document such as /uploads/documents/…-indexnow-key.txt",
      "https://www.brt-me.com/{key}.txt on this site — www is not the verified host after the 308 redirect",
      "Key file returns HTML (404 page) instead of plain text",
      "http:// instead of https://",
    ],
  });

  return map;
}

export const helpDefinitions: Map<string, HelpEntityDefinition> = buildAllHelpDefinitions();
