import { NextResponse } from "next/server";
import { getLocaleRoutingConfig } from "@/i18n/routing-config";
import { localeService } from "@/features/i18n/locale.service";

export async function GET() {
  const [config, locales] = await Promise.all([
    getLocaleRoutingConfig(),
    localeService.listEnabled(),
  ]);

  return NextResponse.json({
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    items: locales,
  });
}
