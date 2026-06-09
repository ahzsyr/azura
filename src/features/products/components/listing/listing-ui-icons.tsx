/** Inline SVG icons for product listing UI (encoding-safe, theme-aware via currentColor). */

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const iconSm = { ...svgProps, width: 14, height: 14 };

export function IconSearch() {
  return (
    <svg {...svgProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg {...svgProps}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IconGrid() {
  return (
    <svg {...svgProps}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconList() {
  return (
    <svg {...svgProps}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function IconTable() {
  return (
    <svg {...svgProps}>
      <path d="M3 6h18v12H3zM3 10h18M3 14h18M9 6v12M15 6v12" />
    </svg>
  );
}

export function IconEllipsis() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function IconChevron({ up = false }: { up?: boolean }) {
  return (
    <svg {...iconSm}>
      {up ? <path d="M18 15l-6-6-6 6" /> : <path d="M6 9l6 6 6-6" />}
    </svg>
  );
}

export function viewModeIcon(mode: "grid" | "list" | "table") {
  switch (mode) {
    case "list":
      return <IconList />;
    case "table":
      return <IconTable />;
    default:
      return <IconGrid />;
  }
}
