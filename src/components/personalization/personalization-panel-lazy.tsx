"use client";

import dynamic from "next/dynamic";
import type { PersonalizationSettings } from "@/features/personalization/personalization.service";
import type { ThemeTokens } from "@/types/theme";

const PersonalizationPanel = dynamic(
  () =>
    import("./personalization-panel").then((m) => m.PersonalizationPanel),
  { ssr: false },
);

type LocaleOption = {
  code: string;
  urlPrefix: string;
  label: string;
  flag?: string;
  isEnabled: boolean;
};

type Props = {
  settings: PersonalizationSettings;
  theme: ThemeTokens | null;
  locale: string;
  locales: LocaleOption[];
};

export function PersonalizationPanelLazy(props: Props) {
  if (!props.settings.enabled) return null;
  return <PersonalizationPanel {...props} />;
}
