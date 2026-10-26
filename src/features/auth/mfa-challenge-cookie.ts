import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { resolveAuthSecret } from "@/lib/auth-secret.server";

/**
 * Signed, httpOnly cookie that proves "this browser passed the password step
 * for this user, at this time".
 *
 * The login form submits email + password on every attempt. Without a proof,
 * the OTP resend / channel-switch actions could be driven with nothing but an
 * address, letting anyone fire OTPs at an account they do not own. The cookie
 * is minted only after the password verifies.
 *
 * It is deliberately *not* a session: it grants nothing on its own, and every
 * OTP action still re-verifies the password hash fingerprint.
 */
const COOKIE_NAME = "dsh_mfa_challenge";
const CHALLENGE_TTL_SECONDS = 10 * 60;

type ChallengePayload = {
  userId: string;
  /** Binds the cookie to the current password; changing it invalidates the proof. */
  passwordFingerprint: string;
  issuedAt: number;
};

let cachedKey: Buffer | null = null;

/**
 * Derive the signing key from the app's persisted AUTH_SECRET at call time
 * (it is resolved asynchronously, possibly generated during setup).
 */
async function signingKey(): Promise<Buffer> {
  if (cachedKey) return cachedKey;
  const secret = await resolveAuthSecret();
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  cachedKey = createHmac("sha256", "dsh-mfa-challenge-v1").update(secret).digest();
  return cachedKey;
}

async function sign(payload: string): Promise<string> {
  return createHmac("sha256", await signingKey()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Short, non-reversible marker of the password so a reset invalidates proofs. */
export async function passwordFingerprint(passwordHash: string): Promise<string> {
  return (await sign(passwordHash)).slice(0, 22);
}

export async function issueMfaChallengeCookie(input: {
  userId: string;
  passwordHash: string;
}): Promise<void> {
  const payload: ChallengePayload = {
    userId: input.userId,
    passwordFingerprint: await passwordFingerprint(input.passwordHash),
    issuedAt: Date.now(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const store = await cookies();
  store.set(COOKIE_NAME, `${body}.${await sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export async function clearMfaChallengeCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Read and verify the challenge. Invalid when absent, tampered, expired, or
 * issued for a different user / a since-changed password.
 */
export async function readMfaChallenge(
  expectedUserId: string,
  currentPasswordHash: string,
): Promise<{ valid: true } | { valid: false; reason: "missing" | "expired" | "mismatch" }> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return { valid: false, reason: "missing" };

  const [body, signature] = raw.split(".");
  if (!body || !signature || !safeEqual(await sign(body), signature)) {
    return { valid: false, reason: "mismatch" };
  }

  let payload: ChallengePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ChallengePayload;
  } catch {
    return { valid: false, reason: "mismatch" };
  }

  if (typeof payload.issuedAt !== "number") return { valid: false, reason: "mismatch" };
  if (Date.now() - payload.issuedAt > CHALLENGE_TTL_SECONDS * 1000) {
    return { valid: false, reason: "expired" };
  }
  if (payload.userId !== expectedUserId) return { valid: false, reason: "mismatch" };
  if (!safeEqual(payload.passwordFingerprint, await passwordFingerprint(currentPasswordHash))) {
    return { valid: false, reason: "mismatch" };
  }
  return { valid: true };
}
