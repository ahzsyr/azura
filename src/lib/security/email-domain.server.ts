import "server-only";

import { promises as nodeDns } from "node:dns";
import {
  EmailDomainError,
  verifyEmailDomain as verifyWithLookup,
  type EmailDnsLookup,
} from "@/lib/security/email-domain";

export { EmailDomainError, isBlockedEmailDomain } from "@/lib/security/email-domain";

const defaultLookup: EmailDnsLookup = {
  resolveMx: (domain) => nodeDns.resolveMx(domain),
  resolve4: (domain) => nodeDns.resolve4(domain),
  resolve6: (domain) => nodeDns.resolve6(domain),
};

const testLookup: EmailDnsLookup = {
  async resolveMx() {
    return [{ exchange: "mx.test" }];
  },
  async resolve4() {
    return ["192.0.2.1"];
  },
  async resolve6() {
    return [];
  },
};

/** DNS check for addresses that are being saved. Tests skip the network. */
export async function verifyEmailDomain(email: string) {
  const lookup = process.env.NODE_ENV === "test" ? testLookup : defaultLookup;
  return verifyWithLookup(email, lookup);
}

export async function assertDeliverableEmail(email: string): Promise<void> {
  const result = await verifyEmailDomain(email);
  if (!result.ok) throw new EmailDomainError(result.message);
}
