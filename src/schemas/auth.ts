import { z } from "zod";
import { emailInputSchema } from "@/lib/security/email-input";

/** Login accepts existing passwords (≥8). New passwords use passwordPolicySchema. */
export const loginSchema = z.object({
  email: emailInputSchema,
  password: z.string().min(8).max(128),
  mfaCode: z.string().max(128).optional(),
});
