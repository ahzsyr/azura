/** Session and token checks for linking a marketing browser to a user. */

export function visitorLinkSessionError(userId: string | null | undefined): "unauthorized" | null {
  if (!userId?.trim()) return "unauthorized";
  return null;
}

export function normalizeVisitorToken(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const token = raw.trim();
  if (token.length < 8 || token.length > 64) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return null;
  return token;
}
