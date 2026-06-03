import { NextResponse } from "next/server";
import {
  isPatchableSiteKey,
  patchSiteSettingsKey,
  writeSiteSettings,
} from "@/features/catalog/site-settings.service";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      type?: string;
      data?: Record<string, unknown>;
      key?: string;
      value?: unknown;
      locale?: string;
    };

    const locale = resolveConfiguredLocaleCode(
      typeof body.locale === "string" ? body.locale : "",
      adminLocale.code,
    );

    if (body.type === "site" && body.data && typeof body.data === "object") {
      await writeSiteSettings(locale, body.data);
      return NextResponse.json({ message: "site settings saved successfully" });
    }

    if (body.key !== undefined && body.value !== undefined) {
      const key = String(body.key);
      if (!isPatchableSiteKey(key)) {
        return NextResponse.json({ error: `Key '${key}' is not patchable` }, { status: 400 });
      }
      await patchSiteSettingsKey(locale, key, body.value);
      return NextResponse.json({ message: `site.${key} updated successfully` });
    }

    return NextResponse.json(
      { error: "Missing required fields: provide { type: 'site', data } or { key, value }" },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}
