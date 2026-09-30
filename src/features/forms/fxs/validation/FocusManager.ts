"use client";

import { useCallback } from "react";
import { announceValidationError } from "@/platform/schema-ui/a11y/a11y-layer";
import { firstInvalidFieldId } from "./ValidationStateMachine";

export function focusFieldById(fieldId: string): boolean {
  if (typeof document === "undefined") return false;
  const safe = fieldId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const selectors = [
    `[data-fxs-field-id="${safe}"] input, [data-fxs-field-id="${safe}"] textarea, [data-fxs-field-id="${safe}"] select`,
    `#${CSS.escape ? CSS.escape(fieldId) : fieldId}`,
    `[name="${safe}"]`,
    `[data-schema-id="${safe}"] input, [data-schema-id="${safe}"] textarea, [data-schema-id="${safe}"] select`,
  ];
  for (const sel of selectors) {
    try {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        el.focus({ preventScroll: false });
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        return true;
      }
    } catch {
      // ignore invalid selector
    }
  }
  return false;
}

export function useFocusManager() {
  const focusFirstInvalid = useCallback(
    (errors: Record<string, string>, order?: string[]) => {
      const id = firstInvalidFieldId(errors, order);
      if (!id) return null;
      const label = errors[id] ?? id;
      announceValidationError(`Please fix: ${label}`);
      focusFieldById(id);
      return id;
    },
    [],
  );

  return { focusFirstInvalid, focusFieldById };
}
