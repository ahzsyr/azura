import { observeIntersection } from "@/lib/performance/intersection-observer-hub";

/**
 * Text effects — applied to elements with [data-text-effect].
 * Hero auto-tagging is handled by effects-runtime (tagHeroHeadings).
 */

const ORIGINAL_TEXT_ATTR = "data-text-effect-original";
const APPLIED_ATTR = "data-text-effect-applied";
const INTERVAL_ATTR = "data-text-effect-interval-id";

const EFFECT_STYLE_PROPS = [
  "textShadow",
  "position",
  "borderRight",
  "background",
  "backgroundSize",
  "webkitBackgroundClip",
  "backgroundClip",
  "color",
  "animation",
  "clipPath",
  "transition",
  "transform",
  "transformStyle",
  "perspective",
] as const;

function isRootTextTarget(el: HTMLElement): boolean {
  return el === document.body || el === document.documentElement;
}

/** Leaf headings only — skip containers with links or block children. */
function isSimpleTextHeading(el: HTMLElement): boolean {
  if (isRootTextTarget(el)) return false;
  if (el.querySelector("a, button, [href], [data-slot='button']")) return false;
  if (el.querySelector(":scope > div, :scope > section, :scope > article, :scope > ul, :scope > ol")) {
    return false;
  }
  return true;
}

function clearElementInterval(el: HTMLElement): void {
  const raw = el.getAttribute(INTERVAL_ATTR);
  if (!raw) return;
  for (const id of raw.split(",")) {
    const n = Number.parseInt(id, 10);
    if (!Number.isNaN(n)) window.clearInterval(n);
  }
  el.removeAttribute(INTERVAL_ATTR);
}

function trackInterval(el: HTMLElement, intervalId: number): void {
  const prev = el.getAttribute(INTERVAL_ATTR);
  el.setAttribute(INTERVAL_ATTR, prev ? `${prev},${intervalId}` : String(intervalId));
}

function removeGlitchLayers(el: HTMLElement): void {
  el.querySelectorAll('span[aria-hidden="true"]').forEach((node) => node.remove());
}

function stripEffectInlineStyles(el: HTMLElement): void {
  for (const prop of EFFECT_STYLE_PROPS) {
    el.style.removeProperty(prop);
  }
}

function snapshotOriginalText(el: HTMLElement): void {
  if (!isSimpleTextHeading(el)) return;
  if (!el.hasAttribute(ORIGINAL_TEXT_ATTR)) {
    const text = (el.textContent ?? "").trim();
    if (text) el.setAttribute(ORIGINAL_TEXT_ATTR, text);
  }
}

function restoreOriginalText(el: HTMLElement): void {
  const original = el.getAttribute(ORIGINAL_TEXT_ATTR);
  if (original != null) {
    el.textContent = original;
  }
  removeGlitchLayers(el);
}

/** Tear down all applied text effects before switching presets. */
export function resetTextEffects(): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>("[data-text-effect]").forEach((el) => {
    if (isRootTextTarget(el)) return;

    clearElementInterval(el);
    restoreOriginalText(el);
    stripEffectInlineStyles(el);
    el.removeAttribute(APPLIED_ATTR);
  });
}

export function initTextEffects(type: string) {
  if (!type || type === "none") return;

  requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>("[data-text-effect]").forEach((el) => {
      if (isRootTextTarget(el)) return;
      if (!isSimpleTextHeading(el)) return;
      applyEffect(el, type);
    });
  });
}

function applyEffect(el: HTMLElement, type: string) {
  snapshotOriginalText(el);
  const original = el.getAttribute(ORIGINAL_TEXT_ATTR) ?? (el.textContent ?? "").trim();
  if (!original) return;

  el.setAttribute(APPLIED_ATTR, type);

  switch (type) {
    case "neon-glow":
      return applyNeonGlow(el);
    case "glitch":
      return applyGlitch(el, original);
    case "typewriter":
      return applyTypewriter(el, original);
    case "scramble":
      return applyScramble(el, original);
    case "gradient-flow":
      return applyGradientFlow(el);
    case "wave":
      return applyWave(el, original);
    case "flicker":
      return applyFlicker(el);
    case "reveal-clip":
      return applyRevealClip(el);
    case "3d-rotate":
      return apply3DRotate(el);
  }
}

function applyNeonGlow(el: HTMLElement) {
  void import("gsap")
    .then((mod) => {
      mod.gsap.to(el, {
        textShadow:
          "0 0 20px var(--color-primary,var(--primary)), 0 0 40px var(--color-primary,var(--primary)), 0 0 80px var(--color-primary,var(--primary))",
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    })
    .catch(() => {
      el.style.textShadow =
        "0 0 12px color-mix(in srgb,var(--color-primary,var(--primary)) 60%,transparent)";
    });
}

function applyGlitch(el: HTMLElement, text: string) {
  if (el.querySelector('span[aria-hidden="true"]')) return;

  if (!document.getElementById("devi-glitch-kf")) {
    const style = document.createElement("style");
    style.id = "devi-glitch-kf";
    style.textContent = `
      @keyframes glitchClip {
        0%   { clip-path: inset(20% 0 60% 0); transform: translate(-3px,0); }
        20%  { clip-path: inset(50% 0 20% 0); transform: translate(3px,0); }
        40%  { clip-path: inset(70% 0  5% 0); transform: translate(-2px,0); }
        60%  { clip-path: inset(10% 0 70% 0); transform: translate(2px,0); }
        80%  { clip-path: inset(40% 0 30% 0); transform: translate(-1px,0); }
        100% { clip-path: inset(20% 0 60% 0); transform: translate(0,0); }
      }
    `;
    document.head.append(style);
  }

  el.textContent = text;
  el.style.position = "relative";

  ["before", "after"].forEach((_, i) => {
    const pseudo = document.createElement("span");
    pseudo.setAttribute("aria-hidden", "true");
    pseudo.textContent = text;
    pseudo.style.cssText = `
      position:absolute;inset:0;
      color:${i === 0 ? "var(--color-primary,var(--primary))" : "var(--color-accent,var(--accent))"};
      animation:glitchClip ${0.8 + i * 0.4}s infinite steps(1);
      animation-delay:${i * 0.2}s;
      opacity:0.7;
    `;
    el.append(pseudo);
  });
}

function applyTypewriter(el: HTMLElement, text: string) {
  el.textContent = "";
  el.style.borderRight = "2px solid var(--color-primary,var(--primary))";

  let i = 0;
  const interval = window.setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) {
      window.clearInterval(interval);
      el.removeAttribute(INTERVAL_ATTR);
      window.setTimeout(() => {
        el.style.borderRight = "none";
      }, 500);
    }
  }, 60);
  trackInterval(el, interval);
}

function applyScramble(el: HTMLElement, original: string) {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&";
  let frame = 0;
  const totalFrames = 20;

  const scramble = window.setInterval(() => {
    el.textContent = original
      .split("")
      .map((char, idx) => {
        if (char === " ") return " ";
        if (idx < (frame / totalFrames) * original.length) return char;
        return charset[Math.floor(Math.random() * charset.length)];
      })
      .join("");

    if (++frame > totalFrames) {
      el.textContent = original;
      clearElementInterval(el);
      window.clearInterval(scramble);
    }
  }, 40);
  trackInterval(el, scramble);

  el.addEventListener("mouseenter", () => {
    frame = 0;
    const hover = window.setInterval(() => {
      el.textContent = original
        .split("")
        .map((char, idx) => {
          if (char === " ") return " ";
          if (idx < (frame / totalFrames) * original.length) return char;
          return charset[Math.floor(Math.random() * charset.length)];
        })
        .join("");
      if (++frame > totalFrames) {
        el.textContent = original;
        window.clearInterval(hover);
      }
    }, 40);
  });
}

function applyGradientFlow(el: HTMLElement) {
  el.style.background = `linear-gradient(90deg,
      var(--color-primary,var(--primary)) 0%,
      var(--color-accent,var(--accent)) 33%,
      var(--color-secondary,var(--gold)) 66%,
      var(--color-primary,var(--primary)) 100%)`;
  el.style.backgroundSize = "200% auto";
  el.style.webkitBackgroundClip = "text";
  el.style.backgroundClip = "text";
  el.style.color = "transparent";
  el.style.animation = "gradientFlow 4s linear infinite";
  if (!document.getElementById("gradient-flow-kf")) {
    const s = document.createElement("style");
    s.id = "gradient-flow-kf";
    s.textContent = `@keyframes gradientFlow { 0%{background-position:0% center} 100%{background-position:200% center} }`;
    document.head.append(s);
  }
}

function applyWave(el: HTMLElement, text: string) {
  el.textContent = text;
  el.innerHTML = text
    .split("")
    .map((ch, i) =>
      ch === " "
        ? "<span>&nbsp;</span>"
        : `<span style="display:inline-block;animation:waveChar .8s ease-in-out ${i * 0.05}s infinite alternate">${ch}</span>`,
    )
    .join("");
  if (!document.getElementById("wave-kf")) {
    const s = document.createElement("style");
    s.id = "wave-kf";
    s.textContent = `@keyframes waveChar{0%{transform:translateY(0)}100%{transform:translateY(-6px);color:var(--color-accent,var(--accent))}}`;
    document.head.append(s);
  }
}

function applyFlicker(el: HTMLElement) {
  if (!document.getElementById("flicker-kf")) {
    const s = document.createElement("style");
    s.id = "flicker-kf";
    s.textContent = `@keyframes flicker{
      0%,95%,100%{opacity:1;text-shadow:0 0 10px var(--color-primary,var(--primary)),0 0 20px var(--color-primary,var(--primary))}
      96%{opacity:.4;text-shadow:none}
      97%{opacity:1;text-shadow:0 0 30px var(--color-primary,var(--primary))}
      98%{opacity:.6;text-shadow:none}
      99%{opacity:1}
    }`;
    document.head.append(s);
  }
  el.style.animation = "flicker 4s linear infinite";
  el.style.color = "var(--color-primary,var(--primary))";
}

function applyRevealClip(el: HTMLElement) {
  el.style.clipPath = "inset(0 100% 0 0)";
  el.style.transition = "clip-path 1s cubic-bezier(.77,0,.175,1)";
  observeIntersection(
    el,
    (entry) => {
      if (!entry.isIntersecting) return;
      el.style.clipPath = "inset(0 0% 0 0)";
    },
    { threshold: 0.2 },
  );
}

function apply3DRotate(el: HTMLElement) {
  el.style.transformStyle = "preserve-3d";
  el.style.perspective = "600px";
  el.addEventListener("mouseenter", () => {
    el.style.transition = "transform .6s cubic-bezier(.23,1,.32,1)";
    el.style.transform = "rotateX(15deg) rotateY(-10deg)";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "rotateX(0) rotateY(0)";
  });
  el.addEventListener("mousemove", (e: MouseEvent) => {
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 20;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -15;
    el.style.transition = "transform .1s";
    el.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`;
  });
}
