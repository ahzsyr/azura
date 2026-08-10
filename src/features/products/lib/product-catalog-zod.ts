import { z } from "zod";

const productCurrencySchema = z.enum(["USD", "EUR", "AED", "GBP", "JPY"]);

/** Shape check after JSON parse (and optional normalization) — extra keys allowed. */
const productCatalogShapeSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    productTitle: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    price: z.object({
      value: z.number().finite(),
      currency: productCurrencySchema,
    }),
    media: z.object({
      images: z.array(z.unknown()),
    }),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    const t = (data.productTitle ?? data.name ?? data.title) as string | undefined;
    if (t == null || String(t).trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productTitle"],
        message: "Missing product title (productTitle, name, or title)",
      });
    }
  });

export type ProductCatalogZodResult =
  | { ok: true }
  | { ok: false; fields: string[]; message: string };

/** Returns validation issues only; `null` means OK. */
export function collectProductCatalogZodIssues(raw: unknown): ProductCatalogZodResult {
  const r = productCatalogShapeSchema.safeParse(raw);
  if (r.success) return { ok: true };
  const fields = r.error.issues.map((i) => (i.path.length ? i.path.join(".") : "(root)"));
  const message = r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
  return { ok: false, fields, message };
}
