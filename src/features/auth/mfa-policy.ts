/** MFA at login for all admin roles (email OTP). Customers never challenged. */
import { isAdminRole } from "@/features/auth/portal";

export function requiresMfaAtLogin(role: string, _totpEnabled?: boolean): boolean {
  return isAdminRole(role);
}
