import type { Metadata } from "next";
import type { PageMeta } from "@/lib/seo";

export type MetadataContributorContext = PageMeta & {
  siteUrl: string;
  resolvedSiteName: string;
  displayTitle: string;
  socialTitle: string;
  url: string;
  image: string;
  keywords?: string[];
  ogLocale: string;
  languages?: Record<string, string>;
};

export type MetadataContributor = {
  id: string;
  contribute: (ctx: MetadataContributorContext, base: Metadata) => Metadata;
};

export const canonicalContributor: MetadataContributor = {
  id: "canonical",
  contribute(ctx, base) {
    return {
      ...base,
      alternates: {
        ...base.alternates,
        canonical: ctx.url,
      },
    };
  },
};

export const alternateLanguagesContributor: MetadataContributor = {
  id: "alternate-languages",
  contribute(ctx, base) {
    if (!ctx.languages) return base;
    return {
      ...base,
      alternates: {
        ...base.alternates,
        languages: ctx.languages,
      },
    };
  },
};

export const openGraphContributor: MetadataContributor = {
  id: "open-graph",
  contribute(ctx, base) {
    return {
      ...base,
      openGraph: {
        title: ctx.socialTitle,
        description: ctx.description,
        url: ctx.url,
        siteName: ctx.resolvedSiteName,
        locale: ctx.ogLocale,
        type: "website",
        images: [{ url: ctx.image, width: 1200, height: 630, alt: ctx.title }],
      },
    };
  },
};

export const twitterContributor: MetadataContributor = {
  id: "twitter",
  contribute(ctx, base) {
    return {
      ...base,
      twitter: {
        card: ctx.twitterCard ?? "summary_large_image",
        title: ctx.socialTitle,
        description: ctx.description,
        images: [ctx.image],
      },
    };
  },
};

export const robotsContributor: MetadataContributor = {
  id: "robots",
  contribute(ctx, base) {
    if (!ctx.robots?.trim()) return base;
    const lower = ctx.robots.toLowerCase();
    return {
      ...base,
      robots: {
        index: !lower.includes("noindex"),
        follow: !lower.includes("nofollow"),
        googleBot: {
          index: !lower.includes("noindex"),
          follow: !lower.includes("nofollow"),
        },
      },
    };
  },
};

export const keywordsContributor: MetadataContributor = {
  id: "keywords",
  contribute(ctx, base) {
    if (!ctx.keywords?.length) return base;
    return { ...base, keywords: ctx.keywords };
  },
};

export const DEFAULT_METADATA_CONTRIBUTORS: MetadataContributor[] = [
  canonicalContributor,
  alternateLanguagesContributor,
  openGraphContributor,
  twitterContributor,
  robotsContributor,
  keywordsContributor,
];

export function applyMetadataContributors(
  ctx: MetadataContributorContext,
  contributors: MetadataContributor[] = DEFAULT_METADATA_CONTRIBUTORS
): Metadata {
  let metadata: Metadata = {
    title: ctx.displayTitle,
    description: ctx.description,
  };
  for (const contributor of contributors) {
    metadata = contributor.contribute(ctx, metadata);
  }
  return metadata;
}
