import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const DEBUG_SESSION_ID = "51ee47";

function log(hypothesisId: string, message: string, data: Record<string, unknown>) {
  const payload = {
    sessionId: DEBUG_SESSION_ID,
    runId: "ui-messages-probe",
    hypothesisId,
    location: "api/debug/ui-messages-probe/route.ts",
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  console.error("[debug-51ee47]", JSON.stringify(payload));
  // #endregion
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const steps: Array<{ step: string; ok: boolean; error?: string; data?: Record<string, unknown> }> = [];

  try {
    const { flattenMessages } = await import("@/features/translation/ui-messages-utils");
    const enPath = path.join(process.cwd(), "messages", "en.json");
    const enMessages = JSON.parse(await readFile(enPath, "utf-8")) as Record<string, unknown>;
    const keys = flattenMessages(enMessages);
    steps.push({ step: "H6:import-flattenMessages-from-client-module", ok: true, data: { keyCount: keys.length } });
    log("H6", "flattenMessages from client module succeeded", { keyCount: keys.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    steps.push({ step: "H6:import-flattenMessages-from-client-module", ok: false, error: errorMessage });
    log("H6", "flattenMessages from client module failed", { errorMessage });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const locales = await prisma.localeConfig.findMany({ take: 1 });
    steps.push({ step: "H1:localeConfig", ok: true, data: { sample: locales.length } });
    log("H1", "localeConfig query ok", { count: locales.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    steps.push({ step: "H1:localeConfig", ok: false, error: errorMessage });
    log("H1", "localeConfig query failed", { errorMessage });
  }

  try {
    const { uiMessageService } = await import("@/features/translation/ui-message.service");
    const rows = await uiMessageService.getAllGrouped();
    steps.push({ step: "H4:getAllGrouped", ok: true, data: { rowGroupCount: rows.length } });
    log("H4", "getAllGrouped ok", { rowGroupCount: rows.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    steps.push({ step: "H4:getAllGrouped", ok: false, error: errorMessage });
    log("H4", "getAllGrouped failed", { errorMessage });
  }

  return NextResponse.json({ steps });
}
