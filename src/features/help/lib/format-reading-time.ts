export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return "30 sec";
  if (minutes === 1) return "1 min";
  return `${Math.round(minutes)} min`;
}
