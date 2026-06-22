import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BRAND_NAME } from "@/config/site";
import { ZodError } from "zod";
import { setupCompleteSchema } from "@/features/setup/setup-complete.schema";
import {
  isSetupDatabaseReady,
  isValidSetupToken,
  readSystemSettings,
  writeSystemSettings,
} from "@/features/setup/setup.service";
import {
  invalidateSetupStatusCache,
  setCachedSetupStatus,
} from "@/features/setup/setup-middleware-cache";
import { refreshMiddlewareManifestBestEffort } from "@/features/setup/refresh-middleware-manifest.server";
import {
  getSetupCompleteCookieValue,
  setupCompleteCookieOptions,
  SETUP_COMPLETE_COOKIE,
} from "@/features/setup/setup-cookie";
import { importDemoProfile } from "@/features/setup/demo-import/demo-import.service";
import { ensureBaselineCmsAndLocales } from "@/features/setup/ensure-baseline-cms";
import { invalidateSiteSettingsCache } from "@/features/catalog/site-settings.service";
import { revalidateAllWiredMarketingPaths } from "@/features/cms/revalidate-wired-marketing";
import { revalidateJsonNamespace, revalidateTheme } from "@/services/cache";
import { localeService } from "@/features/i18n/locale.service";

/** Remote Supabase pooler latency can exceed Prisma's default 5s interactive transaction limit. */
const SETUP_COMPLETE_TX_OPTIONS = { maxWait: 30_000, timeout: 120_000 };

function formatSetupError(error: unknown): string {
  if (error instanceof ZodError) {
    return "Invalid form data";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Setup failed";
}

export async function POST(request: Request) {
  try {
    if (!(await isSetupDatabaseReady())) {
      return NextResponse.json(
        { error: "Database connection failed. Fix DATABASE_URL and restart the app before completing setup." },
        { status: 503 },
      );
    }
    const body = await request.json();
    const data = setupCompleteSchema.parse(body);

    const settingsBefore = await readSystemSettings();
    if (settingsBefore.setupComplete && !isValidSetupToken(data.setupToken)) {
      return NextResponse.json({ error: "Setup already completed" }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(data.adminPassword, 12);
    const completedAt = new Date().toISOString();

    await prisma.$transaction(async (tx) => {
      const existingAdmin = await tx.user.findFirst({
        where: { role: "ADMIN" },
        orderBy: { createdAt: "asc" },
      });

      if (existingAdmin) {
        await tx.user.update({
          where: { id: existingAdmin.id },
          data: {
            email: data.adminEmail,
            passwordHash,
            name: data.adminName,
            role: "ADMIN",
          },
        });
      } else {
        await tx.user.create({
          data: {
            email: data.adminEmail,
            passwordHash,
            name: data.adminName,
            role: "ADMIN",
          },
        });
      }

      const tagline = data.tagline?.trim() || "Solutions";
      const company = await tx.companyInfo.upsert({
        where: { id: "default" },
        update: {
          name: data.siteName,
        },
        create: {
          id: "default",
          name: data.siteName,
          registrationNo: "",
          licenseInfo: "",
          phone: "",
          whatsapp: "",
          email: data.adminEmail,
          socialLinks: {},
          trustBadges: [],
        },
      });
      const { syncLegacyShapeTranslationsTx } = await import(
        "@/features/portal/lib/portal-translation"
      );
      await syncLegacyShapeTranslationsTx(tx, "CompanyInfo", company.id, {
        taglineEn: tagline,
        taglineAr: tagline,
        storyEn: `${data.siteName} — your trusted partner.`,
        storyAr: `${data.siteName} — شريكك الموثوق.`,
        missionEn: "Deliver excellence in every interaction.",
        missionAr: "تقديم التميز في كل تفاعل.",
        visionEn: "Grow with our customers.",
        visionAr: "النمو مع عملائنا.",
        valuesEn: JSON.stringify(["Trust", "Quality", "Service"]),
        valuesAr: JSON.stringify(["الثقة", "الجودة", "الخدمة"]),
        addressEn: "",
        addressAr: "",
        officeHoursEn: "",
        officeHoursAr: "",
      }, [
        { field: "tagline", enKey: "taglineEn", arKey: "taglineAr" },
        { field: "story", enKey: "storyEn", arKey: "storyAr" },
        { field: "mission", enKey: "missionEn", arKey: "missionAr" },
        { field: "vision", enKey: "visionEn", arKey: "visionAr" },
        { field: "values", enKey: "valuesEn", arKey: "valuesAr" },
        { field: "address", enKey: "addressEn", arKey: "addressAr" },
        { field: "officeHours", enKey: "officeHoursEn", arKey: "officeHoursAr" },
      ]);

      const brandConfig = {
        name: data.siteName,
        shortName: data.siteName.slice(0, 2).toUpperCase() || DEFAULT_BRAND_NAME,
        tagline,
        logoMode: "text",
        logoText: data.siteName.slice(0, 2).toUpperCase(),
        showTagline: true,
      };

      for (const themeId of ["published", "draft"]) {
        const theme = await tx.siteTheme.findUnique({ where: { id: themeId } });
        const existingBrand =
          theme?.brandConfig && typeof theme.brandConfig === "object"
            ? (theme.brandConfig as Record<string, unknown>)
            : {};
        await tx.siteTheme.upsert({
          where: { id: themeId },
          update: { brandConfig: { ...existingBrand, ...brandConfig } },
          create: {
            id: themeId,
            brandConfig,
          },
        });
      }

      await ensureBaselineCmsAndLocales(tx);
    }, SETUP_COMPLETE_TX_OPTIONS);

    if (data.installMode !== "blank") {
      await importDemoProfile(prisma, data.installMode, {
        siteName: data.siteName,
        tagline: data.tagline,
        siteUrl: data.siteUrl,
        adminEmail: data.adminEmail,
      });
    }

    revalidateTheme();
    revalidateJsonNamespace("header-workspace");
    revalidateJsonNamespace("footer-workspace");
    revalidateJsonNamespace("settings");
    invalidateSiteSettingsCache();
    await revalidateAllWiredMarketingPaths();
    const defaultLocale = await localeService.getDefaultUrlPrefix();
    const redirectTo = `/${defaultLocale}?setup=done`;

    const settings = await writeSystemSettings({
      setupComplete: true,
      completedAt,
      registrationEnabled: data.registrationEnabled,
    });

    invalidateSetupStatusCache();
    setCachedSetupStatus({
      setupComplete: true,
      registrationEnabled: settings.registrationEnabled,
      comingSoonEnabled: settings.comingSoonEnabled ?? false,
      confident: true,
    });
    await refreshMiddlewareManifestBestEffort("setup complete");

    const response = NextResponse.json({ success: true, redirectTo });
    response.cookies.set(
      SETUP_COMPLETE_COOKIE,
      getSetupCompleteCookieValue(),
      setupCompleteCookieOptions(),
    );
    return response;
  } catch (error) {
    console.error("Setup complete error:", error);
    return NextResponse.json({ error: formatSetupError(error) }, { status: 400 });
  }
}

