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
      var visitorBootstrapped = false;

      function hasThemeResetCookie() {
        return document.cookie.split("; ").some(function (c) {
          return c === "theme-reset=1";
        });
      }

      function clearVisitorDomFromReset() {
        var existing = document.getElementById("az-visitor-theme");
        if (existing) existing.remove();
        root.removeAttribute("data-visitor-theme-bootstrapped");
        var cssKeys = [
          "--primary",
          "--accent",
          "--p",
          "--a",
          "--color-primary",
          "--color-accent",
          "--color-secondary",
          "--az-color-primary",
          "--az-color-accent",
          "--az-color-secondary",
          "--az-accent",
          "--az-border-subtle",
          "--az-color-border",
          "--background",
          "--foreground",
          "--card",
          "--bg",
          "--sur",
          "--t",
          "--m",
          "--az-bg-primary",
          "--az-bg-secondary",
          "--az-text-primary",
          "--az-text-secondary",
          "--az-color-bg",
          "--az-color-surface",
          "--az-color-text",
          "--az-color-muted",
        ];
        for (var ci = 0; ci < cssKeys.length; ci++) {
          root.style.removeProperty(cssKeys[ci]);
        }
        if (document.body) {
          document.body.removeAttribute("data-cursor");
          document.body.removeAttribute("data-bg-effect");
        }
      }

      function applySitePresetBodyEffects() {
        if (root.getAttribute("data-visitor-theme-bootstrapped") === "true") return;
        var presetBg = root.getAttribute("data-preset-background");
        if (presetBg && document.body) {
          document.body.setAttribute("data-bg-effect", presetBg);
        }
        var textFx = root.getAttribute("data-preset-text-effect");
        if (textFx) {
          root.setAttribute("data-text-effect-theme", textFx);
          root.setAttribute("data-preset-text-effect", textFx);
        }
      }

      function markVisitorBootstrapped() {
        visitorBootstrapped = true;
        root.setAttribute("data-visitor-theme-bootstrapped", "true");
      }

      function injectVisitorThemeStyle(cssText) {
        if (!cssText) return;
        var existing = document.getElementById("az-visitor-theme");
        if (existing) existing.remove();
        var style = document.createElement("style");
        style.id = "az-visitor-theme";
        style.textContent = cssText;
        (document.head || root).appendChild(style);
      }

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

      function isLightBackground(hex) {
        if (!hex || typeof hex !== "string") return false;
        var n = hex.replace("#", "").trim();
        if (n.length !== 6) return false;
        var r = parseInt(n.slice(0, 2), 16) / 255;
        var g = parseInt(n.slice(2, 4), 16) / 255;
        var b = parseInt(n.slice(4, 6), 16) / 255;
        var lin = function (c) {
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        };
        var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        return L > 0.55;
      }

      if (hasThemeResetCookie()) {
        clearVisitorDomFromReset();
        applySitePresetBodyEffects();
      } else {
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
          var cssRules =
            "html{--primary:" +
            primary +
            ";--accent:" +
            accent +
            ";--p:" +
            primary +
            ";--a:" +
            accent +
            ";--color-primary:" +
            primary +
            ";--color-accent:" +
            accent +
            ";--color-secondary:" +
            secondary +
            ";--az-color-primary:" +
            primary +
            ";--az-color-accent:" +
            accent +
            ";--az-color-secondary:" +
            secondary +
            ";--az-accent:" +
            accent +
            ";--az-border-subtle:" +
            border +
            ";--az-color-border:" +
            border +
            ";}";

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
            var skipSurface = resolved === "dark" && isLightBackground(bg);
            if (!skipSurface) {
              var text =
                c.text || (resolved === "dark" ? "#f4f4f5" : "#18181b");
              var muted =
                c.textMuted || (resolved === "dark" ? "#a1a1aa" : "#71717a");
              cssRules =
                cssRules.slice(0, -1) +
                "--background:" +
                bg +
                ";--foreground:" +
                text +
                ";--card:" +
                surface +
                ";--bg:" +
                bg +
                ";--sur:" +
                surface +
                ";--t:" +
                text +
                ";--m:" +
                muted +
                ";--az-bg-primary:" +
                bg +
                ";--az-bg-secondary:" +
                surface +
                ";--az-text-primary:" +
                text +
                ";--az-text-secondary:" +
                muted +
                ";--az-color-bg:" +
                bg +
                ";--az-color-surface:" +
                surface +
                ";--az-color-text:" +
                text +
                ";--az-color-muted:" +
                muted +
                ";}";
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

          injectVisitorThemeStyle(cssRules);
          markVisitorBootstrapped();
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
          markVisitorBootstrapped();
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
          var cursorPref = localStorage.getItem("devi-cursor-pref");
          if (fx.cursor && cursorPref !== "normal") {
            document.body.setAttribute("data-cursor", fx.cursor);
          }
          if (fx.backgroundEffect) {
            document.body.setAttribute("data-bg-effect", fx.backgroundEffect);
          }
          markVisitorBootstrapped();
        }
        } else {
          applySitePresetBodyEffects();
        }
      }
    }
  } catch (e) {}
})();
