import { permanentRedirect } from "next/navigation";
import { publicLocalePath } from "@/i18n/url-helpers";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/** Legacy /collections/[slug] → /categories/[slug] (permanent). */
export default async function CollectionDetailRedirect({ params }: Props) {
  const { locale, slug } = await params;
  permanentRedirect(publicLocalePath(locale, `/categories/${slug}`));
}
