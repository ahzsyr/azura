import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMAIL_MAX_LENGTH,
  emailInputSchema,
  normalizeEmail,
  optionalEmailInputSchema,
} from "@/lib/security/email-input";
import { loginSchema } from "@/schemas/auth";
import { registerSchema } from "@/features/setup/setup-complete.schema";
import { forgotPasswordSchema } from "@/features/account/password-reset.schema";
import { newsletterSubscribeSchema } from "@/features/forms/schemas/form-definition";
import { inquirySchema } from "@/schemas/inquiry";
import { buildZodSchemaFromTemplate } from "@/features/forms/lib/build-zod-schema";

const README = "https://example.com/path";

describe("shared server email schema", () => {
  it("trims and lowercases", () => {
    const parsed = emailInputSchema.parse("  Ada.Lovelace@Example.COM  ");
    assert.equal(parsed, "ada.lovelace@example.com");
  });

  it("rejects invalid addresses", () => {
    for (const bad of ["", "   ", "not-an-email", "a@", "@b.com", "a b@c.com"]) {
      assert.equal(emailInputSchema.safeParse(bad).success, false, JSON.stringify(bad));
    }
  });

  it("enforces max 254 on the normalized value", () => {
    const local = "a".repeat(EMAIL_MAX_LENGTH);
    assert.equal(emailInputSchema.safeParse(`${local}@example.com`).success, false);
    const ok = `${"a".repeat(240)}@example.com`;
    assert.equal(ok.length <= EMAIL_MAX_LENGTH, true);
    assert.equal(emailInputSchema.safeParse(ok).success, true);
  });

  it("optional variant maps blank to undefined", () => {
    assert.equal(optionalEmailInputSchema.parse(undefined), undefined);
    assert.equal(optionalEmailInputSchema.parse(""), undefined);
    assert.equal(optionalEmailInputSchema.parse("  "), undefined);
    assert.equal(optionalEmailInputSchema.parse(" A@B.com "), "a@b.com");
    assert.equal(optionalEmailInputSchema.safeParse("nope").success, false);
  });

  it("normalizeEmail is non-throwing", () => {
    assert.equal(normalizeEmail("  X@Y.com "), "x@y.com");
    assert.equal(normalizeEmail(undefined), "");
    assert.equal(normalizeEmail(42), "");
  });
});

describe("email schema is used by every listed entry point", () => {
  it("login normalizes the address (single lookup key)", () => {
    const parsed = loginSchema.parse({ email: "  Admin@Example.com ", password: "long-enough" });
    assert.equal(parsed.email, "admin@example.com");
  });

  it("register normalizes the address", () => {
    const parsed = registerSchema.parse({
      name: "Ada Lovelace",
      email: "  ADA@Example.com",
      password: "Correct-Horse-Battery",
    });
    assert.equal(parsed.email, "ada@example.com");
  });

  it("forgot-password normalizes the address", () => {
    assert.equal(forgotPasswordSchema.parse({ email: " A@B.com " }).email, "a@b.com");
  });

  it("newsletter normalizes the address", () => {
    assert.equal(newsletterSubscribeSchema.parse({ email: " Sub@B.com " }).email, "sub@b.com");
  });

  it("inquiry normalizes the address", () => {
    const parsed = inquirySchema.parse({
      type: "GENERAL",
      name: "Ada",
      email: "  Ada@Example.COM ",
      message: "Hello there, this is a message.",
      locale: "en",
    });
    assert.equal(parsed.email, "ada@example.com");
  });

  it("form email fields normalize and cap length", () => {
    const schema = buildZodSchemaFromTemplate({
      fields: [{ id: "email", type: "email", label: "Email", required: true }],
    } as never);
    const parsed = schema.parse({ email: "  Form@Example.com " }) as { email: string };
    assert.equal(parsed.email, "form@example.com");
    assert.equal(schema.safeParse({ email: "x".repeat(300) + "@e.com" }).success, false);
  });

  it("no call site keeps a bare z.string().email() for accept paths", async () => {
    const fs = await import("node:fs/promises");
    const files = [
      "src/schemas/auth.ts",
      "src/features/setup/setup-complete.schema.ts",
      "src/features/account/password-reset.schema.ts",
      "src/features/forms/schemas/form-definition.ts",
      "src/schemas/inquiry.ts",
      "src/features/forms/lib/build-zod-schema.ts",
      "src/app/api/account/email-change/route.ts",
    ];
    for (const file of files) {
      const src = await fs.readFile(new URL(`../../../../${file}`, import.meta.url), "utf8");
      assert.doesNotMatch(src, /z\.string\(\)\.(trim\(\)\.)?email\(/, `${file} must use the shared schema`);
    }
  });
});

describe("enumeration-resistant response contracts (static)", () => {
  it("register returns one uniform body", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../../../app/api/auth/register/route.ts", import.meta.url),
      "utf8",
    );
    // Exactly one success response shape, no email echoed back.
    assert.equal((src.match(/NextResponse\.json\(UNIFORM_RESPONSE\)/g) ?? []).length, 2);
    assert.doesNotMatch(src, /requiresVerification: true, email/);
  });

  it("newsletter public body is { success, status } only", async () => {
    const fs = await import("node:fs/promises");
    const route = await fs.readFile(
      new URL("../../../app/api/newsletter/subscribe/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(route, /NextResponse\.json\(\{ success: true, status: result\.status \}\)/);
    assert.doesNotMatch(route, /alreadySubscribed/);
    const service = await fs.readFile(
      new URL("../../../features/forms/newsletter.service.ts", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(service, /alreadySubscribed/, "alreadySubscribed must be gone");
  });

  it("newsletter client decides from status only", async () => {
    const fs = await import("node:fs/promises");
    const view = await fs.readFile(
      new URL(
        "../../../features/builder/blocks/conversion/components/newsletter-signup-view.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    assert.doesNotMatch(view, /alreadySubscribed/);
    assert.match(view, /data\.status === "PENDING"/);
  });

  it("email change keeps a recoverable error and does not stage a taken address", async () => {
    const fs = await import("node:fs/promises");
    const service = await fs.readFile(
      new URL("../../../features/account/email-change.service.ts", import.meta.url),
      "utf8",
    );
    assert.match(service, /Email is already in use/);
    assert.match(service, /New email must be different/);
    assert.doesNotMatch(service, /pendingEmail: newEmail[\s\S]{0,80}taken/);
    assert.match(service, /if \(taken\) \{[^}]*return \{ error: "Email is already in use" \}/s);
  });
});
