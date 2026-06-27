import { applyImportedPayload, markWorkspaceSaved, serializeWorkspace, getSavedWorkspaceBaseline } from "./header-store";
import { computePatch, isEmptyPatch } from "@/lib/patch";

const HEADER_WORKSPACE_ENDPOINT = "/api/manage/header-workspace";

export async function loadWorkspaceFromServer(): Promise<{
  ok: boolean;
  notFound?: boolean;
  unauthorized?: boolean;
  error?: string;
}> {
  const res = await fetch(HEADER_WORKSPACE_ENDPOINT, { credentials: "same-origin" });
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

export async function saveWorkspaceToServer(): Promise<{ ok: boolean; error?: string; noop?: boolean }> {
  try {
    const baseline = getSavedWorkspaceBaseline();
    const current = serializeWorkspace();
    const changes = computePatch(baseline, current);
    if (isEmptyPatch(changes)) {
      markWorkspaceSaved();
      return { ok: true, noop: true };
    }

    const res = await fetch(HEADER_WORKSPACE_ENDPOINT, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
    });
    if (res.status === 401) return { ok: false, error: "Unauthorized" };
    if (res.status === 404 || res.status === 405) {
      return saveWorkspaceFull(current);
    }
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

async function saveWorkspaceFull(current: Record<string, unknown>) {
  const res = await fetch(HEADER_WORKSPACE_ENDPOINT, {
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
  markWorkspaceSaved();
  return { ok: true };
}
