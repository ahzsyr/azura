import { applyImportedPayload, markWorkspaceSaved, serializeWorkspace } from "./header-store";

export async function loadWorkspaceFromServer(): Promise<{
  ok: boolean;
  notFound?: boolean;
  unauthorized?: boolean;
}> {
  const res = await fetch("/api/admin/header-workspace", { credentials: "same-origin" });
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (res.status === 404) {
    applyImportedPayload({});
    markWorkspaceSaved();
    return { ok: true, notFound: true };
  }
  if (!res.ok) return { ok: false };
  const data = (await res.json()) as unknown;
  applyImportedPayload(data);
  markWorkspaceSaved();
  return { ok: true };
}

export async function saveWorkspaceToServer(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/header-workspace", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializeWorkspace()),
    });
    if (res.status === 401) return { ok: false, error: "Unauthorized" };
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: err.error ?? res.statusText };
    }
    markWorkspaceSaved();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
