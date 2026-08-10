"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { runSiteAuditAction } from "../actions";

export function RunSiteAuditButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const { snapshotId } = await runSiteAuditAction();
          router.push(`/admin/seo?snapshotId=${encodeURIComponent(snapshotId)}`);
          router.refresh();
        });
      }}
    >
      {pending ? "Running site audit…" : "Run Site Audit"}
    </Button>
  );
}
