import { redirect } from "next/navigation";

export default function AdminSeoRootRedirect() {
  redirect("/admin/seo/metadata");
}
