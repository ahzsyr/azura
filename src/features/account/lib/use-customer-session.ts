"use client";

import { useSession } from "next-auth/react";
import { isCustomerRole } from "@/features/auth/portal";

export function useCustomerSession() {
  const result = useSession();
  const session = result?.data;
  const status = result?.status ?? "unauthenticated";
  const isCustomer = isCustomerRole(session?.user?.role);
  return {
    session,
    status,
    isCustomer,
    isLoggedIn: isCustomer && status === "authenticated",
    user: isCustomer ? session?.user : null,
  };
}
