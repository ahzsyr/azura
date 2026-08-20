import { redirect } from "next/navigation";

/**
 * Legacy post categories admin → unified Categories hub (POST scope).
 * Full POST editor remains available via Categories until scoped tabs land.
 */
export default async function PostCategoriesRedirectPage() {
  redirect("/admin/categories");
}
