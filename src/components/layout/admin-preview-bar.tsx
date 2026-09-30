import Link from "next/link";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/features/auth/portal";
import {
  getComingSoonEnvOverrideForAdmin,
  isComingSoonEnabled,
} from "@/features/setup/setup.service";

/** Server-rendered admin-only notice for the public storefront. */
export async function AdminPreviewBar() {
  const session = await auth().catch(() => null);
  if (!isAdminRole(session?.user?.role)) return null;

  let comingSoonEnabled: boolean | null = null;
  try {
    comingSoonEnabled = await isComingSoonEnabled();
  } catch {
    comingSoonEnabled = getComingSoonEnvOverrideForAdmin();
  }

  const visitorStatus =
    comingSoonEnabled === true
      ? "Visitors see the Coming Soon page"
      : comingSoonEnabled === false
        ? "The site is live for visitors"
        : "Visitor status is temporarily unavailable";

  return (
    <aside
      aria-label="Admin preview"
      className="relative z-[100] flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 bg-slate-950 px-4 py-2 text-xs text-white sm:px-6"
    >
      <strong className="font-semibold">Admin Preview</strong>
      <span className="text-white/75">{visitorStatus}</span>
      <Link
        href="/admin/settings/site"
        className="ms-auto font-medium text-sky-300 underline-offset-4 hover:underline"
      >
        Site access settings
      </Link>
    </aside>
  );
}
