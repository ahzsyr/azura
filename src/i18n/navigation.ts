import { createNavigation } from "next-intl/navigation";
import { sharedRoutingConfig } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(sharedRoutingConfig);
