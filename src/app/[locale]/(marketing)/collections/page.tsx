import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Legacy /collections → /categories (permanent). */
export default async function CollectionsIndexRedirect({ params }: Props) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/categories`);
}
