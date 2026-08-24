import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/** Legacy /collections/[slug] → /categories/[slug] (permanent). */
export default async function CollectionDetailRedirect({ params }: Props) {
  const { locale, slug } = await params;
  permanentRedirect(`/${locale}/categories/${slug}`);
}
