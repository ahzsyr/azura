export type GoogleAdsReadiness =
  | "operational"
  | "setup_incomplete"
  | "not_connected";

export type GoogleAdsHealthItem = {
  id:
    | "oauth_token"
    | "developer_token"
    | "login_customer"
    | "ads_account"
    | "campaign_sync"
    | "metrics_sync";
  label: string;
  ok: boolean;
  message: string;
  href: string;
  actionLabel: string;
};

export type GoogleAdsOperationalContext = {
  oauthConnected: boolean;
  operational: boolean;
  readiness: GoogleAdsReadiness;
  hasAccessToken: boolean;
  hasDeveloperToken: boolean;
  hasLoginCustomerId: boolean;
  accountCount: number;
  selectedCustomerId: string | null;
  loginCustomerId: string | null;
  lastVerifiedAt: string | null;
  connectionId: string | null;
  connectionStatus: string | null;
  healthChecks: GoogleAdsHealthItem[];
  legacySeoCustomerIdHint: string | null;
  ok: boolean;
  summary: string;
};
