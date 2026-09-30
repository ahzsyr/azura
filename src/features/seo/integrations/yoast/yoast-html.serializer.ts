import type { ResolvedSeoDocument } from "@/features/seo/core/seo-document";
import { robotsDirectiveToContentString } from "@/features/seo/core/seo-robots";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function serializeYoastHtml(doc: ResolvedSeoDocument): string {
  const lines: string[] = [];

  if (doc.title) {
    lines.push(`<title>${escapeHtml(doc.title)}</title>`);
  }

  if (doc.description) {
    lines.push(`<meta name="description" content="${escapeHtml(doc.description)}" />`);
  } else if (doc.status === 200) {
    lines.push(
      "<!-- Admin only notice: this page does not show a meta description because it does not have one, either write it for this page specifically or go into the [SEO - Search Appearance] menu and set up a template. -->",
    );
  }

  if (doc.robots) {
    lines.push(
      `<meta name="robots" content="${escapeHtml(robotsDirectiveToContentString(doc.robots))}" />`,
    );
  }

  if (doc.canonical) {
    lines.push(`<link rel="canonical" href="${escapeHtml(doc.canonical)}" />`);
  }

  const og = doc.openGraph;
  if (og) {
    if (og.locale) lines.push(`<meta property="og:locale" content="${escapeHtml(og.locale)}" />`);
    if (og.type) lines.push(`<meta property="og:type" content="${escapeHtml(og.type)}" />`);
    if (og.title) lines.push(`<meta property="og:title" content="${escapeHtml(og.title)}" />`);
    if (og.description) {
      lines.push(`<meta property="og:description" content="${escapeHtml(og.description)}" />`);
    }
    if (og.url) lines.push(`<meta property="og:url" content="${escapeHtml(og.url)}" />`);
    if (og.siteName) {
      lines.push(`<meta property="og:site_name" content="${escapeHtml(og.siteName)}" />`);
    }
    for (const image of og.images ?? []) {
      lines.push(`<meta property="og:image" content="${escapeHtml(image.url)}" />`);
      if (image.width) {
        lines.push(`<meta property="og:image:width" content="${String(image.width)}" />`);
      }
      if (image.height) {
        lines.push(`<meta property="og:image:height" content="${String(image.height)}" />`);
      }
    }
    if (og.article?.publishedTime) {
      lines.push(
        `<meta property="article:published_time" content="${escapeHtml(og.article.publishedTime)}" />`,
      );
    }
    if (og.article?.modifiedTime) {
      lines.push(
        `<meta property="article:modified_time" content="${escapeHtml(og.article.modifiedTime)}" />`,
      );
    }
    for (const author of og.article?.authors ?? []) {
      lines.push(`<meta property="article:author" content="${escapeHtml(author)}" />`);
    }
  }

  const tw = doc.twitter;
  if (tw) {
    if (tw.card) lines.push(`<meta name="twitter:card" content="${escapeHtml(tw.card)}" />`);
    if (tw.site) lines.push(`<meta name="twitter:site" content="${escapeHtml(tw.site)}" />`);
    if (tw.creator) lines.push(`<meta name="twitter:creator" content="${escapeHtml(tw.creator)}" />`);
    if (tw.title) lines.push(`<meta name="twitter:title" content="${escapeHtml(tw.title)}" />`);
    if (tw.description) {
      lines.push(`<meta name="twitter:description" content="${escapeHtml(tw.description)}" />`);
    }
    if (tw.image) lines.push(`<meta name="twitter:image" content="${escapeHtml(tw.image)}" />`);
  }

  if (doc.schema) {
    lines.push(
      `<script type="application/ld+json">${JSON.stringify(doc.schema)}</script>`,
    );
  }

  return lines.join("\n");
}
