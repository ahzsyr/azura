/** Stable admin UI dates (SSR + client must match; pin locale + UTC timezone). */
const ADMIN_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
};

export function formatAdminDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", ADMIN_DATE_OPTIONS).format(date);
}
