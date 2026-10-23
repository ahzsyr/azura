import "server-only";

/**
 * Server-only entry point for the password reuse guard. The implementation is
 * pure (src/lib/security/password-reuse.ts) so tests can exercise it; this
 * module keeps the import boundary for route handlers and services.
 */
export {
  PASSWORD_REUSE_ERROR,
  isPasswordReused,
  passwordMatchesHash,
} from "@/lib/security/password-reuse";
