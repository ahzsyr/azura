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

/** Password OK but the sign-in code email could not be sent. */
export class MfaDeliveryError extends CredentialsSignin {
  code = "mfa_delivery_failed";
}

/**
 * Password OK, the account has no usable second factor (no authenticator and
 * no deliverable OTP channel). There is nothing to challenge with, so no
 * session is issued and the sign-in is refused rather than silently downgraded.
 */
export class MfaUnavailableError extends CredentialsSignin {
  code = "mfa_unavailable";
}
