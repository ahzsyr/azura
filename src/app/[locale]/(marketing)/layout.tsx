import "@/styles/routes/marketing.css";
import { SessionImageDebug } from "@/components/debug/session-image-debug";

/** ISR: marketing pages revalidate every 5 minutes */
export const revalidate = 300;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionImageDebug />
      {children}
    </>
  );
}
