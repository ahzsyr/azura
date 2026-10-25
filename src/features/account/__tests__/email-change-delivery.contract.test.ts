/**
 * Email-change delivery contracts.
 *
 * Regression: the admin "Admin account" form showed
 * "Confirmation sent to …" while no email was ever sent, because
 * `startEmailChange` dropped the `sendEmail` result and the account-settings
 * layer read a missing jsonStore row (`null`) as an already-configured value.
 * These tests pin: a failed send is never reported as success, and a selected
 * email account is actually used.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

type SendCall = {
  to: string;
  subject: string;
  providerConfig?: unknown;
};

const sendCalls: SendCall[] = [];
let sendResult: { sent: boolean; errorCode?: string; errorMessage?: string } = {
  sent: true,
};
/** What `jsonStoreService.get` returns for account settings. */
let storedSettings: unknown = null;
let pendingEmail: string | null = null;
let providerConfigResolved: unknown = null;

const user = {
  id: "u1",
  name: "Admin",
  email: "info@example.com",
  role: "ADMIN",
  passwordHash: "$2a$12$stub",
  pendingEmail: null as string | null,
};

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request.endsWith("bcryptjs") || request === "bcryptjs") {
    // Match both `import bcrypt from` (default) and named-import shapes.
    const bcrypt = {
      compare: async () => true,
      hash: async () => "hash",
    };
    return { ...bcrypt, default: bcrypt };
  }
  if (request === "@/lib/prisma") {
    // Only "this user" exists; looking up another address returns null so the
    // duplicate-email guard does not fire.
    const prisma = {
      user: {
        findUnique: async ({ where }: { where: Record<string, unknown> }) => {
          if (where.id === user.id) return { ...user, pendingEmail };
          return null;
        },
        update: async ({ data }: { data: { pendingEmail?: string | null } }) => {
          if ("pendingEmail" in data) pendingEmail = data.pendingEmail ?? null;
          return { ...user, pendingEmail };
        },
      },
      emailVerificationToken: {
        deleteMany: async () => ({ count: 0 }),
        create: async () => ({ id: "tok1" }),
        delete: async () => ({ id: "tok1" }),
      },
    };
    return { prisma, default: prisma };
  }
  if (request === "@/features/storage/json-store.service") {
    return {
      jsonStoreService: {
        get: async () => storedSettings,
        set: async () => ({}),
      },
    };
  }
  if (request === "@/features/email/email.service") {
    return {
      sendEmail: async (input: SendCall) => {
        sendCalls.push(input);
        return sendResult;
      },
      resolveSendProviderConfig: async (accountId?: string | null) =>
        accountId ? providerConfigResolved : null,
      getEmailDeliveryStatusForAccount: async (accountId?: string | null) => {
        if (!accountId) return { configured: false, provider: "none" };
        return providerConfigResolved
          ? { configured: true, provider: "smtp" }
          : { configured: false, provider: "none" };
      },
    };
  }
  if (request === "@/lib/rate-limit") {
    return { enforceRateLimit: async () => ({ allowed: true }) };
  }
  if (request === "@/lib/security-audit") {
    return { writeSecurityAuditLog: async () => undefined };
  }
  if (request === "@/lib/session-version") {
    return { bumpUserSessionVersion: async () => undefined };
  }
  if (request === "@/lib/security/email-domain.server") {
    return { verifyEmailDomain: async () => ({ ok: true }) };
  }
  if (request === "@/features/email/react-templates") {
    return {
      renderTransactionalEmail: async () => ({ html: "<p>x</p>", text: "x" }),
    };
  }
  if (request === "@/features/account/account-public-path") {
    return { accountPublicPath: (_: string, p: string) => `/en/account/${p}` };
  }
  return originalLoad.call(this, request, ...args);
};

describe("email change delivery", () => {
  beforeEach(() => {
    sendCalls.length = 0;
    sendResult = { sent: true };
    storedSettings = null;
    pendingEmail = null;
    providerConfigResolved = { provider: "smtp", from: "a@b.co", smtp: {} };
  });

  afterEach(() => {
    pendingEmail = null;
  });

  it("refuses and stages nothing when no email provider is configured", async () => {
    storedSettings = null; // fresh install: jsonStore row absent
    providerConfigResolved = null;
    const { startEmailChange } = await import("@/features/account/email-change.service");
    const result = await startEmailChange({
      userId: "u1",
      currentPassword: "pw",
      newEmail: "new@example.com",
      locale: "en",
    });
    assert.ok("error" in result, "must not report success");
    assert.equal((result as { deliveryFailed: boolean }).deliveryFailed, true);
    assert.equal(sendCalls.length, 0, "no send attempted");
    assert.equal(pendingEmail, null, "pending email must not be staged");
  });

  it("returns the provider error and clears pending when the send fails", async () => {
    storedSettings = { emailVerification: { emailAccountId: "acct-1" } };
    sendResult = {
      sent: false,
      errorCode: "provider_error",
      errorMessage: "SMTP delivery failed: connection refused",
    };
    const { startEmailChange } = await import("@/features/account/email-change.service");
    const result = await startEmailChange({
      userId: "u1",
      currentPassword: "pw",
      newEmail: "new@example.com",
      locale: "en",
    });
    assert.ok("error" in result);
    assert.match((result as { error: string }).error, /connection refused/);
    assert.equal(pendingEmail, null, "staged address rolled back on failure");
  });

  it("sends through the configured email account", async () => {
    storedSettings = { emailVerification: { emailAccountId: "acct-1" } };
    const { startEmailChange } = await import("@/features/account/email-change.service");
    const result = await startEmailChange({
      userId: "u1",
      currentPassword: "pw",
      newEmail: "new@example.com",
      locale: "en",
    });
    assert.ok("ok" in result);
    assert.equal(pendingEmail, "new@example.com");
    assert.equal(sendCalls.length, 2, "confirmation + security notice");
    assert.equal(sendCalls[0]!.to, "new@example.com");
    assert.ok(sendCalls[0]!.providerConfig, "confirmation uses the selected account");
    assert.ok(sendCalls[1]!.providerConfig, "notice uses the selected account");
  });

  it("treats a missing settings row as defaults, not as configuration", async () => {
    storedSettings = null;
    const { accountSettingsService } = await import(
      "@/features/account/account-settings.service"
    );
    const settings = await accountSettingsService.get();
    assert.equal(settings.emailVerification.emailAccountId, undefined);
    assert.equal(settings.emailVerification.emailSubject, "Verify your email");
  });

  it("keeps a stored email account id", async () => {
    storedSettings = { emailVerification: { emailAccountId: "acct-1" } };
    const { accountSettingsService } = await import(
      "@/features/account/account-settings.service"
    );
    const settings = await accountSettingsService.get();
    assert.equal(settings.emailVerification.emailAccountId, "acct-1");
  });
});
