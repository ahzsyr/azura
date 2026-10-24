export type FunnelEvent = {
  name: string;
  path: string | null;
  at: string;
};

export type FunnelStage = {
  id: string;
  label: string;
  reached: boolean;
  at: string | null;
  detail: string | null;
};

const FUNNEL_STAGES: { id: string; label: string; names: readonly string[] }[] = [
  { id: "first_seen", label: "First seen", names: [] },
  { id: "landing", label: "Landing page", names: ["LandingPageView", "PageView"] },
  { id: "product", label: "Product view", names: ["ProductViewed", "SolutionView"] },
  {
    id: "cta",
    label: "CTA or form",
    names: [
      "CtaClick",
      "PhoneClick",
      "WhatsAppClick",
      "EmailClick",
      "FormSubmitted",
      "RfqSubmitted",
      "QuoteRequest",
      "LeadGenerated",
    ],
  },
  { id: "registration", label: "Account registration", names: ["AccountRegistration"] },
  { id: "login", label: "Login", names: ["Login"] },
];

export function buildUserFunnel(input: {
  firstSeenAt: string | null;
  events: readonly FunnelEvent[];
}): FunnelStage[] {
  const sorted = [...input.events].sort((a, b) => a.at.localeCompare(b.at));
  return FUNNEL_STAGES.map((stage) => {
    if (stage.id === "first_seen") {
      const at = input.firstSeenAt ?? sorted[0]?.at ?? null;
      return {
        id: stage.id,
        label: stage.label,
        reached: Boolean(at),
        at,
        detail: null,
      };
    }
    const hit = sorted.find((event) => stage.names.includes(event.name));
    return {
      id: stage.id,
      label: stage.label,
      reached: Boolean(hit),
      at: hit?.at ?? null,
      detail: hit?.path ?? null,
    };
  });
}
