(function () {
  try {
    var boot = window.__AZ_THEME_BOOT || {};
    var sk = boot.storageKeys || {};
    var path = window.location.pathname;
    var isAdmin = path.indexOf("/admin") === 0;
    var modeKey = isAdmin
      ? sk.adminTheme || "admin-theme"
      : sk.publicTheme || "devi-theme-mode";
    var root = document.documentElement;
    var stored = localStorage.getItem(modeKey);
    var ssrMode = root.getAttribute("data-theme-mode");
    var ssrTheme = root.getAttribute("data-theme");
    var resolved = ssrTheme === "dark" || ssrTheme === "light" ? ssrTheme : "light";

    if (stored === "dark" || stored === "light") {
      resolved = stored;
    } else if (stored === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else if (ssrMode === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else if (ssrMode === "dark" || ssrMode === "light") {
      resolved = ssrMode;
    }

    root.classList.remove("light", "dark");
    if (resolved === "dark") {
      root.classList.add("dark");
    }
    root.style.colorScheme = resolved;
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-theme-mode", stored || ssrMode || "light");

    if (!isAdmin) {
      var metricsKeys = boot.metricsKeys || [];
      var metricsFieldMap = boot.metricsFieldMap || {};

      function applyMetricsFromSnapshot(metrics) {
        if (!metrics) return;
        for (var i = 0; i < metricsKeys.length; i++) {
          var cssKey = metricsKeys[i];
          var field = metricsFieldMap[cssKey];
          if (field === "shadowAmbient") {
            root.style.setProperty(
              cssKey,
              "var(--az-shadow-ambient, rgb(0 0 0 / 0.35))",
            );
          } else if (field && metrics[field] != null) {
            root.style.setProperty(cssKey, String(metrics[field]));
          }
        }
        if (metrics.particlesEnabled) {
          root.setAttribute("data-preset-particles", "on");
        }
        if (metrics.animatedEffectsEnabled) {
          root.setAttribute("data-preset-animated", "on");
        }
      }

      var colorsRaw = localStorage.getItem(
        sk.presetColors || "devi-user-preset-colors",
      );
      if (colorsRaw) {
        var c = JSON.parse(colorsRaw);
        if (c && c.primary) {
          var primary = c.primary;
          var accent = c.accent || primary;
          var secondary = c.secondary || accent;
          var border = "color-mix(in srgb, " + primary + " 14%, transparent)";

          root.style.setProperty("--primary", primary);
          root.style.setProperty("--accent", accent);
          root.style.setProperty("--p", primary);
          root.style.setProperty("--a", accent);
          root.style.setProperty("--color-primary", primary);
          root.style.setProperty("--color-accent", accent);
          root.style.setProperty("--color-secondary", secondary);
          root.style.setProperty("--az-color-primary", primary);
          root.style.setProperty("--az-color-accent", accent);
          root.style.setProperty("--az-color-secondary", secondary);
          root.style.setProperty("--az-accent", accent);
          root.style.setProperty("--az-border-subtle", border);
          root.style.setProperty("--az-color-border", border);

          if (c.background) {
            var bg = c.background;
            var surface = c.surface || bg;
            var text =
              c.text || (resolved === "dark" ? "#f4f4f5" : "#18181b");
            var muted =
              c.textMuted || (resolved === "dark" ? "#a1a1aa" : "#71717a");
            root.style.setProperty("--background", bg);
            root.style.setProperty("--foreground", text);
            root.style.setProperty("--card", surface);
            root.style.setProperty("--bg", bg);
            root.style.setProperty("--sur", surface);
            root.style.setProperty("--t", text);
            root.style.setProperty("--m", muted);
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

      var visualRaw = localStorage.getItem(
        sk.presetVisual || "devi-user-preset-visual",
      );
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
          applyMetricsFromSnapshot(v.metrics);
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

      var fxRaw = localStorage.getItem(
        sk.presetEffects || "devi-user-preset-effects",
      );
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
