import { notFound } from "next/navigation";
import { isAdminPathDisabled } from "./load-profile";

/** Defense-in-depth guard for admin pages tied to disabled profile surfaces. */
export function assertAdminRouteEnabled(adminPathPrefix: string): void {
  if (isAdminPathDisabled(adminPathPrefix)) {
    notFound();
  }
}
