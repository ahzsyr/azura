import type { ReactNode } from "react";
import { KeyRound, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { upsertProviderAppConfigAction } from "@/modules/marketing/actions";
import type { PublicMarketingProviderAppConfig } from "@/modules/marketing/providers/app-config";

function RequirementBadge({ kind }: { kind: "required" | "optional" }) {
  if (kind === "optional") {
    return (
      <span className="shrink-0 rounded-full border border-border/70 bg-muted/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Optional
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
      Required
    </span>
  );
}

function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor={htmlFor} className="inline-flex items-center gap-1">
        {children}
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {optional ? <RequirementBadge kind="optional" /> : null}
    </div>
  );
}

function SecretHint({ saved }: { saved: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span
        className={cn(
          "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          saved
            ? "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300"
            : "bg-muted text-muted-foreground",
        )}
      >
        {saved ? "Saved" : "Not set"}
      </span>
      {saved ? "Leave blank to keep the current secret." : "Enter a value and save."}
    </p>
  );
}

function FieldGroup({
  title,
  description,
  requirement,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  requirement: "required" | "optional";
  icon?: typeof KeyRound;
  children: ReactNode;
}) {
  const required = requirement === "required";
  return (
    <section
      className={cn(
        "space-y-4 rounded-xl border p-4 sm:p-5",
        required
          ? "border-border/70 bg-background shadow-sm"
          : "border-dashed border-border/60 bg-muted/15",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon ? (
            <span
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                required
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
              aria-hidden
            >
              <Icon className="size-4" />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <RequirementBadge kind={requirement} />
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function MetaCredentialsForm({ config }: { config?: PublicMarketingProviderAppConfig }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Meta app credentials</CardTitle>
        <CardDescription>
          Facebook and Instagram app settings. Required fields enable Connect. Pixel credentials are
          optional. Secrets are encrypted at rest.
        </CardDescription>
      </CardHeader>
      <form action={upsertProviderAppConfigAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="providerId" value="meta" />
          <FieldGroup
            title="OAuth app"
            description="Used to connect Pages and Instagram accounts."
            requirement="required"
            icon={KeyRound}
          >
            <div className="space-y-1.5">
              <FieldLabel htmlFor="meta-client-id" required>
                Client ID (App ID)
              </FieldLabel>
              <Input
                id="meta-client-id"
                name="clientId"
                defaultValue={config?.clientId ?? ""}
                placeholder="Meta App ID"
                autoComplete="off"
                aria-required="true"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="meta-client-secret" required>
                  Client secret
                </FieldLabel>
                <Input
                  id="meta-client-secret"
                  name="clientSecret"
                  type="password"
                  placeholder={config?.hasClientSecret ? "••••••••" : "Meta app client secret"}
                  autoComplete="new-password"
                  aria-required="true"
                />
                <SecretHint saved={Boolean(config?.hasClientSecret)} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="meta-app-secret" required>
                  App secret
                </FieldLabel>
                <Input
                  id="meta-app-secret"
                  name="appSecret"
                  type="password"
                  placeholder={
                    config?.hasAppSecret ? "••••••••" : "Used for webhook signature verification"
                  }
                  autoComplete="new-password"
                  aria-required="true"
                />
                <SecretHint saved={Boolean(config?.hasAppSecret)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="meta-webhook-token" required>
                Webhook verify token
              </FieldLabel>
              <Input
                id="meta-webhook-token"
                name="webhookVerifyToken"
                type="password"
                placeholder={
                  config?.hasWebhookVerifyToken
                    ? "••••••••"
                    : "Custom verify token for Meta callbacks"
                }
                autoComplete="new-password"
                aria-required="true"
              />
              <SecretHint saved={Boolean(config?.hasWebhookVerifyToken)} />
            </div>
          </FieldGroup>
          <FieldGroup
            title="Pixel & Conversions API"
            description="Optional tracking credentials for ads measurement."
            requirement="optional"
            icon={Megaphone}
          >
            <div className="space-y-1.5">
              <FieldLabel htmlFor="meta-pixel-id" optional>
                Pixel ID
              </FieldLabel>
              <Input
                id="meta-pixel-id"
                name="pixelId"
                defaultValue={config?.pixelId ?? ""}
                placeholder="Meta Pixel ID"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="meta-capi-token" optional>
                Conversions API access token
              </FieldLabel>
              <Input
                id="meta-capi-token"
                name="capiAccessToken"
                type="password"
                placeholder={config?.hasCapiAccessToken ? "••••••••" : "CAPI access token"}
                autoComplete="new-password"
              />
              <SecretHint saved={Boolean(config?.hasCapiAccessToken)} />
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="border-t border-border/60 bg-muted/10 px-6 py-4">
          <Button type="submit">Save Meta credentials</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function LinkedInCredentialsForm({ config }: { config?: PublicMarketingProviderAppConfig }) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">LinkedIn app credentials</CardTitle>
        <CardDescription>
          OAuth app credentials for Company Pages. Required to connect. Secrets are encrypted at rest.
        </CardDescription>
      </CardHeader>
      <form action={upsertProviderAppConfigAction}>
        <CardContent>
          <input type="hidden" name="providerId" value="linkedin" />
          <FieldGroup
            title="OAuth app"
            description="Used to connect LinkedIn organization pages."
            requirement="required"
            icon={KeyRound}
          >
            <div className="space-y-1.5">
              <FieldLabel htmlFor="li-client-id" required>
                Client ID
              </FieldLabel>
              <Input
                id="li-client-id"
                name="clientId"
                defaultValue={config?.clientId ?? ""}
                placeholder="LinkedIn Client ID"
                autoComplete="off"
                aria-required="true"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="li-client-secret" required>
                Client secret
              </FieldLabel>
              <Input
                id="li-client-secret"
                name="clientSecret"
                type="password"
                placeholder={config?.hasClientSecret ? "••••••••" : "LinkedIn client secret"}
                autoComplete="new-password"
                aria-required="true"
              />
              <SecretHint saved={Boolean(config?.hasClientSecret)} />
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="border-t border-border/60 bg-muted/10 px-6 py-4">
          <Button type="submit">Save LinkedIn credentials</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function MarketingProviderCredentialsForms({
  configs,
  providerId,
}: {
  configs: PublicMarketingProviderAppConfig[];
  providerId?: string;
}) {
  const meta = configs.find((c) => c.providerId === "meta");
  const linkedin = configs.find((c) => c.providerId === "linkedin");

  if (providerId === "meta") return <MetaCredentialsForm config={meta} />;
  if (providerId === "linkedin") return <LinkedInCredentialsForm config={linkedin} />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MetaCredentialsForm config={meta} />
      <LinkedInCredentialsForm config={linkedin} />
    </div>
  );
}
