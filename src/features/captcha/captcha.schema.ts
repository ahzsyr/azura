import { z } from "zod";

/**
 * Scopes are the public endpoints that may require a captcha. Form submissions
 * additionally carry a per-form override, resolved on the server.
 */
export const CAPTCHA_SCOPES = [
  "register",
  "login",
  "passwordReset",
  "forms",
  "newsletter",
  "inquiries",
] as const;

export type CaptchaScope = (typeof CAPTCHA_SCOPES)[number];

export const CAPTCHA_SCOPE_LABELS: Record<CaptchaScope, string> = {
  register: "Visitor registration",
  login: "Sign in",
  passwordReset: "Password reset",
  forms: "Form submissions (all forms)",
  newsletter: "Newsletter signup",
  inquiries: "Contact / inquiry forms",
};

/** inherit = follow the global switch; on/off = explicit override. */
export const captchaOverrideSchema = z.enum(["inherit", "on", "off"]);
export type CaptchaOverride = z.infer<typeof captchaOverrideSchema>;

export const captchaSettingsSchema = z.object({
  /** Master switch. Off = no wizard enforces a captcha regardless of overrides. */
  enabled: z.boolean().default(false),
  provider: z.literal("turnstile").default("turnstile"),
  /** Public site key — safe to expose to the browser. */
  siteKey: z.string().trim().max(200).default(""),
  /** Sealed with the shared secret-seal helper; never returned to the client. */
  secretKeySealed: z.string().optional(),
  scopes: z
    .object({
      register: captchaOverrideSchema.default("inherit"),
      login: captchaOverrideSchema.default("inherit"),
      passwordReset: captchaOverrideSchema.default("inherit"),
      forms: captchaOverrideSchema.default("inherit"),
      newsletter: captchaOverrideSchema.default("inherit"),
      inquiries: captchaOverrideSchema.default("inherit"),
    })
    .default({}),
});

export type CaptchaSettings = z.infer<typeof captchaSettingsSchema>;

export const defaultCaptchaSettings = (): CaptchaSettings => ({
  enabled: false,
  provider: "turnstile",
  siteKey: "",
  scopes: {
    register: "inherit",
    login: "inherit",
    passwordReset: "inherit",
    forms: "inherit",
    newsletter: "inherit",
    inquiries: "inherit",
  },
});

/** Admin DTO — reports whether a secret exists, never the secret itself. */
export type CaptchaSettingsPublic = {
  enabled: boolean;
  provider: "turnstile";
  siteKey: string;
  hasSecretKey: boolean;
  scopes: Record<CaptchaScope, CaptchaOverride>;
  /** True when both keys are present (stored or from env). */
  configured: boolean;
  siteKeySource: "settings" | "env" | "none";
};

export type SaveCaptchaSettingsInput = {
  enabled?: boolean;
  siteKey?: string;
  /** Blank/undefined keeps the stored secret. */
  secretKey?: string;
  clearSecretKey?: boolean;
  scopes?: Partial<Record<CaptchaScope, CaptchaOverride>>;
};

export type CaptchaKeys = {
  siteKey: string;
  hasSecret: boolean;
};

/** Public site key + whether a secret exists. Safe to send to the browser. */
export type CaptchaPublicConfig = {
  enabled: boolean;
  siteKey: string;
  /** True only when a captcha will actually be enforced (keys present). */
  active: boolean;
};

export type CaptchaRequirement = {
  /** Should this endpoint verify a token at all? */
  required: boolean;
  /** Render the widget? Only when required and both keys exist. */
  widgetVisible: boolean;
  siteKey: string;
  /** Human-readable reason, surfaced in admin diagnostics. */
  reason: string;
};
