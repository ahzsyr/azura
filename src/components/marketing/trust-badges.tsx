"use client";

import { Shield, Award, Headphones, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { AnimatedSection } from "@/components/motion/lazy-motion";

const icons = [Shield, Award, Headphones, Clock];
const keys = ["registered", "licensed", "support", "experience"] as const;

export function TrustBadges() {
  const t = useTranslations("trust");

  return (
    <AnimatedSection>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {keys.map((key, i) => {
          const Icon = icons[i];
          return (
            <div
              key={key}
              className="flex flex-col items-center rounded-xl border border-border/60 bg-card p-6 text-center shadow-sm"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">{t(key)}</span>
            </div>
          );
        })}
      </div>
    </AnimatedSection>
  );
}

export function TrustStatement({
  registrationNo,
}: {
  registrationNo?: string;
  locale?: string;
}) {
  const t = useTranslations("trust");

  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="font-heading text-2xl font-semibold md:text-3xl">{t("title")}</h2>
      <div className="gold-divider mx-auto my-4" />
      <p className="text-muted-foreground">{t("subtitle")}</p>
      {registrationNo && (
        <p className="mt-4 text-sm font-medium text-primary">
          {t("registrationNo")}: {registrationNo}
        </p>
      )}
    </div>
  );
}
