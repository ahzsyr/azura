import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminContentTypesPage() {
  redirect("/admin/content?tab=types");
}
