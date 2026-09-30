import type { PopupItem, PopupType } from "@/features/popups/popup.schema";
import { getPopupAdminStatus, popupStatusLabel } from "@/features/popups/admin/lib/popup-status";

export function popupTypeLabel(type: PopupType): string {
  switch (type) {
    case "floatingButton":
      return "Floating Button";
    case "modal":
      return "Modal";
    case "slideIn":
      return "Slide In";
    case "promo":
      return "Promo";
  }
}

export function summarizeTargeting(item: PopupItem): string {
  const { mode, paths } = item.pageTargeting;
  let pages = "All pages";
  if (mode === "include" && paths.length) {
    pages = paths.length === 1 ? paths[0]! : `${paths.length} pages`;
  } else if (mode === "exclude" && paths.length) {
    pages = `All except ${paths.length === 1 ? paths[0]! : `${paths.length} paths`}`;
  } else if (mode === "include") {
    pages = "Specific pages";
  } else if (mode === "exclude") {
    pages = "Exclude paths";
  }

  const devices: string[] = [];
  if (item.devices.desktop) devices.push("Desktop");
  if (item.devices.tablet) devices.push("Tablet");
  if (item.devices.mobile) devices.push("Mobile");
  const deviceLabel =
    devices.length === 3 ? "All devices" : devices.length ? devices.join(", ") : "No devices";

  return `${pages} · ${deviceLabel}`;
}

export function summarizeTrigger(item: PopupItem): string {
  if (item.type === "floatingButton") return "Always available";

  switch (item.trigger.type) {
    case "pageLoad":
      return "On page load";
    case "delayMs": {
      const seconds = Math.round(item.trigger.value / 1000);
      return seconds <= 0 ? "Immediately" : `After ${seconds}s`;
    }
    case "scrollPercent":
      return `After ${item.trigger.value}% scroll`;
    case "exitIntent":
      return "On exit intent";
    case "click":
      return item.trigger.clickSelector
        ? `On click (${item.trigger.clickSelector})`
        : "On element click";
    default:
      return "On page load";
  }
}

export function summarizeFrequency(item: PopupItem): string {
  switch (item.frequency.mode) {
    case "always":
      return "Every time";
    case "once":
      return "Once";
    case "session":
      return "Once per session";
    case "daily":
      return "Once per day";
    case "custom":
      return `Custom (${item.frequency.maxImpressions}× / ${item.frequency.cooldownHours}h)`;
    default:
      return "Once per session";
  }
}

export function formatUpdatedAt(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function summarizeCloseBehavior(item: PopupItem): string | null {
  if (item.type === "floatingButton") return null;
  const parts: string[] = [];
  if (item.autoHideMs > 0) {
    const seconds = Math.round(item.autoHideMs / 1000);
    parts.push(`Auto-hide ${seconds}s`);
  }
  if (item.closeAction === "minimize") {
    parts.push("Minimize on close");
  }
  return parts.length ? parts.join(" · ") : null;
}

export function buildEditorSummary(item: PopupItem): string {
  const status = popupStatusLabel(getPopupAdminStatus(item));
  const close = summarizeCloseBehavior(item);
  return [
    status,
    popupTypeLabel(item.type),
    summarizeTargeting(item),
    summarizeTrigger(item),
    summarizeFrequency(item),
    close,
  ]
    .filter(Boolean)
    .join(" · ");
}
