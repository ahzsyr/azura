/** Supported send provider. */
export type EmailAccountProvider = "resend";

/**
 * Provider value as stored in the JSON store.
 * Legacy `"smtp"` records may still exist but are no longer sendable.
 */
export type StoredEmailAccountProvider = EmailAccountProvider | "smtp";

/** Stored shape (secrets sealed). */
export type EmailAccountRecord = {
  id: string;
  name: string;
  provider: StoredEmailAccountProvider;
  from: string;
  resendApiKeySealed?: string;
  /** @deprecated Legacy SMTP fields — ignored for sending. */
  smtp?: {
    host: string;
    port: number;
    userSealed?: string;
    passSealed?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type EmailAccountsStore = {
  accounts: EmailAccountRecord[];
};

/** Redacted DTO for admin UI — never includes raw secrets. */
export type EmailAccountPublic = {
  id: string;
  name: string;
  provider: StoredEmailAccountProvider;
  from: string;
  hasResendApiKey: boolean;
  /** True when this is a legacy SMTP account that must be recreated with Resend. */
  isLegacySmtp: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Resolved credentials for sending (in-memory only). */
export type EmailProviderConfig = {
  provider: EmailAccountProvider;
  from: string;
  resendApiKey: string;
};

export type UpsertEmailAccountInput = {
  id?: string;
  name: string;
  provider: EmailAccountProvider;
  from: string;
  /** Blank on edit = keep existing sealed value. */
  resendApiKey?: string;
};
