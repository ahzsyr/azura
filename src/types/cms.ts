import type { ContentStatus } from "@prisma/client";
import type { PageBlocks } from "./builder";

export type CitationSourcePublic = { label: string; url: string };

export type CmsPagePublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  status: ContentStatus;
  blocks: PageBlocks;
  templateKey: string | null;
  publishedAt: Date | null;
  authorName: string | null;
  sources: CitationSourcePublic[];
};

export type PostPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  blocks: PageBlocks;
  featuredImageUrl: string | null;
  authorName: string | null;
  publishedAt: Date | null;
  sources: CitationSourcePublic[];
};
