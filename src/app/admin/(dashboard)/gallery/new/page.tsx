import { GalleryCreatePage } from "@/features/gallery/admin/gallery-create-page";
import { localeService } from "@/features/i18n/locale.service";

export default async function AdminGalleryNewPage() {
  const locales = await localeService.listEnabled();
  return <GalleryCreatePage locales={locales} />;
}
