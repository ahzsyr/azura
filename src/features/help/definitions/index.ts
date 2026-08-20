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
