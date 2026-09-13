"use client";

const CHUNK_RECOVERY_KEY = "__azura_chunk_recovery_attempted__";

export function isChunkLoadErrorMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Failed to load chunk") ||
    message.includes("Loading chunk") ||
    message.includes("dynamically imported module")
  );
}

export function isStaleServerActionErrorMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("UnrecognizedActionError") ||
    message.includes("failed-to-find-server-action") ||
    (message.includes("Server Action") && message.includes("was not found"))
  );
}

export function isStaleDeployClientErrorMessage(message: string | null | undefined): boolean {
  return isChunkLoadErrorMessage(message) || isStaleServerActionErrorMessage(message);
}

/**
 * One-time hard refresh for stale deploy/runtime chunk or server-action mismatches.
 */
export function recoverFromChunkLoadError(message: string | null | undefined): boolean {
  if (typeof window === "undefined" || !isStaleDeployClientErrorMessage(message)) return false;

  const alreadyAttempted = window.sessionStorage.getItem(CHUNK_RECOVERY_KEY) === "1";
  if (alreadyAttempted) return false;

  window.sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");
  window.location.reload();
  return true;
}
