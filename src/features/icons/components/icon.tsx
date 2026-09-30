"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveIconById, type IconRenderProps, type ResolvedIcon } from "../lib/icon-resolver";
import { buildFontIconStyle, ensureFontFaceLoaded, glyphFromUnicode } from "../lib/font-registry";

function renderResolvedIcon(resolved: ResolvedIcon, { className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  if (resolved.kind === "builtin") {
    const Icon = resolved.icon;
    return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
  }

  if (resolved.kind === "custom-svg") {
    // svgContent is persisted only after strict sanitization on upload.
    return <span className={className} aria-hidden dangerouslySetInnerHTML={{ __html: resolved.svgContent }} />;
  }

  if (resolved.kind === "font") {
    const glyphChar = glyphFromUnicode(resolved.unicode, resolved.glyph);
    return (
      <span
        className={className}
        aria-hidden
        style={buildFontIconStyle(resolved.fontFamily)}
      >
        {glyphChar}
      </span>
    );
  }

  return null;
}

export function Icon(props: IconRenderProps & { className?: string; strokeWidth?: number }) {
  const builtinResolved = useMemo(() => resolveIconById(props.iconId), [props.iconId]);
  const [resolved, setResolved] = useState<ResolvedIcon | null>(builtinResolved);
  const [fontReady, setFontReady] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (builtinResolved) {
      setResolved(builtinResolved);
      setFontReady(true);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/icons/by-id?iconId=${encodeURIComponent(props.iconId)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { icon: any | null };
        if (!json.icon || cancelled) return;

        if (json.icon.source === "CUSTOM" && json.icon.type === "SVG" && typeof json.icon.svgContent === "string") {
          setResolved({ kind: "custom-svg", svgContent: json.icon.svgContent });
          setFontReady(true);
          return;
        }

        if (json.icon.source === "FONT" && typeof json.icon.fontFamily === "string" && typeof json.icon.glyph === "string") {
          const fontUrl = typeof json.icon.media?.url === "string" ? json.icon.media.url : null;
          setResolved({
            kind: "font",
            fontFamily: json.icon.fontFamily,
            glyph: json.icon.glyph,
            unicode: json.icon.unicode,
            fontUrl,
          });
          if (fontUrl) {
            setFontReady(false);
            await ensureFontFaceLoaded(json.icon.fontFamily, fontUrl);
            if (!cancelled) setFontReady(true);
          } else {
            setFontReady(true);
          }
        }
      } catch {
        // Fail safe: unresolved iconId renders null.
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [builtinResolved, props.iconId]);

  if (!resolved) return null;
  if (resolved.kind === "font" && !fontReady) return null;
  return renderResolvedIcon(resolved, { className: props.className, strokeWidth: props.strokeWidth });
}

