/**
 * Per-process, in-memory JSON store for tests. Settings saved by one call are
 * visible to the next, exactly like the real store — but nothing persists.
 */
const store = new Map();

const keyOf = (namespace, key) => `${namespace}:${key}`;

export const jsonStoreService = {
  async get(namespace, key) {
    return store.has(keyOf(namespace, key)) ? store.get(keyOf(namespace, key)) : null;
  },
  getCached(namespace, key) {
    return this.get(namespace, key);
  },
  async set(namespace, key, data) {
    store.set(keyOf(namespace, key), structuredClone(data));
    return data;
  },
  async delete(namespace, key) {
    store.delete(keyOf(namespace, key));
  },
};

/** Reset saved settings between tests. */
export function __resetJsonStore() {
  store.clear();
}
