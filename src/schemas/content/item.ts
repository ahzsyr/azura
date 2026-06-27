import { z } from "zod";

export const contentItemSchema = z.object({
  id: z.string().optional(),
  contentTypeId: z.string().min(1),
  collectionId: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  attributes: z.string().optional(),
  blocks: z.string().optional(),
  displaySettings: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.coerce.boolean().default(false),
  isVisible: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
});

export type ContentItemInput = z.infer<typeof contentItemSchema>;
