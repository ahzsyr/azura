import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { CurrencyConfigFile, CurrencyEntry } from "./types";
import embedded from "../../../../data/currency.config.json";

const CONFIG_PATH = () => resolve(process.cwd(), "src/data/currency.config.json");

let serverCache: { mtime: number; data: CurrencyConfigFile } | null = null;

/**
 * Active currency config. On the server, re-reads `src/data/currency.config.json` when the file mtime changes
 * so admin edits apply without restarting the process.
 */
export function getCurrencyConfig(): CurrencyConfigFile {
  if (typeof window !== "undefined") {
    return embedded as CurrencyConfigFile;
  }
  try {
    const path = CONFIG_PATH();
    if (!existsSync(path)) return embedded as CurrencyConfigFile;
    const mtime = statSync(path).mtimeMs;
    if (serverCache && serverCache.mtime === mtime) return serverCache.data;
    const data = JSON.parse(readFileSync(path, "utf-8")) as CurrencyConfigFile;
    serverCache = { mtime, data };
    return data;
  } catch {
    return embedded as CurrencyConfigFile;
  }
}

export function getCurrencyCookieName(): string {
  return getCurrencyConfig().cookieName;
}

export function getCurrencyCookieMaxAge(): number {
  return getCurrencyConfig().cookieMaxAge;
}

export function isSupportedDisplayCurrency(code: string): boolean {
  const c = code.trim().toUpperCase();
  return getCurrencyConfig().currencies.some((x) => x.code.toUpperCase() === c);
}

export function getCurrencyEntry(code: string): CurrencyEntry | undefined {
  const c = code.trim().toUpperCase();
  return getCurrencyConfig().currencies.find((x) => x.code.toUpperCase() === c);
}

export function normalizeRates(rates: Record<string, number>, base: string): Record<string, number> {
  const b = base.toUpperCase();
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rates)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k.toUpperCase()] = n;
  }
  if (!(out[b] > 0)) out[b] = 1;
  return out;
}
