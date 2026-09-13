import { permanentRedirect } from "next/navigation";
import { publicLocalePath } from "@/i18n/url-helpers";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Legacy /collections → /categories (permanent). */
export default async function CollectionsIndexRedirect({ params }: Props) {
  const { locale } = await params;
  permanentRedirect(publicLocalePath(locale, "/categories"));
}
