"use client";

import { type ComponentPropsWithoutRef } from "react";
import { Link } from "@/i18n/navigation";
import { isInternalHref, normalizeInternalNavHref } from "@/lib/navigation/internal-link";

type Props = ComponentPropsWithoutRef<"a"> & {
  href?: string;
};

/**
 * NavLink — renders the next-intl `Link` component for same-origin internal
 * paths (enabling App Router soft navigation + locale prefix handling) and
 * falls back to a plain `<a>` element for:
 *  - hash-only hrefs  (`#section`)
 *  - `mailto:` / `tel:` URIs
 *  - absolute external URLs (`http://…`, `https://…`)
 *  - missing / undefined href
 *
 * The href passed to `Link` is always locale-neutral (locale prefix is
 * stripped by `normalizeInternalNavHref`) so next-intl can re-apply the
 * correct prefix for the active locale.
 *
 * **Preview surface**: click prevention is the caller's responsibility.
 * Pass an `onClick` handler that calls `e.preventDefault()` when needed.
 */
export function NavLink({ href = "#", ...props }: Props) {
  if (isInternalHref(href)) {
    const neutralHref = normalizeInternalNavHref(href);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Link href={neutralHref as any} {...(props as object)} />;
  }

  return <a href={href} {...props} />;
}
