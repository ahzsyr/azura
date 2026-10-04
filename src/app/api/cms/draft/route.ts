import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { disableCmsDraftMode, enableCmsDraftMode } from "@/features/cms/draft-mode";

/**
 * POST { enable: true, redirect?: string } — enter Draft Mode (admin only).
 * GET ?exit=1&redirect=… — exit Draft Mode (admin only).
 * DELETE — exit Draft Mode.
 */
export async function POST(request: Request) {
  await requireAdmin();
  const body = (await request.json().catch(() => ({}))) as {
    enable?: boolean;
    redirect?: string;
  };
  if (body.enable === false) {
    await disableCmsDraftMode();
  } else {
    await enableCmsDraftMode();
  }
  if (body.redirect) {
    return NextResponse.redirect(new URL(body.redirect, request.url));
  }
  return NextResponse.json({ ok: true, draft: body.enable !== false });
}

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  if (url.searchParams.get("exit") === "1" || url.searchParams.get("enable") === "0") {
    await disableCmsDraftMode();
    const redirectTo = url.searchParams.get("redirect") || "/";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
  await enableCmsDraftMode();
  const redirectTo = url.searchParams.get("redirect");
  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }
  return NextResponse.json({ ok: true, draft: true });
}

export async function DELETE() {
  await requireAdmin();
  await disableCmsDraftMode();
  return NextResponse.json({ ok: true, draft: false });
}
