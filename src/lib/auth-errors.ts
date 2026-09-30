import { CredentialsSignin } from "next-auth";

/** Thrown when Prisma cannot reach the database during login. */
export class DatabaseUnavailableError extends CredentialsSignin {
  code = "database_unavailable";
}

/** Password OK but MFA code required — must not issue a session. */
export class MfaRequiredError extends CredentialsSignin {
  code = "mfa_required";
}

/** Password OK but MFA code invalid — must not issue a session. */
export class MfaInvalidError extends CredentialsSignin {
  code = "mfa_invalid";
}
