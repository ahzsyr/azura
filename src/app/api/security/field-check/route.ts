import { NextResponse } from "next/server";
import { defineApiRoute } from "@/lib/api-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getTrustedClientIp } from "@/lib/client-ip";
import { classifyContentLength } from "@/lib/security/abuse-controls";
import { assessEmailPattern } from "@/lib/security/email-input";
import { verifyEmailDomain } from "@/lib/security/email-domain.server";
import { assessPassword } from "@/schemas/password-policy";

const BODY_MAX = 2_048;

function unavailable() {
  return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
}

/** Live pattern and domain check. Does not look up accounts or store the values. */
export const POST = defineApiRoute({
  access: "public",
  async handler({ request }) {
    const size = classifyContentLength(request.headers.get("content-length"), BODY_MAX);
    if (size !== "ok") {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const ip = getTrustedClientIp(request);
    try {
      const rl = await enforceRateLimit({
        key: `field-check:${ip}`,
        limit: 30,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
      }
    } catch (error) {
      console.error("[field-check] rate limit failed", error instanceof Error ? error.name : "unknown");
      return unavailable();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const record = body as { email?: unknown; password?: unknown };
    const email = typeof record.email === "string" ? record.email.slice(0, 254) : undefined;
    const password = typeof record.password === "string" ? record.password.slice(0, 128) : undefined;
    if (email === undefined && password === undefined) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result: {
      password?: { ok: boolean; checks: ReturnType<typeof assessPassword>["checks"] };
      email?: { ok: boolean; pattern: boolean; domain: boolean; message: string | null };
    } = {};

    if (password !== undefined) {
      const assessed = assessPassword(password);
      result.password = { ok: assessed.ok, checks: assessed.checks };
    }

    if (email !== undefined && email.trim()) {
      const pattern = assessEmailPattern(email);
      if (!pattern.ok) {
        result.email = { ok: false, pattern: false, domain: false, message: pattern.message };
      } else {
        const domain = await verifyEmailDomain(pattern.normalized);
        result.email = {
          ok: domain.ok,
          pattern: true,
          domain: domain.ok,
          message: domain.ok ? null : domain.message,
        };
      }
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  },
});
