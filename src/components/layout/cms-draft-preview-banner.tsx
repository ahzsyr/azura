import Link from "next/link";
import { headers } from "next/headers";
import { isCmsDraftModeEnabled } from "@/features/cms/draft-mode";

/** Shown on public URLs while Next.js Draft Mode is enabled (working revision). */
export async function CmsDraftPreviewBanner() {
  const enabled = await isCmsDraftModeEnabled().catch(() => false);
  if (!enabled) return null;

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") || "/";
  const exitHref = `/api/cms/draft?exit=1&redirect=${encodeURIComponent(pathname)}`;

  return (
    <aside
      aria-label="Draft preview"
      className="relative z-[101] flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 bg-amber-950 px-4 py-2 text-xs text-amber-50 sm:px-6"
    >
      <strong className="font-semibold">Draft preview</strong>
      <span className="text-amber-100/80">
        Showing the working revision. Anonymous visitors still see the published revision.
      </span>
      <Link
        href={exitHref}
        className="ms-auto font-medium text-amber-200 underline-offset-4 hover:underline"
        prefetch={false}
      >
        Exit preview
      </Link>
    </aside>
  );
}
