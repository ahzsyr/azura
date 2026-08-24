"use client";

import { useEffect, useState } from "react";
import type { PopupTrigger, PopupTriggerType } from "@/features/popups/popup.schema";

type Options = {
  trigger: PopupTrigger;
  enabled?: boolean;
  onTriggered?: () => void;
};

function mapTriggerType(type: PopupTriggerType): PopupTriggerType {
  return type;
}

export function usePopupTrigger({ trigger, enabled = true, onTriggered }: Options) {
  const [triggered, setTriggered] = useState(false);
  const triggerType = mapTriggerType(trigger.type);

  useEffect(() => {
    if (!enabled || triggered) return;

    if (triggerType === "pageLoad") {
      setTriggered(true);
      onTriggered?.();
      return;
    }

    if (typeof window === "undefined") return;

    if (triggerType === "delayMs") {
      const delay = Math.max(0, trigger.value);
      const timer = window.setTimeout(() => {
        setTriggered(true);
        onTriggered?.();
      }, delay);
      return () => window.clearTimeout(timer);
    }

    if (triggerType === "scrollPercent") {
      const threshold = Math.min(100, Math.max(0, trigger.value));
      let raf = 0;

      const onScroll = () => {
        if (raf) return;
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          const doc = document.documentElement;
          const maxScroll = doc.scrollHeight - doc.clientHeight;
          const scrolled = maxScroll <= 0 ? 100 : (doc.scrollTop / maxScroll) * 100;
          if (scrolled >= threshold) {
            setTriggered(true);
            onTriggered?.();
          }
        });
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => {
        window.removeEventListener("scroll", onScroll);
        if (raf) window.cancelAnimationFrame(raf);
      };
    }

    if (triggerType === "exitIntent") {
      const onLeave = (event: MouseEvent) => {
        if (event.clientY <= 0) {
          setTriggered(true);
          onTriggered?.();
        }
      };
      document.addEventListener("mouseleave", onLeave);
      return () => document.removeEventListener("mouseleave", onLeave);
    }

    if (triggerType === "click") {
      const selector = trigger.clickSelector.trim();
      if (!selector) return;

      const onClick = (event: MouseEvent) => {
        const target = event.target as Element | null;
        if (target?.closest(selector)) {
          setTriggered(true);
          onTriggered?.();
        }
      };

      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [enabled, triggered, trigger, triggerType, onTriggered]);

  const fireManual = () => {
    if (!triggered) {
      setTriggered(true);
      onTriggered?.();
    }
  };

  return { triggered, fireManual };
}
