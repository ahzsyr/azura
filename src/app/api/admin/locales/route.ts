import { NextResponse } from "next/server";
import { requireAdmin } from "@/features/auth/guards";
import { localeService } from "@/features/i18n/locale.service";

export async function GET() {
  await requireAdmin();

  const items = await localeService.listForAdmin();
  const defaultCode = items.find((l) => l.isDefault)?.code ?? "en";

  return NextResponse.json({ items, defaultCode });
}
