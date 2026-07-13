import type {
  SeoIntegrationProviderConfig,
  SeoIntegrationProviderId,
  SeoProviderHealth,
} from "@/features/seo/types";

export type SeoSubmitResult = {
  ok: boolean;
  status?: number;
  message: string;
};

export type SeoProviderSubmitInput = {
  url: string;
  siteUrl: string;
};

export type SeoIntegrationHealthOptions = {
  /** When false, Google health uses saved credentials only (no live Google API calls). */
  liveGoogle?: boolean;
};

export type SeoIntegrationProvider = {
  id: SeoIntegrationProviderId;
  label: string;
  isConfigured(config?: SeoIntegrationProviderConfig): boolean;
  health(
    config?: SeoIntegrationProviderConfig,
    options?: SeoIntegrationHealthOptions,
  ): Promise<SeoProviderHealth>;
  submitUrl(config: SeoIntegrationProviderConfig, input: SeoProviderSubmitInput): Promise<SeoSubmitResult>;
  submitSitemap(
    config: SeoIntegrationProviderConfig,
    input: SeoProviderSubmitInput
  ): Promise<SeoSubmitResult>;
};
