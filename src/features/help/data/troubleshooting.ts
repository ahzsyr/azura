import type { HelpTroubleshooting } from "@/features/help/types";

export const HELP_TROUBLESHOOTING: HelpTroubleshooting[] = [
  {
    id: "ts-site-not-public",
    title: "Site is not public",
    problem: "Visitors cannot see the live website, or only see Coming Soon.",
    causes: [
      "Coming Soon / site access is enabled",
      "No homepage published",
      "No published pages",
      "DNS or hosting not pointed at this deployment",
    ],
    fixes: [
      "Open Site Access and disable Coming Soon when ready",
      "Publish a homepage under Pages",
      "Confirm at least one page is published",
      "Verify hosting/DNS with your infrastructure provider",
    ],
    links: [
      { label: "Open Site Access", href: "/admin/settings/site" },
      { label: "Open Pages", href: "/admin/pages" },
    ],
    keywords: ["coming soon", "public", "launch", "offline", "maintenance"],
    navItemIds: ["site-access", "pages"],
  },
  {
    id: "ts-forms-not-receiving",
    title: "Forms not receiving submissions",
    problem: "Visitors submit forms but you do not see leads or emails.",
    causes: [
      "Email / SMTP not configured",
      "Notification recipients wrong or disabled",
      "Messages landing in spam",
      "Form validation blocking submit",
    ],
    fixes: [
      "Configure Email Accounts and send a test",
      "Check Form Submissions for stored entries",
      "Verify notification emails on each form",
      "Test the form on the live page while logged out",
    ],
    links: [
      { label: "Open Forms", href: "/admin/forms" },
      { label: "Open Submissions", href: "/admin/form-submissions" },
      { label: "Email Accounts", href: "/admin/settings/email-accounts" },
    ],
    keywords: ["forms", "smtp", "email", "submissions", "leads", "notifications"],
    navItemIds: ["form-templates", "form-submissions", "email-accounts"],
  },
  {
    id: "ts-images-missing",
    title: "Images not showing",
    problem: "Images are broken or missing on public pages.",
    causes: [
      "Media file deleted or never uploaded",
      "CDN / browser cache serving stale URLs",
      "Wrong path or unpublished media",
      "Storage permissions",
    ],
    fixes: [
      "Re-upload from Media Library and re-select on the page",
      "Hard-refresh or rebuild if using a CDN",
      "Confirm the block still references a valid media item",
    ],
    links: [
      { label: "Open Media Library", href: "/admin/media" },
      { label: "Open Pages", href: "/admin/pages" },
    ],
    keywords: ["images", "media", "cdn", "broken image", "upload"],
    navItemIds: ["media-library", "pages"],
  },
  {
    id: "ts-language-not-changing",
    title: "Language not changing",
    problem: "Switching language does nothing, or content stays in one locale.",
    causes: [
      "Locale disabled",
      "Content not translated for that locale",
      "Editing the wrong locale in admin",
      "Cached page",
    ],
    fixes: [
      "Enable the locale under Languages",
      "Use the admin locale switcher, then fill translations",
      "Check Translations for missing strings",
      "Preview the public site in that locale URL prefix",
    ],
    links: [
      { label: "Open Languages", href: "/admin/languages" },
      { label: "Open Translations", href: "/admin/translations" },
    ],
    keywords: ["language", "locale", "rtl", "translation", "arabic", "english"],
    navItemIds: ["languages", "translations"],
  },
  {
    id: "ts-indexnow-submissions-failing",
    title: "IndexNow submissions failing",
    problem: "IndexNow jobs show failed or exhausted status in the SEO submission queue.",
    causes: [
      "Pasting a Media upload URL into Key location (must be https://brt-me.com/{key}.txt, not /uploads/…)",
      "Verification key file missing or returns HTML instead of the raw key",
      "Key file content does not exactly match the API key in admin",
      "IndexNow is enabled but API key was never saved",
    ],
    fixes: [
      "Open SEO → Search Engines → Configure → IndexNow. Clear Key location (do not use a Media upload). The app already serves https://brt-me.com/{key}.txt",
      "Open https://brt-me.com/{key}.txt in a private window — it must return only the key as plain text",
      "Confirm Bing Webmaster’s property is https://brt-me.com",
      "Save, then re-run the failed URL job from Queue & jobs",
      "Read the Search Engines help topic (IndexNow setup) for the full host checklist",
    ],
    links: [
      { label: "Search Engines settings", href: "/admin/seo/integrations?tab=configure&provider=indexnow" },
      { label: "Submission queue", href: "/admin/seo/integrations?tab=queue" },
      { label: "Google IndexNow tab", href: "/admin/seo/google?tab=indexnow" },
    ],
    keywords: ["indexnow", "bing", "submission", "queue", "key", "verification"],
    navItemIds: ["seo-integrations", "seo-google"],
  },
];
