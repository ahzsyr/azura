import { redirect } from "next/navigation";

/** Legacy testimonial collections admin → unified Categories (TESTIMONIAL scope). */
export default function TestimonialsCollectionsRedirectPage() {
  redirect("/admin/categories");
}
