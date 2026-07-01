import { z } from "zod";

export const productPriceSchema = z.object({
  value: z.number(),
  currency: z.enum(["USD", "EUR", "AED", "GBP", "JPY"]),
  discount: z.number().nullable().optional(),
});

export const productSchema = z
  .object({
    id: z.string().min(1),
    productTitle: z.string().min(1),
    name: z.string().optional(),
    title: z.string().optional(),
    title_extended: z.string().nullable().optional(),
    short_description: z.string().optional(),
    description: z.string().optional(),
    price: productPriceSchema,
    old_price: z.number().nullable().optional(),
    availability: z.enum(["InStock", "OutOfStock", "PreOrder", "RequestQuote"]).optional(),
    stock_status: z.enum(["in_stock", "out_of_stock", "preorder"]).optional(),
    mpn: z.string().optional(),
    manufacturer_part_number: z.string().optional(),
    ean: z.string().optional(),
    brand: z.string().optional(),
    warranty: z.string().optional(),
    category: z.union([z.string(), z.null()]).optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    media: z
      .object({
        images: z
          .array(
            z.object({
              url: z.string().optional(),
              alt: z.string().optional(),
              type: z.enum(["main", "gallery", "thumbnail"]).optional(),
            }),
          )
          .default([]),
      })
      .default({ images: [] }),
    reviews: z
      .object({
        rating: z.number(),
        count: z.number().int().nonnegative(),
      })
      .passthrough(),
  })
  .passthrough();

export type ProductSchemaOutput = z.infer<typeof productSchema>;
