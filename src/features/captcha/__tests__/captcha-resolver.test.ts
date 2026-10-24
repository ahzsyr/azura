import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultCaptchaRequirement,
  hasUsableKeys,
  resolveCaptchaRequirement,
  resolveOverride,
} from "@/features/captcha/captcha.resolver";
import { defaultCaptchaSettings } from "@/features/captcha/captcha.schema";

const KEYS = { siteKey: "0x4AAAAAAA-site", hasSecret: true };
const NO_KEYS = { siteKey: "", hasSecret: false };
const PARTIAL_KEYS = { siteKey: "0x4AAAAAAA-site", hasSecret: false };

function settings(overrides: Partial<ReturnType<typeof defaultCaptchaSettings>> = {}) {
  return { ...defaultCaptchaSettings(), ...overrides };
}

describe("captcha resolver", () => {
  it("regression: enabled without keys must not block (the reported bug)", () => {
    // This is the exact state that produced "Complete the captcha before
    // continuing." with no captcha rendered: server was willing to skip, but
    // the form demanded a token it could never receive.
    const result = resolveCaptchaRequirement({
      settings: settings({ enabled: true }),
      keys: NO_KEYS,
      scope: "passwordReset",
    });
    assert.equal(result.required, false);
    assert.equal(result.widgetVisible, false);
    assert.match(result.reason, /not configured/);
  });

  it("a site key without a secret is still unusable", () => {
    const result = resolveCaptchaRequirement({
      settings: settings({ enabled: true }),
      keys: PARTIAL_KEYS,
      scope: "register",
    });
    assert.equal(result.required, false);
  });

  it("enabled with both keys is required and visible", () => {
    const result = resolveCaptchaRequirement({
      settings: settings({ enabled: true }),
      keys: KEYS,
      scope: "register",
    });
    assert.equal(result.required, true);
    assert.equal(result.widgetVisible, true);
    assert.equal(result.siteKey, KEYS.siteKey);
  });

  it("master switch off disables every scope", () => {
    for (const scope of ["register", "login", "passwordReset", "forms", "newsletter", "inquiries"] as const) {
      const result = resolveCaptchaRequirement({
        settings: settings({ enabled: false }),
        keys: KEYS,
        scope,
      });
      assert.equal(result.required, false, scope);
    }
  });

  it("scope override on wins over a disabled master switch", () => {
    const result = resolveCaptchaRequirement({
      settings: settings({ enabled: false, scopes: { ...defaultCaptchaSettings().scopes, login: "on" } }),
      keys: KEYS,
      scope: "login",
    });
    assert.equal(result.required, true);
  });

  it("scope override off wins over an enabled master switch", () => {
    const result = resolveCaptchaRequirement({
      settings: settings({ enabled: true, scopes: { ...defaultCaptchaSettings().scopes, forms: "off" } }),
      keys: KEYS,
      scope: "forms",
    });
    assert.equal(result.required, false);
  });

  it("per-form override beats the forms scope setting", () => {
    const enabled = settings({ enabled: true });
    assert.equal(
      resolveCaptchaRequirement({ settings: enabled, keys: KEYS, scope: "forms", formOverride: "off" }).required,
      false,
    );
    const disabled = settings({ enabled: false });
    assert.equal(
      resolveCaptchaRequirement({ settings: disabled, keys: KEYS, scope: "forms", formOverride: "on" }).required,
      true,
    );
    assert.equal(
      resolveCaptchaRequirement({ settings: disabled, keys: KEYS, scope: "forms", formOverride: "inherit" })
        .required,
      false,
    );
  });

  it("form override does not leak into non-form scopes", () => {
    const result = resolveCaptchaRequirement({
      settings: settings({ enabled: false }),
      keys: KEYS,
      scope: "register",
      formOverride: "on",
    });
    assert.equal(result.required, false);
  });

  it("override resolution helper", () => {
    assert.equal(resolveOverride("on", false), true);
    assert.equal(resolveOverride("off", true), false);
    assert.equal(resolveOverride("inherit", true), true);
    assert.equal(resolveOverride("inherit", false), false);
    assert.equal(resolveOverride(undefined, true), true);
  });

  it("hasUsableKeys requires both values", () => {
    assert.equal(hasUsableKeys(KEYS), true);
    assert.equal(hasUsableKeys(NO_KEYS), false);
    assert.equal(hasUsableKeys(PARTIAL_KEYS), false);
    assert.equal(hasUsableKeys({ siteKey: "  ", hasSecret: true }), false);
  });

  it("default requirement never blocks", () => {
    const result = defaultCaptchaRequirement();
    assert.equal(result.required, false);
    assert.equal(result.widgetVisible, false);
  });
});
