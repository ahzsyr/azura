/**
 * zod v4 migration helper for object schemas used as nested defaults.
 *
 * In zod v3, `objectSchema.default({})` re-applied the inner defaults to that
 * `{}`. In zod v4 the literal `{}` is used as-is, so `.default()` and
 * `z.preprocess` fields silently vanish from parsed output. `withObjectDefaults`
 * restores the v3 behaviour without loosening validation:
 *
 *   - a missing value parses as `{}` filled with the inner defaults,
 *   - a partial object (`{ e: 7 }`) validates and gains the remaining defaults,
 *   - invalid values (e.g. `e: 0` under `.min(1)`) are still rejected,
 *   - re-parsing the wrapper's own output is a no-op,
 *   - the output type stays `z.output<S>`.
 *
 * Usage: replace `someObjectSchema.default({})` with
 * `withObjectDefaults(someObjectSchema)`, in the same key position.
 *
 * The `{}` default is part of the returned schema. Do not append another
 * `.default(...)`: zod only keeps the outermost default, so a second `.default`
 * would replace the helper's own default and reintroduce the `{}` bug.
 */
import { z } from "zod";

type Obj = Record<string, unknown>;

function isPlainObject(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Copy `value`, adding the defaulted keys it is missing. */
function fillMissing(defaults: Obj, value: unknown): unknown {
  if (!isPlainObject(value)) return value;
  const merged: Obj = { ...value };
  for (const [key, fallback] of Object.entries(defaults)) {
    if (!Object.hasOwn(value, key)) merged[key] = fallback;
  }
  return merged;
}

/**
 * Result type: parses like the plain object (`z.output<S>`) but no longer
 * accepts `undefined`. Declared explicitly because zod's `NoUndefined`
 * constraint cannot be proven for a generic `S`.
 */
type WithObjectDefaults<S extends z.ZodObject> = z.ZodDefault<
  z.ZodPreprocess<S, unknown>
> & {
  parse: (input?: unknown) => z.output<S>;
};

export function withObjectDefaults<S extends z.ZodObject>(schema: S) {
  // Schemas that cannot parse `{}` (required fields, no defaults) have nothing
  // to restore: identity.
  const probe = schema.safeParse({});
  if (!probe.success) return schema;
  const defaults = probe.data as Obj;

  // Fill partial objects with the missing defaulted keys, then validate.
  const withFilledDefaults = z.preprocess(
    (value) => fillMissing(defaults, value),
    schema,
  );

  // `undefined` -> a fully-defaulted object, produced through
  // `schema.parse({})` so partially-defaulted values (e.g. `{ bodyFont: "X" }`
  // that already went through the schema once) re-gain the remaining defaults.
  //
  // Must be a function: a non-function default is returned as the literal,
  // unevaluated value, so a schema instance would leak out as our output.
  // The factory's return type is what zod constrains to `NoUndefined`, which is
  // exactly why `WithObjectDefaults` declares its own `parse` signature.
  const fillDefault = (() => schema.parse({})) as unknown as () => never;
  const withDefault: WithObjectDefaults<S> = withFilledDefaults.default(
    fillDefault,
  ) as unknown as WithObjectDefaults<S>;

  return withDefault;
}
