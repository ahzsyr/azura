import { postForgotPassword } from "@/features/account/password-reset.api";

/**
 * Request a password-reset code. Responds identically whether or not the
 * address has an account — see `password-reset.service.ts`.
 */
export async function POST(request: Request) {
  return postForgotPassword(request);
}
