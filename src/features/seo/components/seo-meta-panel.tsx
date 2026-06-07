import type { SeoMeta } from "@prisma/client";
import { SeoMetaForm } from "./seo-meta-form";

type Props = {
  meta?: SeoMeta | null;
  pageKey?: string;
  cmsPageId?: string;
  postId?: string;
  packageId?: string;
  defaultTitleEn?: string;
  defaultTitleAr?: string;
  defaultDescEn?: string;
  defaultDescAr?: string;
  embedded?: boolean;
};

export function SeoMetaPanel(props: Props) {
  return <SeoMetaForm {...props} />;
}
