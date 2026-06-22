/**
 * PDP horizontal overflow audit — finds elements wider than the viewport.
 * Usage: node scripts/audit-pdp-overflow.mjs [url] [width]
 * Example: node scripts/audit-pdp-overflow.mjs http://localhost:3000/en-us/products/alfa-2-4-5ghz-indoor-antenna-5-7dbi-rp-sma-male 375
 */

/**
 * PDP horizontal overflow audit — finds elements wider than the viewport.
 * Requires: npm install playwright && npx playwright install chromium
 * Usage: node scripts/audit-pdp-overflow.mjs [url]
 */

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Install Playwright first: npm install playwright && npx playwright install chromium");
  process.exit(1);
}

const url =
  process.argv[2] ??
  "http://localhost:3000/en-us/products/alfa-2-4-5ghz-indoor-antenna-5-7dbi-rp-sma-male";
const width = Number(process.argv[3] ?? 375);
const widths = process.argv[3] ? [width] : [320, 360, 375, 390, 414, 480, 640, 768];

async function auditAtWidth(browser, targetUrl, w) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 120000 });

  const offenders = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const results = [];
    for (const el of document.querySelectorAll("*")) {
      if (el.scrollWidth > docWidth + 1) {
        const id = el.id ? `#${el.id}` : "";
        const classes =
          el.className && typeof el.className === "string"
            ? `.${el.className.split(/\s+/).slice(0, 3).join(".")}`
            : "";
        const tag = el.tagName.toLowerCase();
        const style = window.getComputedStyle(el);
        results.push({
          selector: `${tag}${id}${classes}`,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflowPx: el.scrollWidth - docWidth,
          overflowX: style.overflowX,
          minWidth: style.minWidth,
          width: style.width,
          position: style.position,
        });
      }
    }
    return {
      docWidth,
      bodyOverflow: document.body.scrollWidth > docWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders: results.slice(0, 40),
    };
  });

  await page.close();
  return { width: w, ...offenders };
}

const browser = await chromium.launch({ headless: true });
let failed = false;

for (const w of widths) {
  const result = await auditAtWidth(browser, url, w);
  const status = result.bodyOverflow ? "FAIL" : "PASS";
  if (result.bodyOverflow) failed = true;
  console.log(`\n[${status}] ${w}px — doc=${result.docWidth} bodyScroll=${result.bodyScrollWidth}`);
  if (result.offenders.length) {
    console.log("Offenders (top 15):");
    for (const o of result.offenders.slice(0, 15)) {
      console.log(
        `  +${o.overflowPx}px ${o.selector} scroll=${o.scrollWidth} overflow-x=${o.overflowX} min-width=${o.minWidth}`,
      );
    }
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
