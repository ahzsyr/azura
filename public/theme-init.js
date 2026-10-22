(function () {
  var boot = window.__AZ_THEME_BOOT || {};
  var sk = boot.storageKeys || {};
  var path = window.location.pathname;
  var isAdmin = path.indexOf("/admin") === 0;
  var isEditorRoute = isAdmin || path.indexOf("/preview") === 0;
  var modeKey = isAdmin
    ? sk.adminTheme || "admin-theme"
    : sk.publicTheme || "devi-theme-mode";
  var root = document.documentElement;
  var stored = null;
  try {
    stored = localStorage.getItem(modeKey);
  } catch (e) {}
  var ssrMode = root.getAttribute("data-theme-mode");
  var ssrTheme = root.getAttribute("data-theme");
  var resolved = ssrTheme === "dark" || ssrTheme === "light" ? ssrTheme : "light";

  /** IIFE-scoped. beforeInteractive runs once per document load. */
  var _presetCache;
  var _presetCacheLoaded = false;

  function isHexColor(hex) {
    if (!hex || typeof hex !== "string") return false;
    var c = hex.replace("#", "").trim();
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    return c.length === 6 && /^[0-9a-fA-F]+$/.test(c);
  }

  // Part of the exclusive browser chrome meta writer set. See docs/browser-chrome-theme-sync.md.
  // Forced color priority MUST match src/lib/theme/resolve-forced-chrome-color.ts:
  // visitor preset → computed CSS → boot/SSR metas → defaults.
  // Never prefer SSR site metas over an applied visitor bootstrap.
  // Hex gate matches isLightBackgroundHex: 3- or 6-digit only. 8-digit and gradients fail.
  function isLightBackgroundHex(hex) {
    if (!isHexColor(hex)) return false;
    var c = hex.replace("#", "").trim();
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    var r = parseInt(c.slice(0, 2), 16) / 255;
    var g = parseInt(c.slice(2, 4), 16) / 255;
    var b = parseInt(c.slice(4, 6), 16) / 255;
    function lin(x) {
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    }
    var L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L > 0.55;
  }

  function readVisitorPresetColors() {
    if (_presetCacheLoaded) return _presetCache;
    _presetCacheLoaded = true;
    try {
      var raw = localStorage.getItem(sk.presetColors || "devi-user-preset-colors");
      _presetCache = raw ? JSON.parse(raw) : null;
      if (!_presetCache || typeof _presetCache !== "object") _presetCache = null;
    } catch (e) {
      _presetCache = null;
    }
    return _presetCache;
  }

  function safeParse(raw) {
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function projectionColor(mode) {
    var proj = boot.browserProjection || {};
    if (mode === "dark") return proj.themeColorDark || "#020408";
    return proj.themeColorLight || "#fafafa";
  }

  function clearVisitorPresetKeys() {
    try {
      localStorage.removeItem(sk.presetId || "devi-user-preset");
      localStorage.removeItem(sk.presetColors || "devi-user-preset-colors");
      localStorage.removeItem(sk.presetEffects || "devi-user-preset-effects");
      localStorage.removeItem(sk.presetVisual || "devi-user-preset-visual");
      localStorage.removeItem(sk.presetOrigin || "devi-user-preset-origin");
    } catch (e) {}
    _presetCache = null;
    _presetCacheLoaded = true;
  }

  /**
   * Drop Theme Studio / preview leakage that outranks the published site.
   * Keeps intentional visitor personalization (origin=visitor + catalog/user id).
   */
  function clearLeakedVisitorPreset() {
    if (isEditorRoute) return;
    try {
      var presetId = localStorage.getItem(sk.presetId || "devi-user-preset");
      if (!presetId) return;
      var origin = localStorage.getItem(sk.presetOrigin || "devi-user-preset-origin");
      if (origin !== "visitor") {
        clearVisitorPresetKeys();
        return;
      }
      var published = boot.publishedPresetIds || [];
      var userOk = false;
      try {
        var userRaw = localStorage.getItem(sk.userPresets || "devi-user-custom-presets");
        var userList = userRaw ? JSON.parse(userRaw) : null;
        if (Array.isArray(userList)) {
          for (var ui = 0; ui < userList.length; ui++) {
            if (userList[ui] && userList[ui].id === presetId) {
              userOk = true;
              break;
            }
          }
        }
      } catch (e) {}
      if (userOk) return;
      if (published.length && published.indexOf(presetId) === -1) {
        clearVisitorPresetKeys();
      }
    } catch (e) {}
  }

  /**
   * Active chrome always from published browserProjection (chromeTintSource baked).
   * Luminance safety: never paint a light projection as Forced dark chrome.
   * Visitor / computed page backgrounds are not sources — ThemeEngineProvider owns
   * post-boot tint after hydrate.
   */
  function resolveForcedChromeBg(mode) {
    var color = projectionColor(mode);
    if (mode === "dark" && isLightBackgroundHex(color)) {
      return "#020408";
    }
    return color;
  }

  /**
   * @param {string} browserColor Safari edge anchors / theme-color
   * @param {string} [glassColor] Header/footer glass — defaults to browserColor
   */
  function paintSafariChromeTint(browserColor, glassColor) {
    if (!browserColor) return;
    try {
      var glass = glassColor || browserColor;
      root.style.setProperty("--az-browser-chrome-tint", browserColor);
      root.style.setProperty("--az-site-glass-tint", glass);
      root.style.colorScheme = resolved === "dark" ? "dark" : "light";
      function paintExistingTint(id) {
        var el = document.getElementById(id);
        if (!el || !el.style) return;
        el.style.backgroundColor = browserColor;
      }
      paintExistingTint("az-safari-chrome-top");
      paintExistingTint("az-safari-chrome-bottom");
    } catch (e) {}
  }

  /**
   * @param {boolean} mutateHead
   *   When false (pre-hydration): paint Safari tint vars + anchors — never
   *   create/rewrite <meta> nodes (extra head children → React #418).
   *   When true (post-hydration): update theme-color metas from projection only;
   *   do NOT rewrite tint vars — ThemeEngineProvider is the sole post-boot mutator.
   */
  function syncThemeColorMetaFromProjection(mutateHead) {
    var mode = stored || ssrMode || "light";
    var paintMode =
      mode === "system"
        ? resolved === "dark"
          ? "dark"
          : "light"
        : mode === "dark"
          ? "dark"
          : "light";
    var bg = resolveForcedChromeBg(paintMode);
    if (!bg) return;

    // Pre-paint only: write --az-* tint vars. Post-hydrate leaves them alone.
    if (!mutateHead) {
      paintSafariChromeTint(bg, projectionColor(paintMode));
      return;
    }

    var metaBg = isHexColor(bg) ? bg : projectionColor(paintMode);
    if (!isHexColor(metaBg)) return;

    var existing = Array.prototype.slice.call(
      document.querySelectorAll('meta[name="theme-color"]'),
    );
    if (existing.length > 0) {
      var needsUpdate = false;
      for (var j = 0; j < existing.length; j++) {
        if (existing[j].getAttribute("content") !== metaBg) {
          needsUpdate = true;
          break;
        }
      }
      if (needsUpdate) {
        for (var mi = 0; mi < existing.length; mi++) {
          existing[mi].setAttribute("content", metaBg);
        }
      }
      return;
    }
    var meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = metaBg;
    document.head.appendChild(meta);
  }

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

  /**
   * Apply resolved appearance BEFORE chrome paint so the first theme-color
   * projection matches data-theme (kills light→dark chrome flash).
   * Clear leaked editor presets before any visitor color read.
   * Head <meta> mutations wait until after hydration (React #418).
   */
  try {
    clearLeakedVisitorPreset();
    root.style.colorScheme = resolved;
    if (resolved === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }

    var glassBoot = boot.glassEffect || {};
    var ssrGlass = root.getAttribute("data-glass-effect");
    var glassOn = glassBoot.enabled === true || ssrGlass === "liquid";
    root.setAttribute("data-glass-effect", glassOn ? "liquid" : "off");
    if (typeof glassBoot.intensity === "number") {
      root.style.setProperty("--glass-effect-intensity", String(glassBoot.intensity));
    }
    if (typeof glassBoot.opacity === "number") {
      root.style.setProperty("--glass-effect-opacity", String(glassBoot.opacity));
    }

    syncThemeColorMetaFromProjection(false);
  } catch (e) {}

  function runAfterHydration(fn) {
    var ran = false;
    function runOnce() {
      if (ran) return;
      ran = true;
      fn();
    }
    if (root.dataset.hydrated === "true") {
      runOnce();
      return;
    }
    document.addEventListener("azura:hydrated", runOnce, { once: true });
    window.addEventListener(
      "load",
      function () {
        requestAnimationFrame(function () {
          requestAnimationFrame(runOnce);
        });
      },
      { once: true },
    );
  }

  runAfterHydration(function () {
    try {
      root.classList.remove("light", "dark");
      if (resolved === "dark") {
        root.classList.add("dark");
      }
      root.style.colorScheme = resolved;
      root.setAttribute("data-theme", resolved);
      root.setAttribute("data-theme-mode", stored || ssrMode || "light");

      // Cookie name stays devi-theme-mode for public and /admin.
      // Admin localStorage is admin-theme. SSR reads APPEARANCE_MODE_COOKIE
      // (devi-theme-mode) for every route in src/app/layout.tsx.
      try {
        var cookieMode = stored || ssrMode || "light";
        if (cookieMode === "light" || cookieMode === "dark" || cookieMode === "system") {
          document.cookie =
            "devi-theme-mode=" + cookieMode + ";path=/;max-age=31536000;SameSite=Lax";
        }
      } catch (e) {}

      if (!isEditorRoute) {
        clearLeakedVisitorPreset();
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

        if (hasThemeResetCookie()) {
          _presetCache = null;
          _presetCacheLoaded = true;
          clearVisitorDomFromReset();
          applySitePresetBodyEffects();
        } else {
          var c = readVisitorPresetColors();
          var presetIdRaw = null;
          try {
            presetIdRaw = localStorage.getItem(sk.presetId || "devi-user-preset");
          } catch (e) {}
          if (c && presetIdRaw && c.primary) {
            var primary = c.primary;
            var accent = c.accent || primary;
            var secondary = c.secondary || accent;
            var border = "color-mix(in srgb, " + primary + " 14%, transparent)";
            var cssRules =
              "html{--primary:" +
              primary +
              ";--accent:" +
              accent +
              ";--p:var(--primary);--a:var(--accent);--color-primary:" +
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
              var skipSurface = resolved === "dark" && isLightBackgroundHex(bg);
              if (!skipSurface) {
                var text = c.text || (resolved === "dark" ? "#f4f4f5" : "#18181b");
                var muted = c.textMuted || (resolved === "dark" ? "#a1a1aa" : "#71717a");
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

          var visualRaw = null;
          var fxRaw = null;
          try {
            visualRaw = localStorage.getItem(sk.presetVisual || "devi-user-preset-visual");
            fxRaw = localStorage.getItem(sk.presetEffects || "devi-user-preset-effects");
          } catch (e) {}

          var v = safeParse(visualRaw);
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

          var fx = safeParse(fxRaw);
          if (fx) {
            if (fx.cardStyle) root.setAttribute("data-card-style", fx.cardStyle);
            if (fx.borderStyle) root.setAttribute("data-border-style", fx.borderStyle);
            if (fx.textEffect) {
              root.setAttribute("data-text-effect-theme", fx.textEffect);
              root.setAttribute("data-preset-text-effect", fx.textEffect);
            }
            var cursorPref = null;
            try {
              cursorPref = localStorage.getItem("devi-cursor-pref");
            } catch (e) {}
            if (fx.cursor && cursorPref !== "normal" && document.body) {
              document.body.setAttribute("data-cursor", fx.cursor);
            }
            if (fx.backgroundEffect && document.body) {
              document.body.setAttribute("data-bg-effect", fx.backgroundEffect);
            }
            markVisitorBootstrapped();
          } else {
            applySitePresetBodyEffects();
          }
        }
        void visitorBootstrapped;
      }

      syncThemeColorMetaFromProjection(true);
    } catch (e) {}
  });
})();
