/** HttpOnly cookie set when setup completes; middleware fallback if status API fetch fails. */
export const SETUP_COMPLETE_COOKIE = "azura_setup_complete";

const SETUP_COMPLETE_VALUE = "1";

export function hasSetupCompleteCookie(cookieValue: string | undefined): boolean {
  return cookieValue === SETUP_COMPLETE_VALUE;
}

export function setupCompleteCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
  };
}

export function getSetupCompleteCookieValue(): string {
  return SETUP_COMPLETE_VALUE;
}
