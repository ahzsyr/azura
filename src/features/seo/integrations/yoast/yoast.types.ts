import type { ResolvedSeoDocument } from "@/features/seo/core/seo-document";

export type YoastHeadJson = {
  title?: string;
  description?: string;
  robots?: Record<string, string>;
  canonical?: string;
  og_locale?: string;
  og_type?: string;
  og_title?: string;
  og_description?: string;
  og_url?: string;
  og_site_name?: string;
  og_image?: Array<{ url: string; width?: number; height?: number }>;
  article_publisher?: string;
  article_author?: string;
  article_published_time?: string;
  article_modified_time?: string;
  twitter_card?: string;
  twitter_site?: string;
  twitter_creator?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  schema?: {
    "@context": "https://schema.org";
    "@graph": Record<string, unknown>[];
  };
};

export type YoastHeadResponse = {
  html: string;
  json: YoastHeadJson;
  status: number;
};
