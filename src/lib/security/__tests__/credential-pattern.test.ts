import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessEmailPattern, emailInputSchema } from "@/lib/security/email-input";
import {
  isBlockedEmailDomain,
  verifyEmailDomain,
  type EmailDnsLookup,
} from "@/lib/security/email-domain";
import { assessPassword } from "@/schemas/password-policy";

const dnsOk: EmailDnsLookup = {
  async resolveMx() {
    return [{ exchange: "mx.example.net" }];
  },
  async resolve4() {
    return ["192.0.2.1"];
  },
  async resolve6() {
    return [];
  },
};

const dnsMissing: EmailDnsLookup = {
  async resolveMx() {
    throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
  },
  async resolve4() {
    throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
  },
  async resolve6() {
    throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
  },
};

describe("password pattern", () => {
  it("accepts English uppercase, lowercase, number, and symbol", () => {
    const result = assessPassword("Correct-Horse-Battery1");
    assert.equal(result.ok, true);
  });

  it("rejects a missing class and non-English letters", () => {
    assert.equal(assessPassword("correct-horse-battery1").checks.uppercase, false);
    assert.equal(assessPassword("CORRECT-HORSE-BATTERY1").checks.lowercase, false);
    assert.equal(assessPassword("Correct-Horse-Battery").checks.number, false);
    assert.equal(assessPassword("CorrectHorseBattery1").checks.symbol, false);
    assert.equal(assessPassword("Corréct-Horse-Battery1").checks.english, false);
  });
});

describe("email pattern and domain", () => {
  it("keeps ASCII addresses and rejects homograph domains", () => {
    assert.equal(emailInputSchema.parse(" Ada@Example.COM "), "ada@example.com");
    assert.equal(assessEmailPattern("user@exämple.com").ok, false);
    assert.equal(assessEmailPattern("not-an-email").ok, false);
  });

  it("rejects disposable domains before DNS", async () => {
    assert.equal(isBlockedEmailDomain("mailinator.com"), true);
    assert.equal(isBlockedEmailDomain("spam.mailinator.com"), true);
    const result = await verifyEmailDomain("person@mailinator.com", dnsOk);
    assert.equal(result.ok, false);
  });

  it("accepts a domain with mail servers and rejects one that does not resolve", async () => {
    assert.deepEqual(await verifyEmailDomain("ada@example.com", dnsOk), { ok: true });
    const missing = await verifyEmailDomain("ada@missing-domain.com", dnsMissing);
    assert.equal(missing.ok, false);
  });
});
