import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { navigationCatalogService } from "@/features/navigation/navigation.service";

export const GET = defineApiRoute({
  access: "admin",
  verifySessionVersion: false,
  handler: async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") ?? "en";

    const catalog = await navigationCatalogService.getCatalog(locale);
    return NextResponse.json(catalog);
  },
});
