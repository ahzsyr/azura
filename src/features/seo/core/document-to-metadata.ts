import type { Metadata } from "next";
import type { ResolvedSeoDocument, SeoRobotsDirective } from "./seo-document";

function hasText(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function mapRobotsToMetadata(robots: SeoRobotsDirective): NonNullable<Metadata["robots"]> {
  const index = robots.index === "index";
  const follow = robots.follow === "follow";

  return {
    index,
    follow,
    googleBot: {
      index,
      follow,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  };
}

/**
 * Map ResolvedSeoDocument → Next.js Metadata (field transformation only).
 */
export function documentToMetadata(doc: ResolvedSeoDocument): Metadata {
  const metadata: Metadata = {};

  if (hasText(doc.title)) {
    metadata.title = { absolute: doc.title.trim() };
  } else if (hasText(doc.pageTitle)) {
    metadata.title = { absolute: doc.pageTitle.trim() };
  }

  if (hasText(doc.description)) {
    metadata.description = doc.description.trim();
  }

  if (doc.canonical || doc.alternates?.languages) {
    metadata.alternates = {};
    if (doc.canonical) {
      metadata.alternates.canonical = doc.canonical;
    }
    if (doc.alternates?.languages && Object.keys(doc.alternates.languages).length > 0) {
      metadata.alternates.languages = doc.alternates.languages;
    }
  }

  if (doc.robots) {
    metadata.robots = mapRobotsToMetadata(doc.robots);
  }

  if (doc.openGraph) {
    const og = doc.openGraph;
    const openGraph: Record<string, unknown> = {};

    if (og.locale) openGraph.locale = og.locale;
    if (hasText(og.title)) openGraph.title = og.title.trim();
    if (og.siteName) openGraph.siteName = og.siteName;
    if (og.type) openGraph.type = og.type;
    if (hasText(og.description)) openGraph.description = og.description.trim();
    if (og.url) openGraph.url = og.url;
    if (og.images?.length) {
      openGraph.images = og.images.map((image) => ({
        url: image.url,
        width: image.width,
        height: image.height,
        alt: image.alt,
      }));
    }
    if (og.article) {
      if (og.article.publishedTime) openGraph.publishedTime = og.article.publishedTime;
      if (og.article.modifiedTime) openGraph.modifiedTime = og.article.modifiedTime;
      if (og.article.authors?.length) openGraph.authors = og.article.authors;
    }

    if (Object.keys(openGraph).length > 0) {
      metadata.openGraph = openGraph as NonNullable<Metadata["openGraph"]>;
    }
  }

  if (doc.twitter) {
    const tw = doc.twitter;
    const twitter: NonNullable<Metadata["twitter"]> = {
      card: tw.card ?? "summary_large_image",
    };

    if (tw.site) twitter.site = tw.site;
    if (tw.creator) twitter.creator = tw.creator;
    if (tw.title) twitter.title = tw.title;
    if (tw.description) twitter.description = tw.description;
    if (tw.image) twitter.images = [tw.image];

    metadata.twitter = twitter;
  }

  if (doc.focusKeywords?.length) {
    metadata.keywords = doc.focusKeywords;
  }

  return metadata;
}
