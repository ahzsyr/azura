import { applyFooterImport, markFooterSaved, serializeFooterWorkspace } from "./footer-store";

export async function loadFooterWorkspaceFromServer(): Promise<{
  ok: boolean;
  unauthorized?: boolean;
}> {
  const res = await fetch("/api/admin/footer-workspace", { credentials: "same-origin" });
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (!res.ok) return { ok: false };
  const data = (await res.json()) as unknown;
  applyFooterImport(data);
  markFooterSaved();
  return { ok: true };
}

export async function saveFooterWorkspaceToServer(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/footer-workspace", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializeFooterWorkspace()),
    });
    if (res.status === 401) return { ok: false, error: "Unauthorized" };
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: err.error ?? res.statusText };
    }
    markFooterSaved();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
