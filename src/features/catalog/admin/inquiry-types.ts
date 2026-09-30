import type { Inquiry, InquiryType, ContentItem, User } from "@prisma/client";

export type InquiryCustomer = Pick<User, "id" | "email" | "name" | "phone">;

export type InquiryListRow = Inquiry & {
  contentItem: Pick<ContentItem, "id" | "slug" | "contentTypeId"> | null;
  user: InquiryCustomer | null;
};

export type InquiryDetail = Inquiry & {
  contentItem: Pick<ContentItem, "id" | "slug" | "contentTypeId"> | null;
  user: InquiryCustomer | null;
};

export const INQUIRY_STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "NEW", label: "New" },
  { id: "CONTACTED", label: "Contacted" },
  { id: "CLOSED", label: "Closed" },
] as const;

export const INQUIRY_TYPES: InquiryType[] = [
  "GENERAL",
  "PACKAGE",
  "CONTENT",
  "VISA",
  "CONTACT",
];

export type AccountFilter = "all" | "registered" | "guest";

export function statusBadgeVariant(status: Inquiry["status"]) {
  if (status === "NEW") return "default" as const;
  if (status === "CONTACTED") return "secondary" as const;
  return "outline" as const;
}
