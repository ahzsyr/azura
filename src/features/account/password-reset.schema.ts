import { z } from "zod";
import { passwordPolicySchema } from "@/schemas/password-policy";
import { emailInputSchema } from "@/lib/security/email-input";

export const forgotPasswordSchema = z.object({
  email: emailInputSchema,
  locale: z.string().min(2).max(10).default("en"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, "Invalid or expired reset link").max(128),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });
