import type { ContentStatus } from "@prisma/client";
import type { PageBlocks } from "./builder";

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
};

export type PostPublic = {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  contentEn: string | null;
  contentAr: string | null;
  blocks: PageBlocks;
  featuredImageUrl: string | null;
  authorName: string | null;
  publishedAt: Date | null;
};
