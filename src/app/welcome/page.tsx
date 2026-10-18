import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { SITE_PRODUCT_NAME } from "@/config/site";

export const metadata: Metadata = {
  title: "Welcome",
  description: `${SITE_PRODUCT_NAME} — this website is under maintenance while setup is in progress.`,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function WelcomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_55%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.08),transparent_50%)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <div className="mb-8 flex size-16 items-center justify-center rounded-2xl border bg-card/80 shadow-sm backdrop-blur">
          <Construction className="size-8 text-primary" aria-hidden />
        </div>

        <p className="text-primary mb-3 text-sm font-semibold tracking-[0.2em] uppercase">
          {SITE_PRODUCT_NAME}
        </p>

        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Welcome</h1>

        <p className="text-muted-foreground mt-4 max-w-md text-base leading-relaxed">
          Azura is getting this website ready. The site is under maintenance until an
          administrator finishes setup.
        </p>
      </div>
    </div>
  );
}
