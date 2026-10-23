import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      /**
       * Frozen at sign-in. Never rewritten on later requests (see
       * src/lib/session-revocation.ts); layouts compare it to the DB row.
       */
      sessionVersion?: number;
      mustChangePassword?: boolean;
      totpEnabled?: boolean;
      /** Admin signed in password-only because OTP delivery was unconfigured. */
      adminOtpUnconfigured?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    email?: string;
    /**
     * Frozen at sign-in. Never rewritten on later requests — see
     * src/lib/session-revocation.ts.
     */
    sessionVersion?: number;
    mustChangePassword?: boolean;
    totpEnabled?: boolean;
    /** Set at sign-in when admin email-OTP delivery was unconfigured. */
    adminOtpUnconfigured?: boolean;
  }
}
