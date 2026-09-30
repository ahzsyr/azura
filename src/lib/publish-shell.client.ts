import type { PublishResult, ShellEntityType } from "@/services/publish-propagation";

type PublishShellResponse = {
  publish?: PublishResult;
  error?: string;
};

export async function publishShell(
  entityType: ShellEntityType,
  locale?: string,
): Promise<PublishResult> {
  const res = await fetch("/api/publish-shell", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType, locale }),
  });
  const data = (await res.json()) as PublishShellResponse;
  if (!res.ok || !data.publish) {
    throw new Error(data.error ?? "Publish failed");
  }
  return data.publish;
}

export async function fetchSiteSettingsPublishStatus(locale?: string): Promise<{
  version: number;
  publishedVersion: number;
  isLive: boolean;
}> {
  const params = locale ? `?locale=${encodeURIComponent(locale)}` : "";
  const res = await fetch(`/api/site-settings/status${params}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Could not load publish status");
  }
  return res.json() as Promise<{
    version: number;
    publishedVersion: number;
    isLive: boolean;
  }>;
}
