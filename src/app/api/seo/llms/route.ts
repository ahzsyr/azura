import { NextResponse } from "next/server";
import {
  buildLlmsTxtEmergencyBody,
  loadPublicLlmsTxt,
} from "@/features/seo/llms/llms.service";

export const maxDuration = 30;

const LLMS_TXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
  "X-Content-Type-Options": "nosniff",
} as const;

const NOT_FOUND_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

/** Public llms.txt document (rewritten from /llms.txt in next.config.ts). */
export async function GET() {
  try {
    const result = await loadPublicLlmsTxt();
    if (result.status === "disabled") {
      return new NextResponse("llms.txt is disabled for this site.\n", {
        status: 404,
        headers: NOT_FOUND_HEADERS,
      });
    }
    return new NextResponse(result.content, { status: 200, headers: LLMS_TXT_HEADERS });
  } catch (error) {
    console.error("[llms] route failed, serving emergency document:", error);
    return new NextResponse(buildLlmsTxtEmergencyBody(), {
      status: 200,
      headers: { ...LLMS_TXT_HEADERS, "Cache-Control": "no-store" },
    });
  }
}
