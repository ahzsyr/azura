"use client";

import { runAdminAction } from "@/components/admin/layout/admin-action-toast";
import { deleteRedirectAction } from "@/features/seo/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function RedirectDeleteButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        await runAdminAction("Deleting redirect…", () => deleteRedirectAction(id), "Redirect deleted.");
        router.refresh();
      }}
    >
      Delete
    </Button>
  );
}
