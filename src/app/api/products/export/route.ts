import { NextResponse } from "next/server";

import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

import {

  adminLocale,

  resolveConfiguredLocaleCode,

} from "@/features/catalog/admin/catalog-admin-config";

import { prefixToCode } from "@/i18n/locale-registry.server";

import { translationService } from "@/features/translation/translation.service";

import { fromDbRow } from "@/features/products/db/product-db-mapper";

import { applyProductTranslations, loadProductLocaleContext, PRODUCT_ENTITY_TYPE } from "@/features/products/db/product-translation";

import { buildFullProductExportDocument } from "@/features/products/lib/product-export-document";

import { productRepository } from "@/repositories/product.repository";



function parseLocale(raw: string | null): string {

  return resolveConfiguredLocaleCode(raw || "", adminLocale.code);

}



function escapeCsv(value: string): string {

  if (/[",\n\r]/.test(value)) {

    return `"${value.replace(/"/g, '""')}"`;

  }

  return value;

}



/** Export catalog products as JSON or CSV from the database. */

export async function GET(request: Request) {

  const unauthorized = await requireCatalogAdmin();

  if (unauthorized) return unauthorized;



  const url = new URL(request.url);

  const locale = parseLocale(url.searchParams.get("locale"));

  const format = (url.searchParams.get("format") ?? "json").toLowerCase();



  try {

    const rows = await productRepository.findAll();

    const languageCode = await prefixToCode(adminLocale.urlPrefix);

    const ctx = await loadProductLocaleContext(adminLocale.urlPrefix);

    const translationsMap = await translationService.getForEntities(

      PRODUCT_ENTITY_TYPE,

      rows.map((r) => r.id),

    );



    if (format === "csv") {

      const header = [

        "slug",

        "productTitle",

        "price",

        "priceCurrency",

        "brand",

        "category",

        "availability",

        "stockStatus",

        "sku",

      ];

      const lines = [header.join(",")];

      for (const row of rows) {

        const product = applyProductTranslations(

          fromDbRow(row),

          row.canonicalSlug,

          ctx,

          translationsMap.get(row.id) ?? [],

        );

        lines.push(

          [

            escapeCsv(row.canonicalSlug),

            escapeCsv(product.productTitle),

            String(row.priceValue ?? product.price?.value ?? 0),

            escapeCsv(row.priceCurrency ?? product.price?.currency ?? "USD"),

            escapeCsv(row.brand ?? ""),

            escapeCsv(row.category ?? ""),

            escapeCsv(row.availability ?? ""),

            escapeCsv(row.stockStatus ?? ""),

            escapeCsv(row.sku ?? ""),

          ].join(","),

        );

      }

      return new NextResponse(lines.join("\n"), {

        headers: {

          "Content-Type": "text/csv; charset=utf-8",

          "Content-Disposition": `attachment; filename="products-export-${locale}.csv"`,

        },

      });

    }



    const products = rows.map((row) => {

      const product = applyProductTranslations(

        fromDbRow(row),

        row.canonicalSlug,

        ctx,

        translationsMap.get(row.id) ?? [],

      );

      return buildFullProductExportDocument({

        ...product,

        slug: row.canonicalSlug,

      });

    });



    return NextResponse.json({

      locale,

      languageCode,

      count: products.length,

      products,

    });

  } catch (e) {

    return NextResponse.json(

      { error: e instanceof Error ? e.message : "Export failed" },

      { status: 500 },

    );

  }

}


