import { CredentialsSignin } from "next-auth";

/** Thrown when Prisma cannot reach the database during admin login. */
export class DatabaseUnavailableError extends CredentialsSignin {
  code = "database_unavailable";
}
