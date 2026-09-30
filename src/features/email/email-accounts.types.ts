export type EmailAccountProvider = "resend" | "smtp";

/** Stored shape (secrets sealed). */
export type EmailAccountRecord = {
  id: string;
  name: string;
  provider: EmailAccountProvider;
  from: string;
  resendApiKeySealed?: string;
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
  provider: EmailAccountProvider;
  from: string;
  hasResendApiKey: boolean;
  smtpHost?: string;
  smtpPort?: number;
  hasSmtpUser: boolean;
  hasSmtpPass: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Resolved credentials for sending (in-memory only). */
export type EmailProviderConfig = {
  provider: EmailAccountProvider;
  from: string;
  resendApiKey?: string;
  smtp?: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
  };
};

export type UpsertEmailAccountInput = {
  id?: string;
  name: string;
  provider: EmailAccountProvider;
  from: string;
  /** Blank on edit = keep existing sealed value. */
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
};
