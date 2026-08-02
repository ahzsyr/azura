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
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
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
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

export function ModalPopupView({ item, onDismiss, preview = false }: Props) {
  const [open, setOpen] = useState(true);
  const handleClose = () => {
    setOpen(false);
    onDismiss?.();
  };
  const panelRef = useDialogA11y(open && !preview, handleClose);

  useEffect(() => {
    if (preview) return;
    const panel = panelRef.current;
    panel?.focus();
  }, [preview, panelRef]);

  if (!open && !preview) return null;

  return (
    <div
      className={cn("popup-modal fixed inset-0 flex items-center justify-center p-4", preview && "popup-preview-layer")}
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
        style={getPopupDesignStyle(item.design)}
        role="dialog"
        aria-modal="true"
        aria-label={item.content.title || item.name}
        tabIndex={-1}
      >
        {item.dismissible && onDismiss ? (
          <button type="button" className="popup-modal__close" onClick={handleClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <PopupContentView content={item.content} />
      </div>
    </div>
  );
}

export function SlideInPopupView({ item, onDismiss, preview = false }: Props) {
  const [open, setOpen] = useState(true);
  const handleClose = () => {
    setOpen(false);
    onDismiss?.();
  };
  const panelRef = useDialogA11y(open && !preview, handleClose);

  const slideClass =
    item.position === "left" || item.position === "bottom-start"
      ? "popup-slide--from-start"
      : item.position === "right" || item.position === "bottom-end"
        ? "popup-slide--from-end"
        : item.position === "top"
          ? "popup-slide--from-top"
          : "popup-slide--from-bottom";

  if (!open && !preview) return null;

  return (
    <div
      className={cn("popup-slide fixed", preview && "popup-preview-layer")}
      style={getPopupPositionStyle(item)}
      role="presentation"
    >
      {item.dismissible && onDismiss ? (
        <button type="button" className="popup-slide__backdrop" aria-label="Close panel" onClick={handleClose} />
      ) : null}
      <aside
        ref={panelRef as React.RefObject<HTMLElement>}
        className={cn("popup-slide__panel", slideClass, getPopupAnimationClass(item.design.animation))}
        style={getPopupDesignStyle(item.design)}
        role="dialog"
        aria-modal="true"
        aria-label={item.content.title || item.name}
      >
        {item.dismissible && onDismiss ? (
          <button type="button" className="popup-slide__close" onClick={handleClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <PopupContentView content={item.content} />
      </aside>
    </div>
  );
}

export function PromoPopupView({ item, onDismiss, preview = false }: Props) {
  return (
    <div
      className={cn("popup-promo fixed", getPopupAnimationClass(item.design.animation), preview && "popup-preview-layer")}
      style={{
        ...getPopupPositionStyle(item),
        ...getPopupDesignStyle(item.design),
      }}
      role="region"
      aria-label={item.content.title || item.name}
    >
      <PopupContentView content={item.content} compact />
      {item.dismissible && onDismiss ? (
        <button type="button" className="popup-promo__close" onClick={onDismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
