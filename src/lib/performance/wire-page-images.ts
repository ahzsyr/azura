const wiredFadeImages = new WeakSet<HTMLImageElement>();

function isPriorityImage(img: HTMLImageElement): boolean {
  if (img.hasAttribute("data-priority-img")) return true;
  if (img.hasAttribute("data-skip-img-fade")) return true;
  return img.getAttribute("loading") !== "lazy";
}

function markImageLoaded(img: HTMLImageElement): void {
  img.classList.remove("img-fade-pending");
  img.classList.add("img-fade-loaded");
}

export function wireImageFade(img: HTMLImageElement): void {
  if (wiredFadeImages.has(img) || img.hasAttribute("data-skip-img-fade")) return;
  wiredFadeImages.add(img);

  if (isPriorityImage(img)) {
    markImageLoaded(img);
    return;
  }

  if (!img.classList.contains("img-fade-pending")) {
    img.classList.add("img-fade-pending");
  }

  const reveal = () => markImageLoaded(img);

  if (img.complete && img.naturalWidth > 0) {
    reveal();
    return;
  }

  img.addEventListener("load", reveal, { once: true });
  img.addEventListener("error", reveal, { once: true });
}

export function wireCatalogListingImages(root: ParentNode = document): void {
  root.querySelectorAll<HTMLImageElement>(
    ".pl-card__media-img, .cl-catalog-card__img, .pl-grid img",
  ).forEach((img) => wireImageFade(img));
}

function walkAndWireImages(node: Node): void {
  if (node instanceof HTMLImageElement) {
    wireImageFade(node);
    return;
  }
  if (node instanceof Element) {
    node.querySelectorAll("img").forEach(wireImageFade);
  }
}

let dynamicImageObserver: MutationObserver | null = null;

function initDynamicImageObserver(): void {
  if (dynamicImageObserver || !document.body) return;

  dynamicImageObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        walkAndWireImages(node);
      }
    }
  });

  dynamicImageObserver.observe(document.body, { childList: true, subtree: true });
}

export function wireAllPageImages(root: ParentNode = document): void {
  root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    if (img.closest("[data-skip-img-fade]")) return;
    wireImageFade(img);
  });
  wireCatalogListingImages(root);
}

export function bootPageImageFade(): void {
  if (typeof document === "undefined") return;
  wireAllPageImages(document);
  initDynamicImageObserver();
}
