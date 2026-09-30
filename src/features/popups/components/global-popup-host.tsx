"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  FloatingButtonView,
  MinimizedPopupChip,
  ModalPopupView,
  PromoPopupView,
  SlideInPopupView,
} from "@/features/popups/components/popup-renderers";
import { useDeviceType } from "@/features/popups/hooks/use-device-type";
import { usePopupFrequency } from "@/features/popups/hooks/use-popup-frequency";
import { usePopupTrigger } from "@/features/popups/hooks/use-popup-trigger";
import {
  isWithinSchedule,
  matchesDeviceTargeting,
  matchesPageTargeting,
} from "@/features/popups/lib/popup-targeting";
import type { PopupItem } from "@/features/popups/popup.schema";
import type { ResolvedSitePopups } from "@/features/popups/resolve-site-popups";

type Props = {
  settings: ResolvedSitePopups;
  previewItemId?: string;
};

type Presentation = "open" | "minimized" | "dismissed";

const EXIT_MS = 220;

function PopupItemHost({
  item,
  allItems,
  onOpenLinked,
  forceVisible = false,
}: {
  item: PopupItem;
  allItems: PopupItem[];
  onOpenLinked: (id: string) => void;
  forceVisible?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const device = useDeviceType();
  const [presentation, setPresentation] = useState<Presentation>("open");
  const [exiting, setExiting] = useState(false);
  const [linkedOpen, setLinkedOpen] = useState(false);
  const exitTimerRef = useRef<number | null>(null);

  const pageMatch = matchesPageTargeting(item.pageTargeting, pathname);
  const deviceMatch = matchesDeviceTargeting(item.devices, device);
  const scheduleMatch = isWithinSchedule(item.schedule);

  const baseEligible =
    forceVisible || (item.enabled && pageMatch && deviceMatch && scheduleMatch);

  const { allowed, recordShow, dismiss } = usePopupFrequency({
    frequency: item.frequency,
    dismissKey: item.dismissKey,
    enabled: baseEligible && !forceVisible,
  });

  const isFloating = item.type === "floatingButton";
  const triggerEnabled = baseEligible && (forceVisible || allowed || isFloating);

  const { triggered, fireManual } = usePopupTrigger({
    trigger: item.trigger,
    enabled: triggerEnabled && !isFloating,
  });

  useEffect(() => {
    if (!forceVisible && baseEligible && allowed && triggered && !isFloating) {
      recordShow();
    }
  }, [forceVisible, baseEligible, allowed, triggered, isFloating, recordShow]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setPresentation("dismissed");
    setExiting(false);
    dismiss();
  }, [dismiss]);

  const finishClose = useCallback(() => {
    if (item.closeAction === "minimize" && !isFloating) {
      setPresentation("minimized");
      setExiting(false);
      return;
    }
    handleDismiss();
  }, [handleDismiss, isFloating, item.closeAction]);

  const handleClose = useCallback(() => {
    if (exiting || presentation !== "open") return;
    setExiting(true);
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      finishClose();
    }, EXIT_MS);
  }, [exiting, finishClose, presentation]);

  const handleRestore = useCallback(() => {
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    setExiting(false);
    setPresentation("open");
  }, []);

  // Auto-hide after delay when fully open
  useEffect(() => {
    if (isFloating || presentation !== "open" || exiting) return;
    if (!item.autoHideMs || item.autoHideMs <= 0) return;
    if (!baseEligible) return;
    if (!forceVisible && (!allowed || !triggered)) return;

    const timer = window.setTimeout(() => {
      handleClose();
    }, item.autoHideMs);

    return () => window.clearTimeout(timer);
  }, [
    allowed,
    baseEligible,
    exiting,
    forceVisible,
    handleClose,
    isFloating,
    item.autoHideMs,
    presentation,
    triggered,
  ]);

  const handleOpenLinked = useCallback(
    (popupId: string) => {
      onOpenLinked(popupId);
      setLinkedOpen(true);
    },
    [onOpenLinked],
  );

  if (!baseEligible || presentation === "dismissed") return null;
  if (!forceVisible && !isFloating && (!allowed || !triggered)) return null;

  if (isFloating) {
    return (
      <FloatingButtonView
        item={item}
        onDismiss={item.dismissible ? handleDismiss : undefined}
        onOpenLinked={handleOpenLinked}
      />
    );
  }

  if (linkedOpen && item.linkedPopupId) {
    const linked = allItems.find((entry) => entry.id === item.linkedPopupId);
    if (linked) {
      return (
        <PopupItemHost
          item={{ ...linked, trigger: { type: "pageLoad", value: 0, clickSelector: "" } }}
          allItems={allItems}
          onOpenLinked={onOpenLinked}
          forceVisible
        />
      );
    }
  }

  if (presentation === "minimized") {
    return (
      <MinimizedPopupChip
        item={item}
        onRestore={handleRestore}
        onDismiss={handleDismiss}
      />
    );
  }

  const closeHandler = item.dismissible ? handleClose : undefined;
  const exitClass = exiting ? "popup-anim-out" : undefined;

  switch (item.type) {
    case "modal":
      return (
        <ModalPopupView item={item} onDismiss={closeHandler} className={exitClass} />
      );
    case "slideIn":
      return (
        <SlideInPopupView item={item} onDismiss={closeHandler} className={exitClass} />
      );
    case "promo":
      return (
        <PromoPopupView item={item} onDismiss={closeHandler} className={exitClass} />
      );
    default:
      return (
        <FloatingButtonView
          item={item}
          onDismiss={handleDismiss}
          onOpenLinked={() => fireManual()}
        />
      );
  }
}

export function GlobalPopupHost({ settings, previewItemId }: Props) {
  const [manualOpenIds, setManualOpenIds] = useState<string[]>([]);

  const items = useMemo(() => {
    if (previewItemId) {
      const preview = settings.items.find((item) => item.id === previewItemId);
      return preview ? [preview] : settings.activeItems;
    }
    return settings.activeItems;
  }, [settings, previewItemId]);

  const handleOpenLinked = useCallback((id: string) => {
    setManualOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  if (!settings.enabled && !previewItemId) return null;
  if (items.length === 0) return null;

  return (
    <div className="popup-host" aria-live="polite">
      {items.map((item) => (
        <PopupItemHost
          key={item.id}
          item={item}
          allItems={settings.items}
          onOpenLinked={handleOpenLinked}
          forceVisible={previewItemId === item.id || manualOpenIds.includes(item.id)}
        />
      ))}
    </div>
  );
}
