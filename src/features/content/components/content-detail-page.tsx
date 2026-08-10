import type { ContentItemView, ContentTypeView } from "@/features/content/content-public.types";
import { ContentItemPageRenderer } from "@/features/content/components/content-item-page-renderer";

type Props = {
  locale: string;
  contentType: ContentTypeView;
  item: ContentItemView;
  path: string;
};

export async function ContentDetailPage({ locale, contentType, item, path }: Props) {
  return (
    <ContentItemPageRenderer
      locale={locale}
      contentType={contentType}
      item={item}
      path={path}
    />
  );
}
