#!/usr/bin/env node
/**
 * fix-edge-to-edge.mjs — apply + verify the edge-to-edge / chrome-tint fixes.
 *
 * Why this exists
 * ---------------
 * The first edge-to-edge implementation tucks page content under the site bar,
 * but two things are wrong on the home route and one on every route:
 *
 *  E1  DOUBLE PAD  The page-stack root reserved the bar's height AND the marketing
 *                  page component adds its own 76px band, so a 76px bar becomes a
 *                  164px hole and the hero crushes/overlaps. Measured: hero top
 *                  -88px with the pad, -164px without it.
 *  E2  LOGO CLIPPED `.site-header` uses `overflow-x: clip` on mobile, which clips
 *                  the logo's SVG mask (the tint span renders, the glyph box is
 *                  clipped away) -> an empty bar.
 *  E3  COLOR BASIS IGNORED  `chromeTintSource: "primary"` used to wash the preset
 *                  colour into the bar. The tint-engine refactor moved the bar to
 *                  the surface tint only, so "Primary" does nothing on the site bar.
 *  E4  NO FALLBACK When no site header is rendered (hero-only pages), the scroll
 *                  fade still paints at z 40 over the hero: a haze band at the top.
 *
 * Usage
 * -----
 *   node scripts/ds/fix-edge-to-edge.mjs --check     # dry run, reports state
 *   node scripts/ds/fix-edge-to-edge.mjs             # apply patches
 *   node scripts/ds/fix-edge-to-edge.mjs --verify    # apply + browser-verify
 *   node scripts/ds/fix-edge-to-edge.mjs --prod-check https://safeermedina.com/
 *       # curl production SSR and report Bayut-parity attrs (deploy gate)
 *
 * The script is idempotent: every patch is guarded by a marker check, so running
 * it twice does nothing the second time. It never reformats unrelated code.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const args = new Set(argv);
const CHECK = args.has("--check");
const VERIFY = args.has("--verify");
const prodIdx = argv.indexOf("--prod-check");
const PROD_URL =
  prodIdx >= 0
    ? argv[prodIdx + 1] && !argv[prodIdx + 1].startsWith("-")
      ? argv[prodIdx + 1]
      : "https://safeermedina.com/"
    : null;

let applied = 0;
let already = 0;
let failed = 0;

function patch(relPath, label, fn) {
  if (PROD_URL) return; // --prod-check is read-only against a live URL
  const abs = resolve(ROOT, relPath);
  if (!existsSync(abs)) {
    console.error(`  ✖ ${label}: missing file ${relPath}`);
    failed += 1;
    return;
  }
  const before = readFileSync(abs, "utf8");
  const after = fn(before);
  if (after === before) {
    console.log(`  = ${label} (already applied)`);
    already += 1;
    return;
  }
  if (after == null) {
    console.error(`  ✖ ${label}: patch anchor not found — file changed? (${relPath})`);
    failed += 1;
    return;
  }
  console.log(`  → ${label}  ${relPath}`);
  if (!CHECK) writeFileSync(abs, after);
  applied += 1;
}

/* ── E1: reserve the bar height exactly once ───────────────────────────────
 * The stack root gets the pad; the marketing page component must not add the
 * `.block-first-with-header-overlay` band on top of it. Scoping the selector to
 * "not under an edge-to-edge root" keeps the overlay path intact elsewhere. */
patch("src/app/globals.css", "E1 single reservation of bar height", (css) => {
  // Already fixed? (the cancellation rule exists)
  if (css.includes('[data-az-underlay="true"] .block-first-with-header-overlay {')) return css;
  // Undo a bad earlier patch that prepended a selector without removing the original.
  const badSelector = `[data-az-underlay="true"] .block-first-with-header-overlay,
.block-first-with-header-overlay,`;
  let next = css.includes(badSelector)
    ? css.replace(badSelector, `.block-first-with-header-overlay,`)
    : css;
  next = next.replace(
    `/* CMS / block / cover heroes: pull under fixed header and grow so media fills the inset.
 * Edge-to-edge pages already reserve the bar on the page-stack root
 * ([data-az-underlay]) — re-adding the band here double-pads the hero. */`,
    `/* CMS / block / cover heroes: pull under fixed header and grow so media fills the inset. */`
  );
  const anchor = `  min-height: calc(50vh + var(--header-height, 76px) + var(--header-overlay-top-gap, 12px));
}
`;
  if (!next.includes(anchor)) return null;
  return next.replace(
    anchor,
    `  min-height: calc(50vh + var(--header-height, 76px) + var(--header-overlay-top-gap, 12px));
}

/* Edge-to-edge: the page-stack root already reserves the bar height, so the
 * hero must not pull under the bar a second time. Geometry only — the hero
 * keeps its own min-height and internal padding. */
[data-az-underlay="true"] .block-first-with-header-overlay {
  margin-top: 0;
  padding-top: 0;
  min-height: 0;
}
`
  );
});

/* ── E2: never clip the bar's own content ──────────────────────────────────
 * overflow-x: clip was there to stop wide mega menus, but on the mobile bar it
 * also clips the masked logo. The clip is unnecessary on mobile (menus are not
 * in the bar); keep it only where a dropdown can overflow horizontally. */
patch("src/features/navigation/components/header/header-builder.css", "E2 stop clipping the logo", (css) => {
  if (css.includes("/* edge-to-edge: never clip the bar content")) return css;
  const anchor = `  border-radius: var(--header-radius, 20px);
  font-family: var(--font-body, var(--az-font-body, inherit));
  overflow-x: clip;`;
  if (!css.includes(anchor)) return null;
  return css.replace(
    anchor,
    `  border-radius: var(--header-radius, 20px);
  font-family: var(--font-body, var(--az-font-body, inherit));
  /* edge-to-edge: never clip the bar content — overflow-x: clip cut the masked
     logo glyph out of the bar. Menus live in portals; the bar itself never
     overflows horizontally. */
  overflow: visible;`
  );
});

/* ── E3: make "Color basis" honest on the site bar ─────────────────────────
 * Solid always used the surface. Primary must wash the preset colour into the
 * bar for glass/transparent, exactly as the Theme Studio copy promises.
 * The attribute lives on .header-root, so the rule is scoped there. */
patch("src/styles/edge-to-edge.css", "E3 honor chromeTintSource=primary", (css) => {
  if (css.includes("--az-chrome-primary-wash")) return css;
  const anchor = `/* Solid: opaque surface (luminance-safe).`;
  if (!css.includes(anchor)) return null;
  return css.replace(
    anchor,
    `/* Color basis = Primary: wash the preset primary into the bar for the
 * translucent styles (the Theme Studio copy promises this). Surface tint stays
 * the default. background-color is used because the specular image is owned by
 * site-glass-effect.css; [data-edge-to-edge] keeps specificity above it. */
html[data-chrome-tint-style="glass"] .header-root[data-chrome-tint-source="primary"][data-edge-to-edge] .site-header,
html[data-chrome-tint-style="transparent"] .header-root[data-chrome-tint-source="primary"][data-edge-to-edge] .site-header {
  background-color: color-mix(
    in srgb,
    var(--primary, #047857) var(--az-chrome-primary-wash, 22%),
    color-mix(
      in srgb,
      var(--az-site-glass-tint, #ffffff) calc(var(--az-site-glass-fill-alpha, 0.45) * 100%),
      transparent
    )
  ) !important;
}

/* Solid: opaque surface (luminance-safe).`
  );
});

/* ── E4: no fade when there is no bar to fade into ─────────────────────────
 * If the route renders no site header, the fixed fade layer would paint a haze
 * band across the hero. Hide both chrome layers when the header is absent. */
patch("src/styles/edge-to-edge.css", "E4 hide chrome layers without a header", (css) => {
  if (css.includes("data-has-site-header")) return css;
  const anchor = `[data-edge-to-edge="off"] .az-chrome-tint-zone,`;
  if (!css.includes(anchor)) return null;
  return css.replace(
    anchor,
    `/* No site bar on this route (hero-only page): the fixed chrome layers would
 * paint a haze band over the hero. ChromeEdgeLayers publishes the flag. */
html[data-has-site-header="false"] .az-chrome-tint-zone,
html[data-has-site-header="false"] .az-chrome-scroll-edge {
  display: none;
}

[data-edge-to-edge="off"] .az-chrome-tint-zone,`
  );
});

/* ── Verify (browser) ──────────────────────────────────────────────────────
 * Fails unless the fixes hold at both breakpoints:
 *   V1  home: hero top ≈ 0 (no double reservation)
 *   V2  bar content is not clipped (header overflow is visible)
 *   V3  data-chrome-tint-source is emitted
 *   V4  content actually passes under the bar (main margin-top is negative)
 *
 * Requires the dev server and PLAYWRIGHT_BROWSERS_PATH-less Chrome.
 * Run: node scripts/ds/fix-edge-to-edge.mjs --verify
 */
async function verify() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  try {
    for (const vp of [
      { label: "desktop", width: 1440, height: 900, mobile: false },
      { label: "mobile", width: 393, height: 852, mobile: true },
    ]) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
      });
      const page = await ctx.newPage();
      await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 90_000 });
      await page.waitForTimeout(3500);
      const m = await page.evaluate(() => {
        const hero = document.querySelector(".site-main section");
        const header = document.querySelector(".site-header");
        const main = document.querySelector(".site-main");
        const root = document.querySelector(".header-root");
        return {
          heroTop: hero ? Math.round(hero.getBoundingClientRect().top) : null,
          overflow: header ? getComputedStyle(header).overflow : null,
          tintSource: root?.getAttribute("data-chrome-tint-source") ?? null,
          mainMarginTop: main ? getComputedStyle(main).marginTop : null,
        };
      });
      const tag = `[${vp.label}]`;
      add(`${tag} V1 hero not double-pulled (top >= -2)`, m.heroTop == null || m.heroTop >= -2, `heroTop=${m.heroTop}`);
      add(`${tag} V2 bar content not clipped`, m.overflow === "visible", `overflow=${m.overflow}`);
      add(`${tag} V3 tint source emitted`, m.tintSource === "surface" || m.tintSource === "primary", `=${m.tintSource}`);
      add(`${tag} V4 content under the bar`, m.mainMarginTop?.startsWith("-") ?? false, `margin-top=${m.mainMarginTop}`);
      await ctx.close();
    }
  } catch (error) {
    add("browser verification", false, String(error).slice(0, 160));
  } finally {
    await browser.close();
  }

  for (const c of checks) console.log(`  ${c.ok ? "✔" : "✖"} ${c.name}  (${c.detail})`);
  const bad = checks.filter((c) => !c.ok).length;
  console.log(`\nverify: ${checks.length - bad} passed, ${bad} failed`);
  if (bad > 0) process.exitCode = 1;
}

async function prodCheck(url) {
  console.log(`\nprod-check: ${url}`);
  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "azura-edge-to-edge-check/1.0" },
      redirect: "follow",
    });
    html = await res.text();
    console.log(`  HTTP ${res.status}  bytes=${html.length}`);
  } catch (error) {
    console.error(`  ✖ fetch failed: ${String(error).slice(0, 160)}`);
    process.exitCode = 1;
    return;
  }

  const pick = (re) => {
    const m = html.match(re);
    return m ? m[1] ?? m[0] : null;
  };

  const report = {
    edgeToEdge: pick(/data-edge-to-edge="([^"]+)"/),
    glassEffect: pick(/data-glass-effect="([^"]+)"/),
    chromeTintStyle: pick(/data-chrome-tint-style="([^"]+)"/),
    chromeTintSource: pick(/data-chrome-tint-source="([^"]+)"/),
    themeColor: pick(/name="theme-color"[^>]*content="([^"]+)"/),
    viewportFit: /viewport-fit=cover/.test(html),
    iosStatusBar: pick(/apple-mobile-web-app-status-bar-style"\s+content="([^"]+)"/),
    chromeLayerChunk: /az-chrome-tint-zone|ChromeEdgeLayers/.test(html),
  };

  for (const [k, v] of Object.entries(report)) {
    console.log(`  ${k}: ${v === null || v === false ? "MISSING" : v === true ? "yes" : v}`);
  }

  const fail = [];
  if (!report.edgeToEdge) {
    fail.push("SSR missing data-edge-to-edge — redeploy full build (stale SSR + new client = cream empty band)");
  }
  if (report.glassEffect === "off" || report.glassEffect == null) {
    fail.push('data-glass-effect is off/missing — enable site Liquid Glass for real translucency ("Glass 70%" alone is not enough)');
  }
  if (!report.viewportFit) {
    fail.push("viewport-fit=cover missing — status-bar edge-to-edge will not opt in");
  }
  if (fail.length) {
    console.log("\n  Deploy / config gaps:");
    for (const f of fail) console.log(`  ✖ ${f}`);
    process.exitCode = 1;
  } else {
    console.log("\n  ✔ SSR attrs look edge-to-edge ready (still verify on a real iPhone)");
  }
}

if (PROD_URL) {
  await prodCheck(PROD_URL);
} else {
  process.stdout.write(
    `\n${CHECK ? "check" : "apply"}: ${applied} patched, ${already} already applied, ${failed} failed\n`,
  );
  if (failed > 0) process.exitCode = 1;
  if (VERIFY && !CHECK) await verify();
}
