"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isInLocalContentFavorites,
  toggleFavorite,
} from "@/features/account/lib/favorites-sync";
import { useCustomerSession } from "@/features/account/lib/use-customer-session";

type Props = {
  contentItemId: string;
  locale: string;
  label?: string;
};

export function ContentFavoriteButton({
  contentItemId,
  locale,
  label = "Save",
}: Props) {
  const { isLoggedIn } = useCustomerSession();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSaved(isInLocalContentFavorites(contentItemId));
  }, [contentItemId]);

  async function onToggle() {
    setLoading(true);
    try {
      const next = await toggleFavorite({
        entityType: "CONTENT_ITEM",
        entityId: contentItemId,
        locale,
        isLoggedIn,
      });
      setSaved(next);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      size="sm"
      className="mt-4 gap-2"
      disabled={loading}
      onClick={() => void onToggle()}
    >
      <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
      {saved ? "Saved" : label}
    </Button>
  );
}
