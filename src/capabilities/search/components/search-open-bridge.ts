/** One-shot flag: header opened search before SearchCommand finished mounting. */
let openPending = false;

export function markSearchOpenPending(): void {
  openPending = true;
}

export function consumeSearchOpenPending(): boolean {
  const pending = openPending;
  openPending = false;
  return pending;
}
