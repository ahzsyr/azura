"use client";

import { useEffect } from "react";
import {
  applyBlockHighlight,
  listenToPreviewMessages,
  signalPreviewReady,
} from "./preview-bridge";
import { initCursor } from "@/features/theme/effects/cursors";
import { initBackground } from "@/features/theme/effects/backgrounds";
import { initTextEffects } from "@/features/theme/effects/text";

type Props = {
  editorMode?: boolean;
  cursorEffect?: string | null;
  backgroundEffect?: string | null;
  textEffect?: string | null;
};

export function PreviewPageClient({
  editorMode = false,
  cursorEffect,
  backgroundEffect,
  textEffect,
}: Props) {
  useEffect(() => {
    let prevSelected: number | null = null;

    if (cursorEffect && cursorEffect !== "default") {
      initCursor(cursorEffect);
    }
    if (backgroundEffect) {
      initBackground(backgroundEffect);
    }
    if (textEffect) {
      initTextEffects(textEffect);
    }

    const unsubBridge = listenToPreviewMessages({
      onSelect: ({ index }) => {
        applyBlockHighlight(index, prevSelected);
        prevSelected = index;
      },
      onDeselect: () => {
        applyBlockHighlight(null, prevSelected);
        prevSelected = null;
      },
      onScrollTo: ({ index }) => {
        document
          .querySelector(`[data-block-index="${index}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      },
      onOutlines: ({ enabled }) => {
        document.body.classList.toggle("az-preview-outlines", enabled);
      },
      onReload: ({ url }) => {
        if (url) window.location.href = url;
        else window.location.reload();
      },
      onThemeMode: ({ mode }) => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        if (mode === "dark") {
          root.classList.add("dark");
        }
        root.style.colorScheme = mode;
      },
    });

    const onLegacyMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; index?: number; mode?: string };
      if (data.type === "azura-theme-mode" && (data.mode === "dark" || data.mode === "light")) {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        if (data.mode === "dark") {
          root.classList.add("dark");
        }
        root.style.colorScheme = data.mode;
      }
      if (data.type === "azura-editor-block-click" && typeof data.index === "number") {
        window.parent?.postMessage({ type: "azura-editor-block-click", index: data.index }, "*");
      }
      if (data.type === "azura-editor-select" && editorMode) {
        applyBlockHighlight(data.index ?? null, prevSelected);
        prevSelected = data.index ?? null;
      }
    };

    window.addEventListener("message", onLegacyMessage);

    if (editorMode) {
      const main = document.querySelector(".preview-main");
      main?.querySelectorAll("[data-block-index]").forEach((el, i) => {
        el.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          window.parent?.postMessage({ type: "azura-editor-block-click", index: i }, "*");
        });
      });
    }

    signalPreviewReady();

    return () => {
      unsubBridge();
      window.removeEventListener("message", onLegacyMessage);
    };
  }, [editorMode, cursorEffect, backgroundEffect, textEffect]);

  return null;
}
