"use client";

import { deleteRedirectAction } from "@/features/seo/actions";
import { Button } from "@/components/ui/button";

export function DeleteRedirectButton({ id }: { id: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        await deleteRedirectAction(id);
        window.location.reload();
      }}
    >
      Delete
    </Button>
  );
}
