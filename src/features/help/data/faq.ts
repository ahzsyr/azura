import type { HelpFaq } from "@/features/help/types";

export const HELP_FAQS: HelpFaq[] = [
  {
    id: "faq-admin-vs-site-language",
    question: "Why is the admin in English when my site is Arabic?",
    answer:
      "Admin chrome stays English. Use the locale switcher in the top bar to choose which website language you are editing. Public visitors use Languages and URL prefixes.",
    keywords: ["admin language", "website language", "locale", "arabic"],
    relatedTopicIds: ["topic-languages"],
  },
  {
    id: "faq-save-vs-publish",
    question: "What is the difference between Save and Publish?",
    answer:
      "Save stores your draft changes. Publish makes the page (or content) visible according to its published state. Always preview before publishing when possible.",
    keywords: ["save", "publish", "draft", "preview"],
    relatedTopicIds: ["topic-pages"],
  },
  {
    id: "faq-coming-soon",
    question: "How do I take the site live?",
    answer:
      "Complete the launch checklist, then open Site Access and turn off Coming Soon. Confirm your homepage is published.",
    keywords: ["launch", "coming soon", "go live"],
    relatedTopicIds: ["topic-site-access"],
  },
  {
    id: "faq-where-leads",
    question: "Where do form leads go?",
    answer:
      "Submissions appear under Form Submissions (and Inquiries when used). Email notifications require Email Accounts to be configured.",
    keywords: ["leads", "forms", "submissions", "inquiries"],
    relatedTopicIds: ["topic-form-submissions"],
  },
  {
    id: "faq-indexnow-setup",
    question: "How do I configure IndexNow?",
    answer:
      "Open Help → Search Engines for the full checklist. Short version: generate a key in Bing Webmaster for https://brt-me.com (not www), enable IndexNow under SEO → Search Engines → Configure, paste the key, leave Key location blank, save, open https://brt-me.com/{key}.txt to confirm it shows only the key, then publish a page and check Queue & jobs.",
    keywords: ["indexnow", "bing", "url submission", "instant indexing", "search engines", "keylocation", "www"],
    relatedTopicIds: ["topic-seo-integrations"],
  },
];
