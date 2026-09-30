"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { enqueueSitemapSubmissionAction } from "@/features/seo/actions";

export function SitemapQuickActions({ sitemapUrl }: { sitemapUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              await runAdminAction(
                "Rebuilding sitemap…",
                async () => {
                  router.refresh();
                },
                "Sitemap rebuilt.",
              );
            } catch {
              // Toast already shows the error.
            }
          });
        }}
      >
        {pending ? "Rebuilding…" : "Rebuild sitemap"}
      </Button>
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            try {
              await runAdminAction("Submitting sitemap…", () => enqueueSitemapSubmissionAction());
              router.refresh();
            } catch {
              // Toast already shows the error.
            }
          });
        }}
      >
        {pending ? "Submitting…" : "Submit sitemap"}
      </Button>
      <Button asChild variant="outline">
        <Link href={sitemapUrl} target="_blank" rel="noopener noreferrer">
          View sitemap
        </Link>
      </Button>
    </div>
  );
}
