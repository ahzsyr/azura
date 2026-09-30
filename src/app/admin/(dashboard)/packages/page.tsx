import { redirect } from "next/navigation";

export default function AdminPackagesRedirect() {
  redirect("/admin/content/catalog-items");
}
