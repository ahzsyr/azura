"use client";

import { useLayoutEffect } from "react";
import { applyLocaleBoot } from "@/lib/locale-boot/apply-locale-boot";
import type { LocaleBootPayload } from "@/lib/locale-boot/locale-boot-payload";

type Props = {
  payload: LocaleBootPayload;
};

/**
 * Applies locale shell boot after hydration so the server HTML tree stays
 * stable for React (pre-hydration DOM writes cause error #418).
 */
export function LocaleBootClient({ payload }: Props) {
  useLayoutEffect(() => {
    applyLocaleBoot(payload);
    document.documentElement.dataset.hydrated = "true";
    document.dispatchEvent(new CustomEvent("azura:hydrated"));
  }, [payload]);

  return null;
}
