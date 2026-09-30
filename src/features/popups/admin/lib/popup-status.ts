import type { PopupItem } from "@/features/popups/popup.schema";

export type PopupAdminStatus = "draft" | "scheduled" | "active";

export type PopupLibraryFilter = "all" | PopupAdminStatus;

export function getPopupAdminStatus(
  item: PopupItem,
  now: Date = new Date(),
): PopupAdminStatus {
  if (!item.enabled) return "draft";

  if (item.schedule.enabled && item.schedule.startAt) {
    const start = Date.parse(item.schedule.startAt);
    if (!Number.isNaN(start) && now.getTime() < start) {
      return "scheduled";
    }
  }

  return "active";
}

export function popupStatusLabel(status: PopupAdminStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "scheduled":
      return "Scheduled";
    case "active":
      return "Active";
  }
}
