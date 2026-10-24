/** Built-in transports. Add providers here as their send adapters are implemented. */
export type EmailAccountProvider = "resend" | "smtp";

/** Provider values that may occur in previously stored account data. */
export type StoredEmailAccountProvider = EmailAccountProvider | (string & {});

/** Stored shape (secrets sealed). */
export type EmailAccountRecord = {
  id: string;
  name: string;
  provider: StoredEmailAccountProvider;
  from: string;
  resendApiKeySealed?: string;
  smtp?: {
    host: string;
    port: number;
    secure?: boolean;
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
  hasSmtpCredentials: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  createdAt: string;
  updatedAt: string;
};

/** Resolved credentials for sending (in-memory only). */
export type EmailProviderConfig =
  | { provider: "resend"; from: string; resendApiKey: string }
  | {
      provider: "smtp";
      from: string;
      smtp: { host: string; port: number; secure: boolean; user?: string; pass?: string };
    };

export type UpsertEmailAccountInput = {
  id?: string;
  name: string;
  provider: EmailAccountProvider;
  from: string;
  /** Blank on edit = keep existing sealed value. */
  resendApiKey?: string;
  smtp?: { host: string; port: number; secure: boolean; user?: string; pass?: string };
};
