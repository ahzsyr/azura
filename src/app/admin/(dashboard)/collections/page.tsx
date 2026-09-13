import { redirect } from "next/navigation";

/** Legacy /admin/collections → /admin/categories */
export default async function CatalogCollectionsAdminPage() {
  redirect("/admin/categories");
}
