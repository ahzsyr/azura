import { assessEmailPattern } from "@/lib/security/email-input";

const DOMAIN_MESSAGE = "Use an email address from a real domain";
const UNVERIFIED_MESSAGE = "This email domain could not be verified";
const RETRY_MESSAGE = "Could not verify this email domain. Try again.";

/** Domains that exist only to throw mail away. Subdomains are included. */
const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "grr.la",
  "sharklasers.com",
  "yopmail.com",
  "yopmail.fr",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "trashmail.com",
  "trash-mail.com",
  "dispostable.com",
  "getnada.com",
  "maildrop.cc",
  "mailnesia.com",
  "mohmal.com",
  "emailondeck.com",
  "spam4.me",
  "mintemail.com",
  "mytemp.email",
  "burnermail.io",
  "dropmail.me",
  "inboxkitten.com",
  "moakt.com",
  "fakemailgenerator.com",
  "generator.email",
  "mailcatch.com",
  "throwawaymail.com",
  "pokemail.net",
  "spamgourmet.com",
  "mailnull.com",
  "tempail.com",
  "tmpmail.org",
  "tmpmail.net",
  "discard.email",
  "emailfake.com",
  "fakeinbox.com",
] as const;

const BLOCKED_TLDS = new Set(["test", "invalid", "example", "localhost", "local", "onion"]);

export class EmailDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDomainError";
  }
}

export type EmailDnsLookup = {
  resolveMx(domain: string): Promise<Array<{ exchange: string }>>;
  resolve4(domain: string): Promise<string[]>;
  resolve6(domain: string): Promise<string[]>;
};

function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}

export function isBlockedEmailDomain(domain: string): boolean {
  const host = domain.toLowerCase().replace(/\.$/, "");
  const tld = host.split(".").pop() ?? "";
  if (BLOCKED_TLDS.has(tld)) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  return DISPOSABLE_DOMAINS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

async function withTimeout<T>(work: Promise<T>, ms = 2500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function dnsCode(error: unknown): string {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

async function hostResolves(lookup: EmailDnsLookup, domain: string): Promise<"yes" | "no" | "retry"> {
  try {
    const mx = await withTimeout(lookup.resolveMx(domain));
    if (mx.some((row) => row.exchange && row.exchange !== ".")) return "yes";
  } catch (error) {
    const code = dnsCode(error);
    if (code === "ETIMEOUT" || code === "ESERVFAIL" || code === "ETIME" || code === "EAI_AGAIN") return "retry";
    if (code !== "ENOTFOUND" && code !== "ENODATA" && code !== "ENOENT") return "retry";
  }
  try {
    const v4 = await withTimeout(lookup.resolve4(domain));
    if (v4.length > 0) return "yes";
  } catch (error) {
    const code = dnsCode(error);
    if (code === "ETIMEOUT" || code === "ESERVFAIL" || code === "EAI_AGAIN") return "retry";
  }
  try {
    const v6 = await withTimeout(lookup.resolve6(domain));
    if (v6.length > 0) return "yes";
  } catch (error) {
    const code = dnsCode(error);
    if (code === "ETIMEOUT" || code === "ESERVFAIL" || code === "EAI_AGAIN") return "retry";
  }
  return "no";
}

export async function verifyEmailDomain(
  email: string,
  lookup: EmailDnsLookup,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const pattern = assessEmailPattern(email);
  if (!pattern.ok) return { ok: false, message: pattern.message ?? "Enter a valid email address" };
  const domain = domainOf(pattern.normalized);
  if (isBlockedEmailDomain(domain)) return { ok: false, message: DOMAIN_MESSAGE };

  const resolved = await hostResolves(lookup, domain);
  if (resolved === "yes") return { ok: true };
  if (resolved === "retry") return { ok: false, message: RETRY_MESSAGE };
  return { ok: false, message: UNVERIFIED_MESSAGE };
}
