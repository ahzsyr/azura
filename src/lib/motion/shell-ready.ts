export const SHELL_READY_EVENT = "azura:shell-ready";
export const RESCAN_REVEAL_EVENT = "azura:rescan-reveal";

/** True when the marketing shell is visible (preloader finished). */
export function isShellVisible(): boolean {
  if (typeof document === "undefined") return true;
  return !document.documentElement.classList.contains("site-preloading");
}

/** Run callback once the shell is visible; runs immediately if already visible. */
export function whenShellReady(run: () => void): () => void {
  if (typeof document === "undefined") return () => {};

  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    run();
  };

  if (isShellVisible()) {
    once();
    return () => {};
  }

  document.addEventListener(SHELL_READY_EVENT, once, { once: true });

  const observer = new MutationObserver(() => {
    if (isShellVisible()) {
      observer.disconnect();
      once();
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => {
    document.removeEventListener(SHELL_READY_EVENT, once);
    observer.disconnect();
  };
}
