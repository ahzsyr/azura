import type { SeoMeta } from "@prisma/client";
import { SeoMetaForm } from "./seo-meta-form";

type Props = {
  meta?: SeoMeta | null;
  translations?: Record<string, string>;
  savedTranslations?: Record<string, string>;
  pageKey?: string;
  cmsPageId?: string;
  postId?: string;
  packageId?: string;
  defaultTitleEn?: string;
  defaultTitleAr?: string;
  defaultDescEn?: string;
  defaultDescAr?: string;
  embedded?: boolean;
  useTopBarActions?: boolean;
  onPublish?: () => boolean | void | Promise<boolean | void>;
  canPublish?: boolean;
  previewOrigin?: string;
};

export function SeoMetaPanel(props: Props) {
  return <SeoMetaForm {...props} />;
}
