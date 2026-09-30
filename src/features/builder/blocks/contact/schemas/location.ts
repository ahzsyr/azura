import { z } from "zod";
import { contactCardBaseSchema } from "./common";
import { businessHoursSchema } from "./business-hours";

export const mapsButtonProviderSchema = z.enum([
  "google",
  "bing",
  "apple",
  "openstreetmap",
  "custom",
]);

export type MapsButtonProvider = z.infer<typeof mapsButtonProviderSchema>;

export const mapsButtonItemSchema = z.object({
  id: z.string(),
  provider: mapsButtonProviderSchema.default("google"),
  label: z.string().default(""),
  url: z.string().default(""),
  icon: z.string().default("mapPin"),
  enabled: z.boolean().default(true),
  primary: z.boolean().default(false),
});

export type MapsButtonItem = z.infer<typeof mapsButtonItemSchema>;

export const contactLocationPropsSchema = contactCardBaseSchema.extend({
  addressLine1: z.string().default(""),
  addressLine2: z.string().default(""),
  /** Free-text city (localized via EntityTranslation / legacy suffixes). */
  city: z.string().default(""),
  /** Free-text country (localized via EntityTranslation / legacy suffixes). */
  country: z.string().default(""),
  postalCode: z.string().default(""),
  /** @deprecated Kept for older saved blocks; ignored by the admin UI. */
  countryCode: z.string().default(""),
  /** @deprecated Kept for older saved blocks; ignored by the admin UI. */
  cityCode: z.string().default(""),
  /** @deprecated Prefer businessHours table; kept for backward compatibility. */
  hours: z.string().default(""),
  businessHours: businessHoursSchema,
  googleMapsUrl: z.string().default(""),
  bingMapsUrl: z.string().default(""),
  appleMapsUrl: z.string().default(""),
  osmUrl: z.string().default(""),
  showMapsButton: z.boolean().default(true),
  mapsButtonText: z.string().default("Find us on Google Maps"),
  mapsButtonsLayout: z.enum(["row", "stack", "grid"]).default("row"),
  mapsButtonsStyle: z.enum(["ghost", "outline", "filled", "links"]).default("outline"),
  /** When true, auto-build buttons from filled provider URLs. When false, use mapsButtons. */
  autoMapsButtons: z.boolean().default(true),
  mapsButtons: z.array(mapsButtonItemSchema).default([]),
});

export type ContactLocationProps = z.infer<typeof contactLocationPropsSchema>;
