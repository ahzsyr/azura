"use client";

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
        await deleteRedirectAction(id);
        router.refresh();
      }}
    >
      Delete
    </Button>
  );
}
