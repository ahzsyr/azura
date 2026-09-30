"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { runSiteAuditAction } from "../actions";

export function RunSiteAuditButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          try {
            const { snapshotId } = await runAdminAction(
              "Running site audit…",
              () => runSiteAuditAction(),
              "Site audit finished.",
            );
            router.push(`/admin/seo/audit?snapshotId=${encodeURIComponent(snapshotId)}`);
            router.refresh();
          } catch {
            // Toast already shows the error.
          }
        });
      }}
    >
      {pending ? "Running site audit…" : "Run Site Audit"}
    </Button>
  );
}
