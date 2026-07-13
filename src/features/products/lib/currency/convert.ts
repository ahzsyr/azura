/**
 * Cross-rate conversion. `rates[c]` = how many units of `c` equal one unit of `baseCurrency`.
 * Formula: amount in `to` = amount in `from` × rates[to] / rates[from]
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  if (!Number.isFinite(amount)) return 0;
  const f = fromCurrency.toUpperCase();
  const t = toCurrency.toUpperCase();
  if (f === t) return amount;
  const rf = rates[f];
  const rt = rates[t];
  if (!(rf > 0) || !(rt > 0)) return amount;
  return (amount * rt) / rf;
}
