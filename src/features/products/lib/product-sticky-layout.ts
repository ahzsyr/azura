/**
 * Desktop PDP: pin breadcrumb chrome + buy column (sample sticky-nav-offset parity).
 */

const DESKTOP_MQ = "(min-width: 981px)";
const SIDE_FOOTER_GAP_PX = 16;

function clearFixedEl(el: HTMLElement): void {
  el.style.position = "";
  el.style.top = "";
  el.style.left = "";
  el.style.width = "";
  el.style.right = "";
  el.style.maxHeight = "";
  el.style.zIndex = "";
}

function clearSideCompactMode(page: HTMLElement): void {
  page.removeAttribute("data-prd-side-compact");
}

function getVisibleCompactKeys(page: HTMLElement): Set<string> {
  const raw = page.getAttribute("data-prd-side-compact-visible") ?? "";
  return new Set(raw.split(",").map((k) => k.trim()).filter(Boolean));
}

function applyCompactElementVisibility(page: HTMLElement, compact: boolean): void {
  const visible = getVisibleCompactKeys(page);
  page.querySelectorAll<HTMLElement>("[data-prd-compact-key]").forEach((el) => {
    const key = el.getAttribute("data-prd-compact-key");
    if (!key) return;
    if (!compact) {
      el.style.display = "";
      return;
    }
    const show = key === "title" || visible.has(key);
    el.style.display = show ? "" : "none";
  });
}

function isScrolledPastSideOrigin(page: HTMLElement): boolean {
  if (page.getAttribute("data-prd-side-compact-enabled") === "false") return false;
  const rawOrigin = Number(page.dataset.prdSideCompactOrigin ?? 0);
  const origin =
    rawOrigin > 0
      ? rawOrigin
      : Number(
          getComputedStyle(document.documentElement)
            .getPropertyValue("--az-sticky-nav-top")
            .trim()
            .replace("px", ""),
        ) || 88;
  const offset = Number(page.getAttribute("data-prd-side-compact-offset") ?? 24);
  return window.scrollY > origin + offset;
}

function clearSideStackConstraints(side: HTMLElement): void {
  side.style.maxHeight = "";
  side.style.overflow = "";
  const stack = side.querySelector<HTMLElement>(".prd-page__side-stack");
  if (stack) stack.style.maxHeight = "";
  const page = side.closest<HTMLElement>(".prd-page");
  if (page) {
    clearSideCompactMode(page);
    applyCompactElementVisibility(page, false);
  }
}

function applySideStackConstraints(side: HTMLElement, stack: HTMLElement, maxH: number): void {
  const px = `${maxH}px`;
  side.style.maxHeight = px;
  stack.style.maxHeight = px;
  side.style.overflow = "hidden";
}

/** Switch between full and compact buy-rail layouts on scroll; height clamp is separate. */
function syncSideCompactMode(
  page: HTMLElement,
  side: HTMLElement,
  stack: HTMLElement,
  maxH: number,
): void {
  clearSideCompactMode(page);
  applyCompactElementVisibility(page, false);

  const scrollCompact = isScrolledPastSideOrigin(page);

  if (!scrollCompact) {
    applySideStackConstraints(side, stack, maxH);
    return;
  }

  page.setAttribute("data-prd-side-compact", "true");
  applyCompactElementVisibility(page, true);
  const compactH = stack.scrollHeight;
  applySideStackConstraints(side, stack, Math.min(maxH, compactH));
}

function clearSideRailMinHeight(sideRail: HTMLElement | null): void {
  if (sideRail) sideRail.style.minHeight = "";
}

function storeSideCompactOrigin(page: HTMLElement, sideRail: HTMLElement | null): void {
  if (!sideRail || page.dataset.prdSideCompactOrigin) return;
  const top = sideRail.offsetTop;
  if (top > 0) page.dataset.prdSideCompactOrigin = String(top);
}

/** Clamp sticky buy column height so it ends above the footer and page bottom. */
export function constrainSideStackHeight(page: HTMLElement, side: HTMLElement): void {
  const stack = side.querySelector<HTMLElement>(".prd-page__side-stack");
  if (!stack || page.getAttribute("data-prd-sticky-buy") === "false") return;

  const sideRail = side.closest<HTMLElement>(".prd-page__side-rail");
  const sideTop = (sideRail ?? side).getBoundingClientRect().top;
  const gap = SIDE_FOOTER_GAP_PX;

  const footer = document.querySelector<HTMLElement>(".site-footer");
  const footerTop = footer?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
  const pageBottom = page.getBoundingClientRect().bottom;

  const viewportLimit = window.innerHeight - sideTop - gap;
  const footerLimit = footerTop - sideTop - gap;
  const pageLimit = pageBottom - sideTop - gap;

  let maxH = Math.min(viewportLimit, footerLimit, pageLimit);
  if (!Number.isFinite(maxH)) maxH = viewportLimit;
  maxH = Math.max(0, Math.floor(maxH));

  if (maxH <= 0) {
    clearSideCompactMode(page);
    applyCompactElementVisibility(page, false);
    applySideStackConstraints(side, stack, 0);
    return;
  }

  syncSideCompactMode(page, side, stack, maxH);
}

function constrainAllProductSides(): void {
  if (!window.matchMedia(DESKTOP_MQ).matches) return;
  document.querySelectorAll<HTMLElement>(".prd-page").forEach((page) => {
    if (page.getAttribute("data-prd-sticky-buy") === "false") return;
    const side = page.querySelector<HTMLElement>(".prd-page__side");
    if (!side) return;
    constrainSideStackHeight(page, side);
  });
}

/** Sticky breadcrumb / buy-column offset below the site header. */
export function syncStickyNavOffset(): void {
  const html = document.documentElement;
  const existing = getComputedStyle(html).getPropertyValue("--az-sticky-nav-top").trim();
  if (existing) {
    document.querySelectorAll<HTMLElement>(".prd-page").forEach((root) => {
      root.style.setProperty("--prd-crumb-top", existing);
      root.style.setProperty("--prd-side-top", existing);
    });
    return;
  }

  const root =
    document.getElementById("headerRoot") ??
    document.querySelector<HTMLElement>(".header-root");
  const h = root?.getBoundingClientRect().height ?? 88;
  const headerStyle = root?.getAttribute("data-header-style") ?? "";
  const overlayGap = parseFloat(
    getComputedStyle(html).getPropertyValue("--header-overlay-top-gap").trim()
  );
  const overlayPx = Number.isFinite(overlayGap)
    ? overlayGap
    : headerStyle.startsWith("boxed-")
      ? 12
      : 0;
  const contentGap = parseFloat(
    getComputedStyle(html).getPropertyValue("--header-content-gap").trim()
  );
  const gapPx = Number.isFinite(contentGap) ? contentGap : 16;
  const top = `${Math.ceil(h + overlayPx + gapPx)}px`;
  html.style.setProperty("--az-sticky-nav-top", top);
  document.querySelectorAll<HTMLElement>(".prd-page").forEach((page) => {
    page.style.setProperty("--prd-crumb-top", top);
    page.style.setProperty("--prd-side-top", top);
  });
}

function syncProductStickyOffsets(
  page: HTMLElement,
  chrome: HTMLElement | null,
  stickyCrumb: boolean,
): void {
  const crumbTop =
    getComputedStyle(document.documentElement).getPropertyValue("--az-sticky-nav-top").trim() ||
    getComputedStyle(page).getPropertyValue("--prd-crumb-top").trim() ||
    "5.5rem";

  let buyTop = crumbTop;

  if (chrome && stickyCrumb) {
    const crumbPx = parseFloat(crumbTop) || 88;
    buyTop = `${crumbPx + chrome.offsetHeight + 8}px`;
  }

  page.style.setProperty("--prd-side-top", buyTop);
}

/** Sync sticky offsets for breadcrumb + buy rail (CSS handles positioning). */
export function syncFixedProductLayout(): void {
  const desktop = window.matchMedia(DESKTOP_MQ).matches;

  document.querySelectorAll<HTMLElement>(".prd-page").forEach((page) => {
    const chrome = page.querySelector<HTMLElement>(".prd-page__chrome");
    const chromeRail = page.querySelector<HTMLElement>(".prd-page__chrome-rail");
    const side = page.querySelector<HTMLElement>(".prd-page__side");
    const sideRail = page.querySelector<HTMLElement>(".prd-page__side-rail");

    const stickyCrumb = page.getAttribute("data-prd-sticky-crumb") !== "false";
    const stickyBuy = page.getAttribute("data-prd-sticky-buy") !== "false";

    if (chrome) clearFixedEl(chrome);
    if (chromeRail) chromeRail.style.minHeight = "";

    syncProductStickyOffsets(page, chrome, stickyCrumb);

    if (side) {
      clearFixedEl(side);
      clearSideStackConstraints(side);
    }
    clearSideRailMinHeight(sideRail);

    if (side && sideRail && desktop && stickyBuy) {
      storeSideCompactOrigin(page, sideRail);
      constrainSideStackHeight(page, side);
    } else if (side) {
      clearSideCompactMode(page);
      applyCompactElementVisibility(page, false);
    }
  });

  constrainAllProductSides();
}

let layoutResizeObserver: ResizeObserver | null = null;
let sideScrollConstraintBound = false;
let initialized = false;

function bindSideScrollConstraint(): void {
  if (sideScrollConstraintBound) return;
  sideScrollConstraintBound = true;
  window.addEventListener("scroll", constrainAllProductSides, { passive: true });
}

function observeProductLayout(): void {
  layoutResizeObserver?.disconnect();
  layoutResizeObserver = new ResizeObserver(() => syncFixedProductLayout());
  document
    .querySelectorAll(
      ".prd-page, .prd-page__chrome-rail, .prd-page__chrome, .prd-page__side-rail, .prd-page__side, .prd-page__main, .site-footer",
    )
    .forEach((el) => {
      layoutResizeObserver?.observe(el);
    });
}

function clearAllProductLayout(): void {
  document.querySelectorAll<HTMLElement>(".prd-page").forEach((page) => {
    const chrome = page.querySelector<HTMLElement>(".prd-page__chrome");
    const chromeRail = page.querySelector<HTMLElement>(".prd-page__chrome-rail");
    const side = page.querySelector<HTMLElement>(".prd-page__side");
    const sideRail = page.querySelector<HTMLElement>(".prd-page__side-rail");
    if (chrome) clearFixedEl(chrome);
    if (chromeRail) chromeRail.style.minHeight = "";
    clearSideCompactMode(page);
    applyCompactElementVisibility(page, false);
    if (side) {
      clearFixedEl(side);
      clearSideStackConstraints(side);
    }
    clearSideRailMinHeight(sideRail);
    delete page.dataset.prdSideCompactOrigin;
  });
}

/** Initialize sticky PDP breadcrumb + buy rail. Returns cleanup. */
export function initProductStickyLayout(): () => void {
  if (typeof window === "undefined") return () => {};

  const run = () => {
    syncStickyNavOffset();
    syncFixedProductLayout();
    observeProductLayout();
    bindSideScrollConstraint();
  };

  run();
  requestAnimationFrame(() => {
    run();
    requestAnimationFrame(run);
  });

  const onResize = () => run();
  window.addEventListener("resize", onResize, { passive: true });

  initialized = true;

  return () => {
    window.removeEventListener("resize", onResize);
    if (sideScrollConstraintBound) {
      window.removeEventListener("scroll", constrainAllProductSides);
      sideScrollConstraintBound = false;
    }
    layoutResizeObserver?.disconnect();
    layoutResizeObserver = null;
    clearAllProductLayout();
    initialized = false;
  };
}

export function isProductStickyLayoutInitialized(): boolean {
  return initialized;
}
