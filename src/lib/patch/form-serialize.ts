/** Client-safe form serialization for patch baselines. */
export function serializeFormElement(form: HTMLFormElement): Record<string, string> {
  const data = new FormData(form);
  const out: Record<string, string> = {};
  for (const [key, value] of data.entries()) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}
