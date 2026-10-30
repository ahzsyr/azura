import { redirect } from "next/navigation";
import { requireAdvancedSeoPage } from "@/modules/advanced-seo/guard";

export default async function SearchOperationsIndexPage() {
  await requireAdvancedSeoPage();
  redirect("/admin/seo/search-operations/overview");
}
