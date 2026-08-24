export function getOrCreateBehaviorSessionId(): string {
  if (typeof window === "undefined") return "";
  const key = "form-behavior-session";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}

export async function trackFormBehaviorEvent(input: {
  schemaId: string;
  type: string;
  bindingId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const sessionId = getOrCreateBehaviorSessionId();
  try {
    await fetch("/api/forms/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, sessionId }),
    });
  } catch {
    // Non-blocking analytics
  }
}
