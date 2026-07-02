import { AccountSessionProvider } from "@/components/account/account-session-provider";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountSessionProvider>{children}</AccountSessionProvider>;
}
