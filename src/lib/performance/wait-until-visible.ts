function isElementVisible(el: Element): boolean {
  let node: Element | null = el;
  while (node) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (parseFloat(style.opacity) < 0.05) return false;
    node = node.parentElement;
  }
  return true;
}

/** Wait until element and ancestors are visible (opacity/display), or timeout. */
export function waitUntilVisible(el: Element, maxMs = 800): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (isElementVisible(el)) return Promise.resolve();

  return new Promise((resolve) => {
    const start = performance.now();

    const check = () => {
      if (isElementVisible(el) || performance.now() - start >= maxMs) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
  });
}
