import { clearPresetColorOverrides } from "./colors";

/** Remove visitor theme DOM pollution (inline vars, injected style, bootstrap flag, body effects). */
export function clearVisitorThemeDomOverrides(): void {
  if (typeof document === "undefined") return;

  clearPresetColorOverrides();

  document.getElementById("az-visitor-theme")?.remove();

  const html = document.documentElement;
  delete html.dataset.visitorThemeBootstrapped;

  const body = document.body;
  delete body.dataset.cursor;
  delete body.dataset.bgEffect;
}
