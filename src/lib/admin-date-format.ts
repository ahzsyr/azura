/** Stable admin UI dates (SSR + client must match; avoid browser default locale). */
const ADMIN_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export function formatAdminDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-GB", ADMIN_DATE_OPTIONS).format(date);
}
