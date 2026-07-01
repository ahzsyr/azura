export type SeoQualitySeverity = "critical" | "warn" | "info";

export type SeoQualityIssue = {
  id: string;
  title: string;
  severity: SeoQualitySeverity;
  message: string;
  source?: string;
  href?: string;
};

export type SeoQualityReport = {
  generatedAt: Date;
  issues: SeoQualityIssue[];
  health?: {
    score: number;
    generatedAt: Date;
    components: Array<{
      id: string;
      label: string;
      status: "pass" | "warn" | "fail";
      penalty: number;
      message: string;
    }>;
    previousScore?: number;
    delta?: number;
  };
};
