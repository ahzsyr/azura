/** Small helpers for product media admin (no React). */

export function readFileAsDataUrl(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export function truncateMiddle(str: string, max = 36): string {
  if (str.length <= max) return str;
  const head = Math.ceil(max * 0.45);
  const tail = Math.floor(max * 0.35);
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function objectPatch(row: unknown): Record<string, unknown> {
  if (row !== null && typeof row === "object" && !Array.isArray(row)) return { ...(row as Record<string, unknown>) };
  return {};
}

export function readControlledInputValue(e: { target: EventTarget | null }): string {
  const t = e.target;
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return t.value;
  return "";
}

export function readControlledCheckboxChecked(e: { target: EventTarget | null }): boolean {
  return e.target instanceof HTMLInputElement && e.target.checked;
}
