import { z } from "zod";
import { contactCardBaseSchema } from "./common";

export const mapProviderSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("google"),
    embedUrl: z.string().default(""),
    zoom: z.coerce.number().min(1).max(20).default(14),
  }),
  z.object({
    type: z.literal("bing"),
    embedUrl: z.string().default(""),
    zoom: z.coerce.number().min(1).max(20).default(14),
  }),
  z.object({
    type: z.literal("openstreetmap"),
    embedUrl: z.string().default(""),
    zoom: z.coerce.number().min(1).max(20).default(14),
  }),
  z.object({
    type: z.literal("custom"),
    embedUrl: z.string().default(""),
  }),
]);

export type MapProvider = z.infer<typeof mapProviderSchema>;

export const contactMapPropsSchema = contactCardBaseSchema.extend({
  provider: mapProviderSchema.default({ type: "google", embedUrl: "", zoom: 14 }),
  height: z.coerce.number().min(120).max(900).default(400),
  roundedCorners: z.boolean().default(true),
  showMarker: z.boolean().default(true),
  markerLabel: z.string().default(""),
  showDirections: z.boolean().default(true),
  directionsText: z.string().default("Get directions"),
  directionsUrl: z.string().default(""),
  showOverlayCard: z.boolean().default(false),
  overlayHours: z.string().default(""),
});

export type ContactMapProps = z.infer<typeof contactMapPropsSchema>;
