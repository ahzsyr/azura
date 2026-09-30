import { z } from "zod";

/** Login accepts existing passwords (≥8). New passwords use passwordPolicySchema. */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  mfaCode: z.string().max(128).optional(),
});
