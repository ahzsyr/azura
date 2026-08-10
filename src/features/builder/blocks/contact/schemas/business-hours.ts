import { z } from "zod";

export const WEEKDAY_VALUES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAY_VALUES)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const businessHoursDaySchema = z.object({
  day: z.enum(WEEKDAY_VALUES),
  open: z.string().default("09:00"),
  close: z.string().default("18:00"),
  closed: z.boolean().default(false),
});

export type BusinessHoursDay = z.infer<typeof businessHoursDaySchema>;

export const businessHoursSchema = z.array(businessHoursDaySchema).default([]);

export function defaultBusinessHours(): BusinessHoursDay[] {
  return WEEKDAY_VALUES.map((day) => ({
    day,
    open: "09:00",
    close: "18:00",
    closed: day === "saturday" || day === "sunday",
  }));
}

/** Compact summary e.g. "Mon–Fri 9am–6pm" */
export function summarizeBusinessHours(days: BusinessHoursDay[]): string {
  if (!days.length) return "";
  const openDays = days.filter((d) => !d.closed);
  if (!openDays.length) return "Closed all week";
  const first = openDays[0];
  const sameHours = openDays.every((d) => d.open === first.open && d.close === first.close);
  if (sameHours && openDays.length >= 5) {
    const labels = openDays.map((d) => WEEKDAY_LABELS[d.day].slice(0, 3));
    return `${labels[0]}–${labels[labels.length - 1]} ${formatTime(first.open)} – ${formatTime(first.close)}`;
  }
  return openDays
    .map((d) => `${WEEKDAY_LABELS[d.day].slice(0, 3)} ${formatTime(d.open)}–${formatTime(d.close)}`)
    .join(", ");
}

function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr) || 0;
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 || 12;
  return m ? `${hour12}:${String(m).padStart(2, "0")}${period}` : `${hour12}${period}`;
}
