import { redirect } from "next/navigation";

export default function AdminHotelsNewRedirect() {
  redirect("/admin/content/listings/new");
}
