import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BRAND_NAME } from "@/config/site";
import { ZodError } from "zod";
import { setupCompleteSchema } from "@/features/setup/setup-complete.schema";
import {
  authorizeFirstRunSetup,
  ensureSetupSchemaBestEffort,
  isSetupDatabaseConnected,
  isSetupTokenRequired,
  isValidSetupToken,
  readSystemSettings,
  SETUP_SCHEMA_MISSING_MESSAGE,
  setupSchemaErrorMessage,
  writeSystemSettings,
} from "@/features/setup/setup.service";
import { relaxLegacyCompanyInfoColumns } from "@/features/setup/setup-schema";
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
import { revalidateAllWiredMarketingPaths } from "@/features/cms/revalidate-wired-marketing";
import { revalidateJsonNamespace } from "@/services/cache";
import { publishShellChange } from "@/services/publish-propagation";
import { ensureAuthSecretAtSetup } from "@/lib/auth-secret.server";
import { installIncludedProfilePackages } from "@/platform/packages/installer";
import { clearRenderedSiteCache } from "@/features/setup/clear-rendered-site-cache";
import { Prisma } from "@prisma/client";

/** Remote Supabase pooler latency can exceed Prisma's default 5s interactive transaction limit. */
const SETUP_COMPLETE_TX_OPTIONS = { maxWait: 30_000, timeout: 120_000 };

const AUTH_SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"] as const;

function clearStaleAuthSessionCookies(response: NextResponse) {
  for (const name of AUTH_SESSION_COOKIES) {
    for (const suffix of ["", ".0", ".1", ".2"]) {
      response.cookies.set(`${name}${suffix}`, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
        secure: name.startsWith("__Secure-"),
      });
    }
  }
}

function isInvalidJsonDataError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Unexpected end of JSON input|JSON\.parse|invalid json|Malformed JSON/i.test(message);
}

function isMissingSchemaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("P2021") ||
    message.includes("does not exist in the current database") ||
    /table [`']?User[`']? does(?:n't| not) exist/i.test(message) ||
    isCompanyInfoConstraintError(error) ||
    isInvalidJsonDataError(error)
  );
}

/** MariaDB 4025 when legacy CompanyInfo.valuesEn (etc.) is still NOT NULL. */
function isCompanyInfoConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Code:\s*`?4025`?/i.test(message) ||
    /CONSTRAINT\s+`?CompanyInfo\./i.test(message) ||
    /failed for .*`CompanyInfo`/i.test(message)
  );
}

function formatSetupError(error: unknown): string {
  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => issue.message)
      .filter((issue) => issue.trim().length > 0)
      .join(" ");
    return message || "Invalid form data";
  }
  if (isInvalidJsonDataError(error)) {
    return (
      "Database schema is not applied (invalid JSON in SiteTheme/CmsPage/JsonStore). " +
      "Completing setup will try to repair JSON columns and apply migrations."
    );
  }
  if (isCompanyInfoConstraintError(error)) {
    return (
      "Database schema is not applied (CompanyInfo.valuesEn is missing or still required). " +
      "Completing setup will try to apply migrations. If that fails, run `npm run deploy:hostinger-db` " +
      "or import blank SQL, and do not set SKIP_DB_MIGRATE=1 on an empty database."
    );
  }
  if (isMissingSchemaError(error)) {
    return setupSchemaErrorMessage(error) ?? SETUP_SCHEMA_MISSING_MESSAGE;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Setup failed";
}

export async function POST(request: Request) {
  try {
    if (!(await isSetupDatabaseConnected())) {
      return NextResponse.json(
        { error: "Database connection failed. Fix DATABASE_URL and restart the app before completing setup." },
        { status: 503 },
      );
    }
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return NextResponse.json(
        { error: "Empty setup request body. Refresh /setup and try Complete setup again." },
        { status: 400 },
      );
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid setup request JSON. Refresh /setup and try Complete setup again." },
        { status: 400 },
      );
    }
    const data = setupCompleteSchema.parse(body);

    const settingsBefore = await readSystemSettings();

    // First-run: in production the request must PRESENT the matching SETUP_TOKEN.
    // Re-setup: presented token must also match the current SETUP_TOKEN.
    if (settingsBefore.setupComplete) {
      if (!isValidSetupToken(data.setupToken)) {
        return NextResponse.json({ error: "Setup already completed" }, { status: 403 });
      }
    } else if (!authorizeFirstRunSetup(data.setupToken)) {
      return NextResponse.json(
        {
          error: isSetupTokenRequired()
            ? "First-run setup requires the SETUP_TOKEN configured in the host environment. Open /setup?setupToken=<token>."
            : "Invalid SETUP_TOKEN",
        },
        { status: 403 },
      );
    }

    const schema = await ensureSetupSchemaBestEffort();
    if (!schema.ready) {
      return NextResponse.json(
        { error: schema.detail?.trim() || SETUP_SCHEMA_MISSING_MESSAGE },
        { status: 503 },
      );
    }

    const { repairSetupJsonColumns } = await import(
      "../../../../../scripts/lib/ensure-setup-critical-mysql.mjs"
    );
    await repairSetupJsonColumns(prisma, {
      log: (message: unknown) => console.warn(String(message)),
    }).catch((error: unknown) => {
      console.warn("[setup.complete] JSON repair skipped:", error);
    });

    await clearRenderedSiteCache();
    await installIncludedProfilePackages();

    const passwordHash = await bcrypt.hash(data.adminPassword, 12);
    const completedAt = new Date().toISOString();

    const runSetupTransaction = () =>
      prisma.$transaction(async (tx) => {
        const existingAdmin = await tx.user.findFirst({
          where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
          orderBy: { createdAt: "asc" },
        });

        // Never overwrite an existing admin unless explicitly authorized via SETUP_TOKEN
        // after setup was already completed (re-setup). First-run creates admin only when none exists.
        if (existingAdmin) {
          if (!settingsBefore.setupComplete || !isValidSetupToken(data.setupToken)) {
            throw new Error(
              "An admin account already exists. Use Admin → Reset setup or present a valid SETUP_TOKEN after setup is complete.",
            );
          }
          await tx.user.update({
            where: { id: existingAdmin.id },
            data: {
              email: data.adminEmail,
              passwordHash,
              name: data.adminName,
              role: "SUPER_ADMIN",
              emailVerifiedAt: new Date(),
              pendingEmail: null,
              mustChangePassword: false,
              totpEnabled: false,
              totpSecret: null,
            },
          });
        } else {
          await tx.user.create({
            data: {
              email: data.adminEmail,
              passwordHash,
              name: data.adminName,
              role: "SUPER_ADMIN",
              emailVerifiedAt: new Date(),
              mustChangePassword: false,
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

        // Do not findUnique SiteTheme first — invalid JSON columns throw
        // "Unexpected end of JSON input". Select id only so Prisma does not
        // deserialize other corrupt JSON fields on the return path.
        for (const themeId of ["published", "draft"]) {
          await tx.siteTheme.upsert({
            where: { id: themeId },
            update: { brandConfig },
            create: {
              id: themeId,
              brandConfig,
            },
            select: { id: true },
          });
        }

        await ensureBaselineCmsAndLocales(tx);
      }, SETUP_COMPLETE_TX_OPTIONS);

    try {
      await runSetupTransaction();
    } catch (error) {
      if (isCompanyInfoConstraintError(error)) {
        await relaxLegacyCompanyInfoColumns();
        await runSetupTransaction();
      } else if (isInvalidJsonDataError(error)) {
        const { repairSetupJsonColumns: repairJson } = await import(
          "../../../../../scripts/lib/ensure-setup-critical-mysql.mjs"
        );
        await repairJson(prisma, {
          log: (message: unknown) => console.warn(String(message)),
        });
        await runSetupTransaction();
      } else {
        throw error;
      }
    }

    if (data.installMode !== "blank") {
      await importDemoProfile(prisma, data.installMode, {
        siteName: data.siteName,
        tagline: data.tagline,
        siteUrl: data.siteUrl,
        adminEmail: data.adminEmail,
      });
    }

    await Promise.all([
      publishShellChange({ entityType: "theme" }),
      publishShellChange({ entityType: "header" }),
      publishShellChange({ entityType: "footer" }),
      publishShellChange({ entityType: "site-settings" }),
    ]);
    revalidateJsonNamespace("settings");
    await revalidateAllWiredMarketingPaths();
    const redirectTo = "/admin";

    await ensureAuthSecretAtSetup();

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

    try {
      const { writeSecurityAuditLog } = await import("@/lib/security-audit");
      const superAdmin = await prisma.user.findFirst({
        where: { email: data.adminEmail.trim().toLowerCase() },
        select: { id: true, role: true },
      });
      if (superAdmin) {
        await writeSecurityAuditLog({
          action: "setup.complete",
          actorId: superAdmin.id,
          actorRole: superAdmin.role,
          meta: { role: "SUPER_ADMIN" },
        });
      }
    } catch (auditErr) {
      console.error("[setup.complete] audit log failed:", auditErr);
    }

    const response = NextResponse.json({ success: true, redirectTo });
    response.cookies.set(
      SETUP_COMPLETE_COOKIE,
      getSetupCompleteCookieValue(),
      setupCompleteCookieOptions(),
    );
    // A previous database left an admin JWT whose user id no longer exists.
    // Drop it so /admin sends the operator to login instead of firing 401s.
    clearStaleAuthSessionCookies(response);
    return response;
  } catch (error) {
    console.error("Setup complete error:", error);
    const status = isMissingSchemaError(error) || isInvalidJsonDataError(error) ? 503 : 400;
    return NextResponse.json({ error: formatSetupError(error) }, { status });
  }
}

