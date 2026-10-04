import { safeEqualSecret } from "@/lib/crypto-compare";
import type { NextRequest } from "next/server";

/**
 * Single cron authentication boundary (Phase 4).
 * Fail-closed when CRON_SECRET (or alternate env keys) is missing.
 */
export function verifyCronSecret(
  request: NextRequest | Request,
  options?: {
    envKeys?: string[];
    headerName?: string;
  },
): boolean {
  const envKeys = options?.envKeys ?? ["CRON_SECRET"];
  let expected: string | undefined;
  for (const key of envKeys) {
    const value = process.env[key]?.trim();
    if (value) {
      expected = value;
      break;
    }
  }

  if (!expected) return false;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const headerName = options?.headerName;
  const explicit = headerName ? (request.headers.get(headerName) ?? "") : "";

  if (safeEqualSecret(bearer, expected)) return true;
  if (explicit && safeEqualSecret(explicit, expected)) return true;
  return false;
}
