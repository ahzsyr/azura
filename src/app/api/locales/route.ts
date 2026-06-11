import { NextResponse } from "next/server";
import { localeService } from "@/features/i18n/locale.service";

export async function GET() {
  const [config, locales] = await Promise.all([
    localeService.getRoutingConfig(),
    localeService.listEnabled(),
  ]);

  return NextResponse.json({
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    items: locales,
  });
}
