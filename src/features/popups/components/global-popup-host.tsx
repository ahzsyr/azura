"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  FloatingButtonView,
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
  const [dismissed, setDismissed] = useState(false);
  const [linkedOpen, setLinkedOpen] = useState(false);

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

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    dismiss();
  }, [dismiss]);

  const handleOpenLinked = useCallback(
    (popupId: string) => {
      onOpenLinked(popupId);
      setLinkedOpen(true);
    },
    [onOpenLinked],
  );

  if (!baseEligible || dismissed) return null;
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

  switch (item.type) {
    case "modal":
      return <ModalPopupView item={item} onDismiss={handleDismiss} />;
    case "slideIn":
      return <SlideInPopupView item={item} onDismiss={handleDismiss} />;
    case "promo":
      return <PromoPopupView item={item} onDismiss={handleDismiss} />;
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
