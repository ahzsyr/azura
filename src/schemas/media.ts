import { z } from "zod";

export const mediaTypeSchema = z.enum(["IMAGE", "VIDEO", "DOCUMENT", "SVG"]);

export const mediaAssetSchema = z.object({
  filename: z.string().min(1),
  url: z.string().url(),
  mimeType: z.string(),
  mediaType: mediaTypeSchema,
  sizeBytes: z.number().int().nonnegative(),
  folderId: z.string().nullable().optional(),
  altEn: z.string().optional(),
  altAr: z.string().optional(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
});

export const mediaFolderSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
});
