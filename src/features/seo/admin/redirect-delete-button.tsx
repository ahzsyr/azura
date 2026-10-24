"use client";

import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { deleteRedirectAction } from "@/features/seo/actions";
import { useAdminUiStore } from "@/stores/admin-ui-store";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function RedirectDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const markPublishPending = useAdminUiStore((s) => s.markPublishPending);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        await runAdminAction("Deleting redirect…", () => deleteRedirectAction(id), "Redirect deleted.");
        markPublishPending();
        router.refresh();
      }}
    >
      Delete
    </Button>
  );
}
