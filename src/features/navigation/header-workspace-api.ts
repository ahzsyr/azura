import { applyImportedPayload, markWorkspaceSaved, serializeWorkspace } from "./header-store";

export async function loadWorkspaceFromServer(): Promise<{
  ok: boolean;
  notFound?: boolean;
  unauthorized?: boolean;
  error?: string;
}> {
  const res = await fetch("/api/admin/header-workspace", { credentials: "same-origin" });
  if (res.status === 401) return { ok: false, unauthorized: true };
  if (res.status === 404) {
    return {
      ok: false,
      notFound: true,
      error: "Header workspace not found. Check database connection and API route.",
    };
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: err.error ?? res.statusText };
  }
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
