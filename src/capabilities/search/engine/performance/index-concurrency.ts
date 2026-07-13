/** Run async tasks with limited parallelism (index rebuilds). */
export async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  if (!items.length) return;
  const limit = Math.max(1, concurrency);
  let index = 0;

  async function runNext(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    await worker(items[i]!);
    await runNext();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()));
}
