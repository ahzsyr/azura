(function () {
  try {
    var path = window.location.pathname;
    var isAdmin = path.indexOf("/admin") === 0;
    var modeKey = isAdmin ? "admin-theme" : "devi-theme-mode";
    var stored = localStorage.getItem(modeKey);
    var resolved = "light";

    if (stored === "dark" || stored === "light") {
      resolved = stored;
    } else if (stored === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    var root = document.documentElement;
    root.classList.remove("light", "dark");
    if (resolved === "dark") {
      root.classList.add("dark");
    }
    root.style.colorScheme = resolved;
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-theme-mode", stored || "light");

    if (!isAdmin) {
      var colorsRaw = localStorage.getItem("devi-user-preset-colors");
      if (colorsRaw) {
        var c = JSON.parse(colorsRaw);
        if (c && c.primary) {
          var primary = c.primary;
          var accent = c.accent || primary;
          var secondary = c.secondary || accent;
          var border = "color-mix(in srgb, " + primary + " 14%, transparent)";

          root.style.setProperty("--primary", primary);
          root.style.setProperty("--accent", accent);
          root.style.setProperty("--color-primary", primary);
          root.style.setProperty("--color-accent", accent);
          root.style.setProperty("--color-secondary", secondary);
          root.style.setProperty("--az-color-primary", primary);
          root.style.setProperty("--az-color-accent", accent);
          root.style.setProperty("--az-color-secondary", secondary);
          root.style.setProperty("--az-accent", accent);
          root.style.setProperty("--az-border-subtle", border);
          root.style.setProperty("--az-color-border", border);

          if (resolved === "dark" && c.background) {
            var bg = c.background;
            var surface = c.surface || bg;
            var text = c.text || "#f4f4f5";
            var muted = c.textMuted || "#a1a1aa";
            root.style.setProperty("--background", bg);
            root.style.setProperty("--foreground", text);
            root.style.setProperty("--card", surface);
            root.style.setProperty("--az-bg-primary", bg);
            root.style.setProperty("--az-bg-secondary", surface);
            root.style.setProperty("--az-text-primary", text);
            root.style.setProperty("--az-text-secondary", muted);
            root.style.setProperty("--az-color-bg", bg);
            root.style.setProperty("--az-color-surface", surface);
            root.style.setProperty("--az-color-text", text);
            root.style.setProperty("--az-color-muted", muted);
          }
        }
      }

      var visualRaw = localStorage.getItem("devi-user-preset-visual");
      if (visualRaw) {
        var v = JSON.parse(visualRaw);
        if (v) {
          if (v.cardStyle) root.setAttribute("data-card-style", v.cardStyle);
          if (v.borderStyle) root.setAttribute("data-border-style", v.borderStyle);
          if (v.presetId) root.setAttribute("data-preset-id", v.presetId);
          if (v.backgroundEffect)
            root.setAttribute("data-preset-background", v.backgroundEffect);
          if (v.textEffect) {
            root.setAttribute("data-preset-text-effect", v.textEffect);
            root.setAttribute("data-text-effect-theme", v.textEffect);
          }
          if (v.metrics) {
            var m = v.metrics;
            var map = {
              "--az-preset-gradient-hero": m.gradientHero,
              "--az-preset-gradient-accent": m.gradientAccent,
              "--az-preset-gradient-surface": m.gradientSurface,
              "--az-preset-radius-sm": m.radiusSm,
              "--az-preset-radius-md": m.radiusMd,
              "--az-preset-radius-lg": m.radiusLg,
              "--az-preset-radius-card": m.radiusCard,
              "--az-preset-shadow-sm": m.shadowSm,
              "--az-preset-shadow-md": m.shadowMd,
              "--az-preset-shadow-lg": m.shadowLg,
              "--az-preset-shadow-card": m.shadowCard,
              "--az-preset-shadow-glow": m.shadowGlow,
              "--az-preset-blur-glass": m.blurGlass,
              "--az-preset-blur-panel": m.blurPanel,
              "--az-preset-blur-overlay": m.blurOverlay,
              "--az-preset-glass-opacity": m.glassOpacity,
              "--az-preset-glass-saturation": m.glassSaturation,
              "--az-preset-glow-color": m.glowColor,
              "--az-preset-glow-intensity": m.glowIntensity,
              "--az-preset-glow-spread": m.glowSpread,
              "--az-preset-border-width": m.borderWidth,
              "--az-preset-border-glow": m.borderGlow,
            };
            for (var key in map) {
              if (map[key] != null) root.style.setProperty(key, String(map[key]));
            }
            if (m.particlesEnabled)
              root.setAttribute("data-preset-particles", "on");
            if (m.animatedEffectsEnabled)
              root.setAttribute("data-preset-animated", "on");
          }
          if (v.typography) {
            root.style.setProperty(
              "--az-font-display",
              "'" + v.typography.display + "', sans-serif",
            );
            root.style.setProperty(
              "--az-font-body",
              "'" + v.typography.body + "', sans-serif",
            );
            root.style.setProperty(
              "--az-font-mono",
              "'" + v.typography.mono + "', monospace",
            );
          }
        }
      }

      var fxRaw = localStorage.getItem("devi-user-preset-effects");
      if (fxRaw) {
        var fx = JSON.parse(fxRaw);
        if (fx) {
          if (fx.cardStyle) root.setAttribute("data-card-style", fx.cardStyle);
          if (fx.borderStyle) root.setAttribute("data-border-style", fx.borderStyle);
          if (fx.textEffect) {
            root.setAttribute("data-text-effect-theme", fx.textEffect);
            root.setAttribute("data-preset-text-effect", fx.textEffect);
          }
          if (fx.cursor) document.body.setAttribute("data-cursor", fx.cursor);
          if (fx.backgroundEffect) {
            document.body.setAttribute("data-bg-effect", fx.backgroundEffect);
          }
        }
      } else {
        var presetBg = root.getAttribute("data-preset-background");
        if (presetBg) document.body.setAttribute("data-bg-effect", presetBg);
      }
    }
  } catch (e) {}
})();
