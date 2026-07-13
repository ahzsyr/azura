import { NextResponse } from "next/server";
import { loadComparisonShellProps } from "@/features/comparison/load-comparison-shell-props";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? "en";
  const props = await loadComparisonShellProps(locale);
  return NextResponse.json(props);
}
