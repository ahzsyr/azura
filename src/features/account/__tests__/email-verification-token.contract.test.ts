/**
 * Verification-token lifecycle contracts.
 *
 * Production incident: an admin opened their email-change link while signed in.
 * Middleware redirected admins away from /account/verify-email before the page
 * could POST the token, so the link stayed unused and nothing was audited.
 *
 * Pins: single use, short expiry, immediate invalidation, and a clear reason
 * for every failure path.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import { createHash } from "node:crypto";

const TOKEN = "a".repeat(64);
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

type TokenRow = {
  id: string;
  userId: string;
  purpose: "EMAIL_CHANGE" | "SIGNUP_VERIFY";
  tokenHash: string;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

let tokens: TokenRow[] = [];
let user = {
  id: "u1",
  name: "Admin",
  email: "old@example.com",
  role: "SUPER_ADMIN",
  pendingEmail: "new@example.com" as string | null,
};
const audits: Array<{ action: string; meta?: Record<string, unknown> }> = [];

const ids = { n: 0 };
const nextId = () => `tok${++ids.n}`;

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request === "@/lib/prisma") {
    const matches = (where: Record<string, unknown>) =>
      tokens.filter((t) =>
        Object.entries(where).every(([k, v]) => (t as unknown as Record<string, unknown>)[k] === v),
      );
    const updateRows = (where: Record<string, unknown>, data: Record<string, unknown>) => {
      const hit = matches(where);
      for (const t of hit) Object.assign(t, data);
      return { count: hit.length };
    };
    const client = {
      emailVerificationToken: {
        // The service includes the user relation, so mirror Prisma's shape.
        findFirst: async ({ where }: { where: Record<string, unknown> }) => {
          const row = matches(where)[0];
          return row ? { ...row, user: { ...user } } : null;
        },
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          updateRows(where, data);
          return null;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => updateRows(where, data),
      },
      user: {
        findUnique: async ({ where }: { where: Record<string, unknown> }) =>
          where.email === user.email || where.id === user.id ? { ...user } : null,
        update: async ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(user, data);
          return user;
        },
      },
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(client),
    };
    return { prisma: client, default: client };
  }
  if (request === "@/lib/security-audit") {
    return {
      writeSecurityAuditLog: async (e: { action: string; meta?: Record<string, unknown> }) => {
        audits.push(e);
      },
    };
  }
  if (request === "@/lib/session-version") {
    return { bumpUserSessionVersion: async () => undefined };
  }
  return originalLoad.call(this, request, ...args);
};

function seed(overrides: Partial<TokenRow> = {}) {
  tokens = [
    {
      id: nextId(),
      userId: "u1",
      purpose: "EMAIL_CHANGE",
      tokenHash: hash(TOKEN),
      usedAt: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      createdAt: new Date(),
      ...overrides,
    },
  ];
}

describe("verification token lifecycle", () => {
  beforeEach(() => {
    audits.length = 0;
    user = {
      id: "u1",
      name: "Admin",
      email: "old@example.com",
      role: "SUPER_ADMIN",
      pendingEmail: "new@example.com",
    };
    seed();
  });

  it("redeems once: renames the user, clears pending, marks the token used", async () => {
    const { consumeEmailVerification } = await import(
      "@/features/account/email-verification.service"
    );
    const result = await consumeEmailVerification(TOKEN);
    assert.ok("ok" in result);
    assert.equal(user.email, "new@example.com");
    assert.equal(user.pendingEmail, null);
    assert.ok(tokens[0]!.usedAt, "token marked used");
    assert.ok(
      audits.some((a) => a.action === "auth.email.verify.success"),
      "success audited",
    );
  });

  it("rejects a second use and audits it as reuse", async () => {
    const { consumeEmailVerification } = await import(
      "@/features/account/email-verification.service"
    );
    await consumeEmailVerification(TOKEN);
    const again = await consumeEmailVerification(TOKEN);
    assert.ok("error" in again);
    assert.equal(again.reason, "ALREADY_USED");
    assert.ok(
      audits.some((a) => a.action === "auth.email.verify.reuse_blocked"),
      "reuse audited",
    );
  });

  it("expires links after the configured window and invalidates them", async () => {
    seed({ expiresAt: new Date(Date.now() - 1000) });
    const { consumeEmailVerification } = await import(
      "@/features/account/email-verification.service"
    );
    const result = await consumeEmailVerification(TOKEN);
    assert.ok("error" in result);
    assert.equal(result.reason, "EXPIRED");
    assert.ok(tokens[0]!.usedAt, "expired token retired immediately");
    assert.ok(
      audits.some((a) => a.action === "auth.email.verify.expired"),
      "expiry audited",
    );
    assert.equal(user.email, "old@example.com", "email unchanged");
  });

  it("uses a 30 minute expiry (not 24 hours)", async () => {
    const { TOKEN_EXPIRY_MINUTES } = await import(
      "@/features/account/email-verification.service"
    );
    assert.equal(TOKEN_EXPIRY_MINUTES, 30);
  });

  it("reports a distinct reason for an unknown token", async () => {
    const { consumeEmailVerification } = await import(
      "@/features/account/email-verification.service"
    );
    const result = await consumeEmailVerification("b".repeat(64));
    assert.ok("error" in result);
    assert.equal(result.reason, "INVALID");
  });

  it("gives every failure reason its own actionable message", async () => {
    const { verificationFailureMessage } = await import(
      "@/features/account/email-verification.service"
    );
    const messages = new Set(
      (["INVALID", "EXPIRED", "ALREADY_USED", "NO_PENDING_EMAIL", "EMAIL_TAKEN", "RATE_LIMITED"] as const).map(
        (r) => verificationFailureMessage(r),
      ),
    );
    assert.equal(messages.size, 6, "all reasons are distinguishable");
  });
});
