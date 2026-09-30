import { z } from "zod";

/** Common passwords (lowercase) rejected for new/changed passwords. */
const COMMON_PASSWORDS = new Set(
  [
    "password",
    "password1",
    "password12",
    "password123",
    "password1234",
    "password12345",
    "12345678",
    "123456789",
    "1234567890",
    "123456789012",
    "qwerty123",
    "qwerty123456",
    "qwertyuiop",
    "letmein123",
    "letmein12345",
    "welcome1",
    "welcome12",
    "welcome123",
    "welcome1234",
    "admin123",
    "admin1234",
    "admin12345",
    "admin123456",
    "changeme",
    "changeme1",
    "changeme12",
    "changeme123",
    "iloveyou",
    "iloveyou123",
    "monkey123",
    "dragon123",
    "master123",
    "login1234",
    "abc123456",
    "abc123456789",
    "passw0rd",
    "passw0rd1234",
    "p@ssw0rd",
    "p@ssw0rd1234",
    "p@ssword",
    "p@ssword1234",
  ].map((s) => s.toLowerCase()),
);

/**
 * Server-authoritative policy for creating/changing/resetting passwords.
 * Login continues to accept existing shorter hashes via loginSchema.
 */
export const passwordPolicySchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128)
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: "Choose a less common password",
  });

export type PasswordPolicy = z.infer<typeof passwordPolicySchema>;
