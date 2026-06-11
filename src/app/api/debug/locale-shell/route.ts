import { NextResponse } from "next/server";
import { getMessages } from "next-intl/server";
import { resolvePublishedSiteTheme } from "@/lib/theme/resolve-site-theme.server";
import { readSiteSettings } from "@/features/catalog/site-settings.service";
import { loadPublicShellContext } from "@/features/i18n/public-shell-context";
import { loadComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";
import { loadCachedHomePage } from "@/features/cms/load-home-page";
import { agentLog, agentLogError } from "@/lib/debug/agent-log";

export const dynamic = "force-dynamic";

type StepResult = {
  step: string;
  ok: boolean;
  ms: number;
  error?: string;
  detail?: Record<string, unknown>;
};

async function runStep(
  step: string,
  hypothesisId: string,
  fn: () => Promise<unknown>,
): Promise<{ result: StepResult; value?: unknown }> {
  const started = Date.now();
  try {
    const value = await fn();
    const ms = Date.now() - started;
    agentLog({
      location: "api/debug/locale-shell",
      message: "step ok",
      hypothesisId,
      data: { step, ms },
    });
    return {
      value,
      result: { step, ok: true, ms },
    };
  } catch (error) {
    const ms = Date.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    agentLogError("api/debug/locale-shell", error, hypothesisId, { step, ms });
    return {
      result: { step, ok: false, ms, error: message },
    };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale")?.trim() || "en";
  const steps: StepResult[] = [];

  agentLog({
    location: "api/debug/locale-shell",
    message: "start",
    hypothesisId: "H0",
    data: { locale },
  });

  const themeRun = await runStep("resolvePublishedSiteTheme", "H2", () =>
    resolvePublishedSiteTheme(),
  );
  steps.push(themeRun.result);
  if (!themeRun.result.ok) {
    return NextResponse.json({ locale, steps, failedAt: themeRun.result.step }, { status: 500 });
  }

  const resolvedTheme = themeRun.value as Awaited<ReturnType<typeof resolvePublishedSiteTheme>>;

  const parallelRuns = await Promise.all([
    runStep("getMessages", "H5", () => getMessages()),
    runStep("readSiteSettings", "H1", () => readSiteSettings(locale)),
    runStep("loadPublicShellContext", "H1", () =>
      loadPublicShellContext(locale, { themeTokens: resolvedTheme.tokens }),
    ),
    runStep("loadComparisonShellProps", "H3", () => loadComparisonShellProps(locale)),
  ]);
  steps.push(...parallelRuns.map((r) => r.result));

  const failedParallel = parallelRuns.find((r) => !r.result.ok);
  if (failedParallel) {
    return NextResponse.json(
      { locale, steps, failedAt: failedParallel.result.step },
      { status: 500 },
    );
  }

  const homeRun = await runStep("loadCachedHomePage", "H4", () => loadCachedHomePage());
  steps.push({
    ...homeRun.result,
    detail: { hasHomePage: homeRun.value != null },
  });

  if (!homeRun.result.ok) {
    return NextResponse.json({ locale, steps, failedAt: homeRun.result.step }, { status: 500 });
  }

  agentLog({
    location: "api/debug/locale-shell",
    message: "all steps ok",
    hypothesisId: "H0",
    data: { locale, stepCount: steps.length },
  });

  return NextResponse.json({
    locale,
    steps,
    result: "ok",
    hasHomePage: homeRun.value != null,
  });
}
