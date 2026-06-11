"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BlockCtaButtons } from "@/features/marketing-blocks/components/block-cta-buttons";
import { cn } from "@/lib/utils";
import type { StickyCtaProps } from "@/features/conversion-blocks/schemas/conversion-blocks";
import { resolveItemField } from "@/features/marketing-blocks/lib/resolve-item-locale";

type Props = StickyCtaProps & {
  locale: string;
};

export function StickyCtaView(props: Props) {
  const {
    locale,
    primaryHref,
    secondaryHref,
    variant,
    position,
    mobileVariant,
    trigger,
    triggerValue,
    dismissible,
    dismissKey,
  } = props;

  const propsRecord = props as Record<string, unknown>;
  const title = resolveItemField(propsRecord, "title", locale);
  const message = resolveItemField(propsRecord, "message", locale);
  const primaryButtonEn = resolveItemField(propsRecord, "primaryButton", locale);
  const secondaryButtonEn = resolveItemField(propsRecord, "secondaryButton", locale);

  const [visible, setVisible] = useState(trigger === "always");
  const [dismissed, setDismissed] = useState(false);
  const effectiveVariant =
    typeof window !== "undefined" && window.innerWidth < 768 && mobileVariant ? mobileVariant : variant;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (dismissKey && localStorage.getItem(`dismiss:${dismissKey}`)) {
      setDismissed(true);
      return;
    }

    if (trigger === "always") {
      setVisible(true);
      return;
    }

    if (trigger === "delayMs") {
      const t = window.setTimeout(() => setVisible(true), triggerValue);
      return () => window.clearTimeout(t);
    }

    if (trigger === "scrollPercent") {
      const onScroll = () => {
        const doc = document.documentElement;
        const scrolled = (doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100;
        if (scrolled >= triggerValue) setVisible(true);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    }

    if (trigger === "exitIntent") {
      const onLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) setVisible(true);
      };
      document.addEventListener("mouseleave", onLeave);
      return () => document.removeEventListener("mouseleave", onLeave);
    }
  }, [trigger, triggerValue, dismissKey]);

  if (!visible || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    if (dismissKey) localStorage.setItem(`dismiss:${dismissKey}`, "1");
  };

  return (
    <div
      className={cn(
        "fixed z-50 left-0 right-0 px-4 py-3 shadow-lg border bg-background/95 backdrop-blur",
        position === "top" ? "top-0 border-b" : "bottom-0 border-t",
        effectiveVariant === "fab" && "left-auto right-4 bottom-4 max-w-sm rounded-2xl border",
        effectiveVariant === "banner" && "py-4",
      )}
      role="region"
      aria-label="Call to action"
    >
      <div className={cn("mx-auto flex items-center gap-4", effectiveVariant === "fab" ? "flex-col text-center" : "max-w-5xl justify-between flex-wrap")}>
        <div className="min-w-0">
          {title && <p className="font-semibold text-sm">{title}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
        <BlockCtaButtons
          primary={{ label: primaryButtonEn, href: primaryHref }}
          secondary={
            secondaryButtonEn
              ? { label: secondaryButtonEn, href: secondaryHref }
              : undefined
          }
        />
        {dismissible && (
          <button type="button" onClick={dismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
