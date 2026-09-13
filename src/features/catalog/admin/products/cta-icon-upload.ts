const API: RequestInit = { credentials: "include" };

export async function uploadCtaIconFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload-media", { ...API, method: "POST", body: fd });
  const j = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(j.error || "Upload failed");
  if (!j.url) throw new Error("No URL returned");
  return j.url;
}
