import type { NextRequest } from "next/server";

export const LOCALE_ROUTING_FETCH_TIMEOUT_MS = 5_000;
export const REDIRECT_LOOKUP_FETCH_TIMEOUT_MS = 3_000;
export const SETUP_STATUS_FETCH_TIMEOUT_MS = 8_000;

export function internalAppOrigin(): string {
  return (
    process.env.INTERNAL_APP_URL?.trim() ||
    `http://127.0.0.1:${process.env.PORT ?? 3000}`
  );
}

export function internalFetchOrigins(request: NextRequest): string[] {
  return [
    request.nextUrl.origin,
    internalAppOrigin(),
    `http://127.0.0.1:${process.env.PORT ?? 3000}`,
  ].filter((origin, index, list) => origin && list.indexOf(origin) === index);
}
