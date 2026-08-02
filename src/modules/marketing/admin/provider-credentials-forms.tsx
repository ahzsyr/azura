import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertProviderAppConfigAction } from "@/modules/marketing/actions";
import type { PublicMarketingProviderAppConfig } from "@/modules/marketing/providers/app-config";

function SecretHint({ saved }: { saved: boolean }) {
  return (
    <p className="text-xs text-muted-foreground">
      {saved
        ? "A value is saved. Leave blank to keep the current secret."
        : "Not set yet. Enter a value and save."}
    </p>
  );
}

export function MarketingProviderCredentialsForms({
  configs,
}: {
  configs: PublicMarketingProviderAppConfig[];
}) {
  const meta = configs.find((c) => c.providerId === "meta");
  const linkedin = configs.find((c) => c.providerId === "linkedin");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Meta app credentials</CardTitle>
          <CardDescription>
            Configure Facebook/Instagram app settings here. Secrets are encrypted at rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertProviderAppConfigAction} className="space-y-3">
            <input type="hidden" name="providerId" value="meta" />
            <div className="space-y-1">
              <Label htmlFor="meta-client-id">Client ID (App ID)</Label>
              <Input
                id="meta-client-id"
                name="clientId"
                defaultValue={meta?.clientId ?? ""}
                placeholder="Meta App ID"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta-client-secret">Client secret</Label>
              <Input
                id="meta-client-secret"
                name="clientSecret"
                type="password"
                placeholder={meta?.hasClientSecret ? "••••••••" : "Meta app client secret"}
                autoComplete="new-password"
              />
              <SecretHint saved={Boolean(meta?.hasClientSecret)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta-app-secret">App secret</Label>
              <Input
                id="meta-app-secret"
                name="appSecret"
                type="password"
                placeholder={meta?.hasAppSecret ? "••••••••" : "Used for webhook signature verification"}
                autoComplete="new-password"
              />
              <SecretHint saved={Boolean(meta?.hasAppSecret)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta-webhook-token">Webhook verify token</Label>
              <Input
                id="meta-webhook-token"
                name="webhookVerifyToken"
                type="password"
                placeholder={meta?.hasWebhookVerifyToken ? "••••••••" : "Custom verify token for Meta callbacks"}
                autoComplete="new-password"
              />
              <SecretHint saved={Boolean(meta?.hasWebhookVerifyToken)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta-pixel-id">Pixel ID</Label>
              <Input
                id="meta-pixel-id"
                name="pixelId"
                defaultValue={meta?.pixelId ?? ""}
                placeholder="Meta Pixel ID"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="meta-capi-token">Conversions API access token</Label>
              <Input
                id="meta-capi-token"
                name="capiAccessToken"
                type="password"
                placeholder={meta?.hasCapiAccessToken ? "••••••••" : "CAPI access token"}
                autoComplete="new-password"
              />
              <SecretHint saved={Boolean(meta?.hasCapiAccessToken)} />
            </div>
            <Button type="submit">Save Meta credentials</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LinkedIn app credentials</CardTitle>
          <CardDescription>
            Configure LinkedIn OAuth app credentials. Secrets are encrypted at rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertProviderAppConfigAction} className="space-y-3">
            <input type="hidden" name="providerId" value="linkedin" />
            <div className="space-y-1">
              <Label htmlFor="li-client-id">Client ID</Label>
              <Input
                id="li-client-id"
                name="clientId"
                defaultValue={linkedin?.clientId ?? ""}
                placeholder="LinkedIn Client ID"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="li-client-secret">Client secret</Label>
              <Input
                id="li-client-secret"
                name="clientSecret"
                type="password"
                placeholder={linkedin?.hasClientSecret ? "••••••••" : "LinkedIn client secret"}
                autoComplete="new-password"
              />
              <SecretHint saved={Boolean(linkedin?.hasClientSecret)} />
            </div>
            <Button type="submit">Save LinkedIn credentials</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
