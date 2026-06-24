import { redirect } from "next/navigation";

export default function AdminPackagesNewRedirect() {
  redirect("/admin/content/catalog-items/new");
}
