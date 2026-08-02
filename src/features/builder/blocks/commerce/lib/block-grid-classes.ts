export function gridClassNameForColumns(columns: number): string {
  return columns === 2
    ? "pl-grid pl-grid--block-cols-2"
    : columns === 4
      ? "pl-grid pl-grid--block-cols-4"
      : "pl-grid pl-grid--block-cols-3";
}
