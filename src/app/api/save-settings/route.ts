import { NextResponse } from "next/server";
import {
  isPatchableSiteKey,
  patchSiteSettingsKey,
  patchSiteSettingsKeys,
  writeSiteSettings,
  type PatchableSiteKey,
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
      patches?: Array<{ key: string; value: unknown }>;
      locale?: string;
    };

    const locale = resolveConfiguredLocaleCode(
      typeof body.locale === "string" ? body.locale : "",
      adminLocale.code,
    );

    if (body.type === "site" && body.data && typeof body.data === "object") {
      const { settings } = await writeSiteSettings(locale, body.data);
      return NextResponse.json({
        message: "site settings saved successfully",
        settings,
      });
    }

    if (Array.isArray(body.patches) && body.patches.length > 0) {
      const validated: Array<{ key: PatchableSiteKey; value: unknown }> = [];
      for (const patch of body.patches) {
        const key = String(patch.key);
        if (!isPatchableSiteKey(key)) {
          return NextResponse.json({ error: `Key '${key}' is not patchable` }, { status: 400 });
        }
        validated.push({ key, value: patch.value });
      }
      const { settings } = await patchSiteSettingsKeys(locale, validated);
      return NextResponse.json({
        message: "site settings updated successfully",
        settings,
      });
    }

    if (body.key !== undefined && Object.prototype.hasOwnProperty.call(body, "value")) {
      const key = String(body.key);
      if (!isPatchableSiteKey(key)) {
        return NextResponse.json({ error: `Key '${key}' is not patchable` }, { status: 400 });
      }
      const { settings } = await patchSiteSettingsKey(locale, key, body.value);
      return NextResponse.json({
        message: `site.${key} updated successfully`,
        settings,
      });
    }

    return NextResponse.json(
      { error: "Missing required fields: provide { type: 'site', data }, { key, value }, or { patches }" },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 },
    );
  }
}
