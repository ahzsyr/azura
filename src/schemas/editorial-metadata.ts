import { z } from "zod";

export const citationSourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

export const citationSourcesSchema = z.array(citationSourceSchema);

export type CitationSource = z.infer<typeof citationSourceSchema>;

export function parseCitationSources(raw: unknown): CitationSource[] {
  if (!Array.isArray(raw)) return [];
  const result = citationSourcesSchema.safeParse(raw);
  return result.success ? result.data : [];
}
