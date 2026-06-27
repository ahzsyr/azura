import { NextResponse } from "next/server";
import {
  publishShellChange,
  type PublishResult,
  type ShellEntityType,
} from "@/services/publish-propagation";
import { publishSiteSettings } from "@/features/catalog/site-settings.service";
import { navigationService } from "@/features/navigation/navigation.service";
import { footerService } from "@/features/footer/footer.service";
import {
  adminLocale,
  resolveConfiguredLocaleCode,
} from "@/features/catalog/admin/catalog-admin-config";
import { requireCatalogAdmin } from "@/lib/catalog-api-auth";

const SHELL_ENTITY_TYPES = new Set<ShellEntityType>([
  "header",
  "footer",
  "theme",
  "site-settings",
  "app-settings",
]);

export async function POST(request: Request) {
  const unauthorized = await requireCatalogAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      entityType?: string;
      locale?: string;
    };

    const entityType = body.entityType as ShellEntityType | undefined;
    if (!entityType || !SHELL_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json({ error: "Invalid or missing entityType" }, { status: 400 });
    }

    const locale = resolveConfiguredLocaleCode(
      typeof body.locale === "string" ? body.locale : "",
      adminLocale.code,
    );

    let publish: PublishResult;
    switch (entityType) {
      case "site-settings":
        publish = await publishSiteSettings(locale);
        break;
      case "header":
        publish = await navigationService.publishWorkspace();
        break;
      case "footer":
        publish = await footerService.publishWorkspace();
        break;
      default:
        publish = await publishShellChange({ entityType });
    }

    return NextResponse.json({ publish });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Publish failed" },
      { status: 500 },
    );
  }
}
