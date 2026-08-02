type AppRouterNavigate = {
  push: (href: string, options?: { scroll?: boolean }) => void | Promise<void>;
  replace: (href: string, options?: { scroll?: boolean }) => void | Promise<void>;
};

export const NAVIGATION_ABORTED_EVENT = "az-nav-aborted";

export function isSkippableNavigationError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && err.message.includes("Transition was skipped")) return true;
  return false;
}

function emitNavigationAborted(href: string, err: unknown): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NAVIGATION_ABORTED_EVENT, {
      detail: {
        href,
        message: err instanceof Error ? err.message : String(err),
      },
    }),
  );
}

type NavigateOptions = {
  replace?: boolean;
  scroll?: boolean;
};

/**
 * Next.js App Router rejects in-flight navigations when a newer one starts.
 * Those rejections are expected and should not surface as uncaught promise errors.
 */
export function safeAppRouterNavigate(
  router: AppRouterNavigate,
  href: string,
  options: NavigateOptions = {},
): void {
  const { replace = false, scroll } = options;
  const navigate = replace ? router.replace.bind(router) : router.push.bind(router);
  try {
    const result = navigate(href, scroll === undefined ? undefined : { scroll }) as
      | void
      | Promise<void>;
    if (result && typeof result.catch === "function") {
      void result.catch((err: unknown) => {
        if (isSkippableNavigationError(err)) {
          emitNavigationAborted(href, err);
          return;
        }
        console.error("[navigation] router navigation failed", err);
      });
    }
  } catch {
    /* navigation race */
  }
}
