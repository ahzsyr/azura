"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  syncAdAccountAction,
  syncGoogleAdsAccountsAction,
  linkExternalCampaignAction,
  unlinkCampaignBindingAction,
} from "@/modules/marketing/actions";

type ExternalCampaign = {
  id: string;
  externalId: string;
  name: string;
  status: string;
  providerBindingId: string | null;
  providerBinding: {
    id: string;
    campaignId: string;
    campaign: { id: string; name: string };
  } | null;
};

type Account = {
  id: string;
  displayName: string;
  externalAccountId: string;
  accountType: string;
  currency: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  lastSyncAt: Date | null;
  connection: { id: string; providerId: string; status: string };
  externalCampaigns?: ExternalCampaign[];
};

function SyncGoogleAdsButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Syncing…" : "Sync Google Ads accounts"}
    </Button>
  );
}

export function MarketingAdAccountsPanel({
  accounts,
  internalCampaigns = [],
  googleAdsOauthConnected = false,
  configuredCustomerId = null,
  syncMessage = null,
  syncError = null,
}: {
  accounts: Account[];
  internalCampaigns?: Array<{ id: string; name: string; internalId: string }>;
  googleAdsOauthConnected?: boolean;
  configuredCustomerId?: string | null;
  syncMessage?: string | null;
  syncError?: string | null;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Ad Accounts"
        description="Connected advertising accounts with sync status, Google campaign inventory, and link to internal campaigns."
      />
      <p className="text-sm text-muted-foreground">
        Connecting an Ads account does not auto-link campaigns — linking is a separate step.{" "}
        <a
          href="/admin/help#topic-marketing-ad-accounts"
          className="font-medium text-foreground underline underline-offset-2"
        >
          How Google Ads accounts and campaigns work
        </a>
      </p>
      {syncMessage ? (
        <p
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100"
          role="status"
        >
          {syncMessage}
        </p>
      ) : null}
      {syncError ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {syncError}
        </p>
      ) : null}
      <div className="grid gap-4">
        {accounts.length === 0 ? (
          <div className="space-y-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm">
            <p className="text-muted-foreground">
              No ad accounts yet.{" "}
              {configuredCustomerId ? (
                <>
                  SEO has customer {configuredCustomerId} configured — sync to import customers from
                  your Google Ads connection.
                </>
              ) : (
                <>Configure Google Ads under SEO → Google → Ads, then sync inventory here.</>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {googleAdsOauthConnected ? (
                <form action={syncGoogleAdsAccountsAction}>
                  <SyncGoogleAdsButton />
                </form>
              ) : (
                <Button asChild size="sm">
                  <Link href="/admin/seo/google?tab=ads">Connect in SEO → Google → Ads</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/seo/google?tab=ads">Open SEO Google Ads</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {googleAdsOauthConnected ? (
              <form action={syncGoogleAdsAccountsAction} className="flex flex-wrap gap-2">
                <SyncGoogleAdsButton />
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/seo/google?tab=ads">Open SEO Google Ads</Link>
                </Button>
              </form>
            ) : null}
            {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {account.displayName}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({account.connection.providerId} · {account.accountType})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-4">
                  <div>ID: {account.externalAccountId}</div>
                  <div>Currency: {account.currency ?? "—"}</div>
                  <div>Status: {account.connection.status}</div>
                  <div>
                    Last sync:{" "}
                    {account.lastSyncAt ? account.lastSyncAt.toISOString().slice(0, 16) : "—"}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-4 text-muted-foreground">
                  <div>Spend: {account.spend.toFixed(2)}</div>
                  <div>Impressions: {account.impressions}</div>
                  <div>Clicks: {account.clicks}</div>
                  <div>Conversions: {account.conversions}</div>
                </div>
                <form action={syncAdAccountAction} className="flex gap-2">
                  <input type="hidden" name="connectionId" value={account.connection.id} />
                  <input type="hidden" name="providerId" value={account.connection.providerId} />
                  <input type="hidden" name="adAccountId" value={account.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Sync campaigns
                  </Button>
                </form>

                {account.connection.providerId === "google-ads" ? (
                  <div className="space-y-2 border-t pt-3">
                    <p className="font-medium">Google campaigns</p>
                    {(account.externalCampaigns ?? []).length === 0 ? (
                      <p className="text-muted-foreground">
                        No campaigns synced yet. Click Sync campaigns.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {(account.externalCampaigns ?? []).map((ext) => (
                          <li
                            key={ext.id}
                            className="flex flex-wrap items-start justify-between gap-2 rounded border px-2 py-1.5"
                          >
                            <div>
                              <div className="font-medium">{ext.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {ext.status} · {ext.externalId}
                              </div>
                              {ext.providerBinding ? (
                                <div className="text-xs text-emerald-700 dark:text-emerald-300">
                                  Linked: {ext.providerBinding.campaign.name}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">Not linked</div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {ext.providerBinding ? (
                                <>
                                  <Button asChild size="sm" variant="outline">
                                    <Link
                                      href={`/admin/marketing/campaigns/${ext.providerBinding.campaignId}`}
                                    >
                                      View campaign
                                    </Link>
                                  </Button>
                                  <form action={unlinkCampaignBindingAction}>
                                    <input
                                      type="hidden"
                                      name="bindingId"
                                      value={ext.providerBinding.id}
                                    />
                                    <input
                                      type="hidden"
                                      name="campaignId"
                                      value={ext.providerBinding.campaignId}
                                    />
                                    <Button type="submit" size="sm" variant="ghost">
                                      Unlink
                                    </Button>
                                  </form>
                                </>
                              ) : (
                                <form
                                  action={linkExternalCampaignAction}
                                  className="flex flex-wrap items-center gap-2"
                                >
                                  <input type="hidden" name="adAccountId" value={account.id} />
                                  <input
                                    type="hidden"
                                    name="externalCampaignId"
                                    value={ext.externalId}
                                  />
                                  <input type="hidden" name="providerId" value="google-ads" />
                                  <input type="hidden" name="externalCampaignName" value={ext.name} />
                                  <select
                                    name="campaignId"
                                    required
                                    className="h-8 rounded-md border bg-background px-2 text-xs"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>
                                      Link to internal campaign…
                                    </option>
                                    {internalCampaigns.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name} ({c.internalId})
                                      </option>
                                    ))}
                                  </select>
                                  <Button type="submit" size="sm">
                                    Link
                                  </Button>
                                </form>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
          </>
        )}
      </div>
    </div>
  );
}
