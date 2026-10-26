import "server-only";

import { z } from "zod";
import { passwordPolicySchema } from "@/schemas/password-policy";
import { emailInputSchema } from "@/lib/security/email-input";

const localeSchema = z.string().min(2).max(10).default("en");

/** Step 1 — request a code for an address. */
export const forgotPasswordSchema = z.object({
  email: emailInputSchema,
  locale: localeSchema,
});

/** Step 2 — verify the emailed one-time code (no ticket yet, or after expiry). */
export const verifyResetCodeWithoutTicketSchema = z.object({
  email: emailInputSchema,
  code: z.string().min(1, "Enter the 6-digit code").max(12),
});
export type VerifyResetCodeWithoutTicketInput = z.infer<
  typeof verifyResetCodeWithoutTicketSchema
>;

/** Step 2 — verify the code bound to the ticket returned by step 1. */
export const verifyResetCodeSchema = z.object({
  ticket: z.string().min(32, "This reset session is invalid or has expired").max(128),
  code: z.string().min(1, "Enter the 6-digit code").max(12),
});
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;

/** Step 3 — set the new password with the verified ticket. */
export const completeResetSchema = z
  .object({
    ticket: z.string().min(32, "This reset session is invalid or has expired").max(128),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });
export type CompleteResetInput = z.infer<typeof completeResetSchema>;
