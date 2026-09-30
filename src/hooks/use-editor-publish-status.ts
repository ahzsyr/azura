import { useEffect, useRef } from "react";
import { useAdminUiStore, type PublishStatus } from "@/stores/admin-ui-store";

export function resolveEditorPublishStatus(
  status: string | undefined,
  isVisible?: boolean | null,
): PublishStatus {
  const isLive = status === "PUBLISHED" && (isVisible ?? true);
  return isLive ? "live" : "pending";
}

/** After a plain Save (not Publish), show Saved instead of Live in the top bar. */
export function markEditorPlainSavePending(): void {
  useAdminUiStore.getState().setPublishStatus("pending");
}

/**
 * Initialize publish status once per entity open.
 * Does not overwrite pending back to live after refresh/save.
 */
export function useEditorPublishStatus(
  entityId: string | undefined,
  status: string | undefined,
  isVisible?: boolean | null,
): void {
  const setPublishStatus = useAdminUiStore((s) => s.setPublishStatus);
  const initializedEntityRef = useRef<string | null>(null);

  useEffect(() => {
    if (!entityId) return;
    if (initializedEntityRef.current === entityId) return;
    initializedEntityRef.current = entityId;
    setPublishStatus(resolveEditorPublishStatus(status, isVisible));
  }, [entityId, status, isVisible, setPublishStatus]);
}
