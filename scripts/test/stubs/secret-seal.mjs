// Unsealing is a no-op in tests: the stored value is returned as-is.
export function sealSecret(value) {
  const raw = value?.trim();
  return raw ? raw : undefined;
}

export function unsealSecret(value) {
  const raw = value?.trim();
  return raw ? raw : undefined;
}
