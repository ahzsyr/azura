"use client";

import { useSession } from "next-auth/react";

export function useCustomerSession() {
  const result = useSession();
  const session = result?.data;
  const status = result?.status ?? "unauthenticated";
  const isCustomer = session?.user?.role === "CUSTOMER";
  return {
    session,
    status,
    isCustomer,
    isLoggedIn: isCustomer && status === "authenticated",
    user: isCustomer ? session?.user : null,
  };
}
