import type {
  SeoHttpStatus,
  SeoImage,
  SeoOpenGraph,
  SeoOpenGraphType,
  SeoTwitter,
} from "./seo-document";
import { composeDocumentTitle } from "@/lib/compose-document-title";

export type OgTypeResolveInput = {
  pageType: string;
  pageKey?: string;
  status: SeoHttpStatus;
  isProfile?: boolean;
};

export function resolveOpenGraphType(input: OgTypeResolveInput): SeoOpenGraphType | undefined {
  if (input.status === 404 || input.status === 410 || input.status === 500) {
    return undefined;
  }

  if (input.isProfile) return "profile";
  if (input.pageKey === "home" || (input.pageType === "static" && input.pageKey === "home")) {
    return "website";
  }
  if (input.pageType === "static" && input.pageKey === "home") return "website";
  if (input.pageKey === "home") return "website";

  // Yoast parity: posts, pages, products, taxonomies → article
  return "article";
}

export type OpenGraphResolveInput = {
  status: SeoHttpStatus;
  pageType: string;
  pageKey?: string;
  isProfile?: boolean;
  title: string;
  description: string;
  socialTitle: string;
  canonical?: string;
  siteName: string;
  ogLocale: string;
  images: SeoImage[];
  article?: SeoOpenGraph["article"];
};

export function resolveOpenGraph(input: OpenGraphResolveInput): SeoOpenGraph | undefined {
  if (input.status === 404 || input.status === 410 || input.status === 500) {
    return {
      locale: input.ogLocale,
      title: input.socialTitle || input.siteName,
      siteName: input.siteName,
    };
  }

  const type = resolveOpenGraphType({
    pageType: input.pageType,
    pageKey: input.pageKey,
    status: input.status,
    isProfile: input.isProfile,
  });

  return {
    locale: input.ogLocale,
    type,
    title: input.socialTitle,
    description: input.description || undefined,
    url: input.canonical,
    siteName: input.siteName,
    images: input.images.length ? input.images : undefined,
    article: input.article,
  };
}

export type TwitterResolveInput = {
  enabled?: boolean;
  card: "summary" | "summary_large_image";
  site?: string;
  creator?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  ogTitle: string;
  ogDescription?: string;
  ogImage?: string;
  seoTitle: string;
  seoDescription: string;
  openGraphDisabled?: boolean;
};

function normalizeForCompare(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function resolveTwitter(input: TwitterResolveInput): SeoTwitter | undefined {
  if (input.enabled === false) return undefined;

  const resolvedTitle = input.twitterTitle?.trim() || input.ogTitle || input.seoTitle;
  const resolvedDescription =
    input.twitterDescription?.trim() || input.ogDescription || input.seoDescription;
  const resolvedImage = input.twitterImage?.trim() || input.ogImage;

  const twitter: SeoTwitter = {
    card: input.card,
  };

  if (input.site?.trim()) twitter.site = input.site.trim();
  if (input.creator?.trim()) twitter.creator = input.creator.trim();

  if (
    input.twitterTitle?.trim() &&
    normalizeForCompare(input.twitterTitle) !== normalizeForCompare(input.ogTitle)
  ) {
    twitter.title = input.twitterTitle.trim();
  }

  if (
    input.twitterDescription?.trim() &&
    normalizeForCompare(input.twitterDescription) !== normalizeForCompare(input.ogDescription)
  ) {
    twitter.description = input.twitterDescription.trim();
  }

  if (resolvedImage) {
    const ogImageNorm = normalizeForCompare(input.ogImage);
    const twImageNorm = normalizeForCompare(input.twitterImage);
    if (input.openGraphDisabled || (twImageNorm && twImageNorm !== ogImageNorm)) {
      twitter.image = resolvedImage;
    }
  }

  return twitter;
}

export function buildSocialTitle(
  pageTitle: string,
  ogTitle: string | undefined,
  siteName: string,
): string {
  const trimmedOg = ogTitle?.trim();
  if (trimmedOg) return composeDocumentTitle(trimmedOg, siteName);
  return composeDocumentTitle(pageTitle, siteName);
}
