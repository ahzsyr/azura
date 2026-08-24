import { passwordPolicySchema } from "@/schemas/password-policy";

/** Client-side password checks aligned with server passwordPolicySchema. */
export function validateNewPassword(
  password: string,
  confirmPassword?: string,
): string | null {
  const parsed = passwordPolicySchema.safeParse(password);
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Password does not meet requirements";
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return "Passwords must match";
  }
  return null;
}

export function validateEmailFormat(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email address";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address";
  }
  return null;
}
