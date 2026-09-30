export type ProviderHealthCheckId =
  | "connected"
  | "tokenValid"
  | "apiReachable"
  | "rateLimited"
  | "permissionsOk"
  | "webhookOk"
  | "pixelVerified";

export type ProviderHealthCheck = {
  id: ProviderHealthCheckId;
  ok: boolean;
  message?: string;
  checkedAt: string;
};

export type ProviderHealthReport = {
  providerId: string;
  connectionId?: string;
  ok: boolean;
  checks: ProviderHealthCheck[];
  summary: string;
};
