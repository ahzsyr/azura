import { NextResponse } from "next/server";
import { siteSettingsRepository } from "@/repositories/site-settings.repository";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

export async function GET(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const locale = resolveConfiguredLocaleCode(searchParams.get("locale") ?? "", adminLocale.code);
  const status = await siteSettingsRepository.getPublishStatus(locale);

  if (!status) {
    return NextResponse.json({
      version: 0,
      publishedVersion: 0,
      isLive: true,
    });
  }

  return NextResponse.json(status);
}
