export function ensureBgKeyframes(speed = 1): void {
  if (typeof document === "undefined") return;
  const styleId = "devi-bg-keyframes";
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  const gridDuration = `${20 / Math.max(speed, 0.25)}s`;
  const auroraDuration = `${12 / Math.max(speed, 0.25)}s`;
  const css = `
    @keyframes gridScroll { 0% { background-position: 0 0; } 100% { background-position: 60px 60px; } }
    @keyframes auroraMove { 0% { transform: translate(0,0) rotate(0deg); } 100% { transform: translate(5%,3%) rotate(3deg); } }
    [data-bg-effect="grid"], [data-section-bg-effect="grid"] {
      animation-duration: ${gridDuration} !important;
    }
    [data-bg-effect="aurora"] > div, [data-section-bg-effect="aurora"] > div {
      animation-duration: ${auroraDuration} !important;
    }
  `;
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.append(style);
  }
  style.textContent = css;
}
