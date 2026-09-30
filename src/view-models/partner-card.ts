import type { PartnerCardTemplateId } from "@/view-models/types";

/** Flattened partner card — external links via websiteUrl/profileUrl. */
export type PartnerCardViewModel = {
  templateId: PartnerCardTemplateId;
  presetId: "partner";
  entityId: string;
  partnerProgramSlug: string;
  categorySlug: string | null;
  name: string;
  description: string;
  location: string;
  logoUrl: string;
  logoAlt: string;
  websiteUrl: string;
  profileUrl: string;
  email: string;
  phone: string;
  certifications: string[];
};
