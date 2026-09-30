"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useDialogA11y } from "@/features/comparison/hooks/use-dialog-a11y";
import { cn } from "@/lib/utils";
import { PopupContentView } from "@/features/popups/components/popup-content-view";
import {
  getPopupAnimationClass,
  getPopupDesignStyle,
  getPopupPositionStyle,
} from "@/features/popups/lib/popup-styles";
import type { PopupItem } from "@/features/popups/popup.schema";

type Props = {
  item: PopupItem;
  onDismiss?: () => void;
  onOpenLinked?: (popupId: string) => void;
  preview?: boolean;
  className?: string;
};

function resolveIcon(iconName: string) {
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; strokeWidth?: number }>
  >;
  return icons[iconName] ?? LucideIcons.MessageCircle;
}

export function FloatingButtonView({ item, onDismiss, onOpenLinked, preview = false }: Props) {
  const Icon = resolveIcon(item.design.icon || "MessageCircle");
  const style = {
    ...getPopupPositionStyle(item),
    ...getPopupDesignStyle(item.design),
  };

  const handleClick = () => {
    if (item.linkedPopupId && onOpenLinked) {
      onOpenLinked(item.linkedPopupId);
      return;
    }
    if (item.content.primaryCta.href && typeof window !== "undefined") {
      window.open(
        item.content.primaryCta.href,
        item.content.primaryCta.openInNewTab ? "_blank" : "_self",
      );
    }
  };

  return (
    <div
      className={cn(
        "popup-floating-btn fixed",
        getPopupAnimationClass(item.design.animation),
        preview && "popup-preview-layer",
      )}
      style={style}
    >
      <button
        type="button"
        className="popup-floating-btn__button"
        aria-label={item.content.title || item.name}
        onClick={handleClick}
      >
        {item.design.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.design.iconUrl} alt="" className="popup-floating-btn__icon-img" />
        ) : (
          <Icon className="popup-floating-btn__icon h-5 w-5" strokeWidth={2} aria-hidden />
        )}
        {item.content.title ? (
          <span className="popup-floating-btn__label">{item.content.title}</span>
        ) : null}
      </button>
      {item.dismissible && onDismiss ? (
        <button
          type="button"
          className="popup-floating-btn__dismiss"
          aria-label="Hide button"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function ModalPopupView({ item, onDismiss, preview = false, className }: Props) {
  const [open, setOpen] = useState(true);
  const handleClose = () => {
    onDismiss?.();
  };
  const panelRef = useDialogA11y(open && !preview && !className?.includes("popup-anim-out"), handleClose);
  const hasImage = Boolean(item.content.imageUrl.trim());

  useEffect(() => {
    if (preview) return;
    const panel = panelRef.current;
    panel?.focus();
  }, [preview, panelRef]);

  if (!open && !preview) return null;

  return (
    <div
      className={cn(
        "popup-modal fixed inset-0 flex items-center justify-center p-4",
        className,
        preview && "popup-preview-layer",
      )}
      style={{ zIndex: item.zIndex }}
      role="presentation"
    >
      <button
        type="button"
        className="popup-modal__backdrop"
        aria-label="Close popup"
        onClick={item.dismissible ? handleClose : undefined}
      />
      <div
        ref={panelRef as React.RefObject<HTMLDivElement>}
        className={cn("popup-modal__panel", getPopupAnimationClass(item.design.animation))}
        style={{
          ...getPopupDesignStyle(item.design),
          ...(hasImage
            ? { maxWidth: Math.max(item.design.maxWidth || 520, 760) }
            : null),
        }}
        role="dialog"
        aria-modal="true"
        aria-label={item.content.title || item.name}
        tabIndex={-1}
      >
        {item.dismissible && onDismiss ? (
          <button
            type="button"
            className="popup-modal__close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <PopupContentView content={item.content} variant="modal" />
      </div>
    </div>
  );
}

export function SlideInPopupView({ item, onDismiss, preview = false, className }: Props) {
  const [open, setOpen] = useState(true);
  const handleClose = () => {
    onDismiss?.();
  };
  const panelRef = useDialogA11y(open && !preview && !className?.includes("popup-anim-out"), handleClose);

  const slideClass =
    item.position === "left" || item.position === "bottom-start"
      ? "popup-slide--from-start"
      : item.position === "right" || item.position === "bottom-end"
        ? "popup-slide--from-end"
        : item.position === "top"
          ? "popup-slide--from-top"
          : "popup-slide--from-bottom";

  if (!open && !preview) return null;

  const positionStyle = getPopupPositionStyle(item);

  return (
    <div
      className={cn(
        "popup-slide fixed",
        slideClass,
        className,
        preview && "popup-preview-layer",
      )}
      style={{ zIndex: item.zIndex }}
      role="presentation"
    >
      {item.dismissible && onDismiss ? (
        <button
          type="button"
          className="popup-slide__backdrop"
          aria-label="Close panel"
          onClick={handleClose}
        />
      ) : null}
      <aside
        ref={panelRef as React.RefObject<HTMLElement>}
        className={cn("popup-slide__panel", getPopupAnimationClass(item.design.animation))}
        style={{
          ...getPopupDesignStyle(item.design),
          // Keep edge offsets from position for non-full-bleed sides when useful
          ...(item.position === "custom" ? positionStyle : null),
        }}
        role="dialog"
        aria-modal="true"
        aria-label={item.content.title || item.name}
      >
        {item.dismissible && onDismiss ? (
          <button
            type="button"
            className="popup-slide__close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <PopupContentView content={item.content} variant="slideIn" />
      </aside>
    </div>
  );
}

export function PromoPopupView({ item, onDismiss, preview = false, className }: Props) {
  return (
    <div
      className={cn(
        "popup-promo fixed",
        getPopupAnimationClass(item.design.animation),
        className,
        preview && "popup-preview-layer",
      )}
      style={{
        ...getPopupPositionStyle(item),
        ...getPopupDesignStyle(item.design),
        borderRadius: 9999,
        padding: undefined,
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
      }}
      role="region"
      aria-label={item.content.title || item.name}
    >
      <PopupContentView content={item.content} variant="promo" compact />
      {item.dismissible && onDismiss ? (
        <button
          type="button"
          className="popup-promo__close"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Place restore chips away from the common WhatsApp FAB corner (bottom-end).
 * Prefer bottom-start; keep explicit top corners; remap bottom-end → bottom-start.
 */
function chipPositionForItem(item: PopupItem): PopupItem["position"] {
  if (item.position === "top-start" || item.position === "top-end") {
    return item.position;
  }
  return "bottom-start";
}

/** Session-only restore chip when closeAction is minimize. */
export function MinimizedPopupChip({
  item,
  onRestore,
  onDismiss,
}: {
  item: PopupItem;
  onRestore: () => void;
  onDismiss?: () => void;
}) {
  const Icon = resolveIcon(item.design.icon || "MessageCircle");
  const label = item.content.title || item.name || "Popup";
  const position = chipPositionForItem(item);
  // Theme-aware surface only — ignore saved light/dark text/bg overrides that break chips
  const designStyle = getPopupDesignStyle({
    ...item.design,
    backgroundColor: "",
    textColor: "",
  });
  const positionStyle = getPopupPositionStyle({
    position,
    customOffset: item.customOffset,
    zIndex: Math.max(item.zIndex, 9600),
  });

  // Bottom offset comes from CSS (--az-fab-row-*) so the chip tracks dock lift.
  if (position.startsWith("bottom")) {
    delete positionStyle.bottom;
    delete positionStyle.insetInlineStart;
    delete positionStyle.insetInlineEnd;
    delete positionStyle.left;
    delete positionStyle.right;
  }

  const style = {
    ...positionStyle,
    ...designStyle,
    borderRadius: 9999,
    padding: undefined,
    color: "var(--foreground)",
    backgroundColor: undefined,
  };

  const stackClass = position.startsWith("bottom")
    ? " popup-minimized-chip--above-fabs"
    : "";

  return (
    <div className={`popup-minimized-chip fixed${stackClass}`} style={style}>
      <button
        type="button"
        className="popup-minimized-chip__button"
        onClick={onRestore}
        aria-label={`Restore ${label}`}
      >
        {item.design.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.design.iconUrl} alt="" className="popup-floating-btn__icon-img" />
        ) : (
          <Icon className="popup-floating-btn__icon h-4 w-4" strokeWidth={2} aria-hidden />
        )}
        <span className="popup-minimized-chip__label">{label}</span>
      </button>
      {onDismiss ? (
        <button
          type="button"
          className="popup-minimized-chip__dismiss"
          aria-label="Dismiss permanently"
          onClick={onDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
