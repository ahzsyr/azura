import { redirect } from "next/navigation";

export default function AdminFaqsNewPage() {
  redirect("/admin/faqs?create=1");
}
