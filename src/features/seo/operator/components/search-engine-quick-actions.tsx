"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { runSeoSubmissionQueueAction } from "@/features/seo/actions";

export function SearchEngineQuickActions({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        disabled={pending || pendingCount === 0}
        onClick={() => {
          startTransition(async () => {
            try {
              await runAdminAction("Submitting pending URLs…", () => runSeoSubmissionQueueAction());
              router.refresh();
            } catch {
              // Toast already shows the error.
            }
          });
        }}
      >
        {pending ? "Submitting…" : `Submit pending URLs (${pendingCount})`}
      </Button>
    </div>
  );
}
