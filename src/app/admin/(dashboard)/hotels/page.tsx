import { redirect } from "next/navigation";

export default function AdminHotelsRedirect() {
  redirect("/admin/content/listings");
}
