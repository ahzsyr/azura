import { applyFooterImport, markFooterSaved, serializeFooterWorkspace, getSavedFooterBaseline } from "./footer-store";
import { computePatch, isEmptyPatch } from "@/lib/patch";

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

export async function saveFooterWorkspaceToServer(): Promise<{ ok: boolean; error?: string; noop?: boolean }> {
  try {
    const baseline = getSavedFooterBaseline();
    const current = serializeFooterWorkspace() as unknown as Record<string, unknown>;
    const changes = computePatch(baseline, current);
    if (isEmptyPatch(changes)) {
      markFooterSaved();
      return { ok: true, noop: true };
    }

    const res = await fetch("/api/admin/footer-workspace", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
    });
    if (res.status === 401) return { ok: false, error: "Unauthorized" };
    if (res.status === 404 || res.status === 405) {
      return saveFooterFull(current);
    }
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

async function saveFooterFull(current: Record<string, unknown>) {
  const res = await fetch("/api/admin/footer-workspace", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(current),
  });
  if (res.status === 401) return { ok: false, error: "Unauthorized" };
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: err.error ?? res.statusText };
  }
  markFooterSaved();
  return { ok: true };
}
