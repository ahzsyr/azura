"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { upsertTrackingConfigAction } from "@/modules/marketing/actions";
import { MetaPixelInstallStatus } from "@/modules/marketing/admin/meta-pixel-install-status";
import {
  buildMetaPixelBaseCode,
  extractMetaPixelIdFromSnippet,
  normalizeMetaPixelId,
  readMetaPixelHeadSnippet,
} from "@/modules/marketing/tracking/meta-pixel";

type MetaTrackingConfig = {
  enabled: boolean;
  pixelId: string | null;
  capiEnabled: boolean;
  testEventCode: string | null;
  metadata?: unknown;
};

function CopyCodeButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={!text.trim()}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy code"}
    </Button>
  );
}

export function MetaPixelCodeSetup({
  config,
  formId = "marketing-tracking-meta",
  siteUrl,
}: {
  config?: MetaTrackingConfig | null;
  formId?: string;
  siteUrl?: string;
}) {
  const savedSnippet = readMetaPixelHeadSnippet(config?.metadata);
  const initialPixelId = normalizeMetaPixelId(config?.pixelId) ?? "";
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [pixelId, setPixelId] = useState(initialPixelId);
  const [headSnippet, setHeadSnippet] = useState(
    savedSnippet ?? (initialPixelId ? buildMetaPixelBaseCode(initialPixelId) : ""),
  );

  const resolvedPixelId = useMemo(() => {
    return (
      extractMetaPixelIdFromSnippet(headSnippet) ??
      normalizeMetaPixelId(pixelId) ??
      ""
    );
  }, [headSnippet, pixelId]);

  const displaySnippet =
    headSnippet.trim() ||
    (resolvedPixelId ? buildMetaPixelBaseCode(resolvedPixelId) : buildMetaPixelBaseCode("YOUR_PIXEL_ID"));

  const savedPixelId =
    normalizeMetaPixelId(config?.pixelId) ??
    (savedSnippet ? extractMetaPixelIdFromSnippet(savedSnippet) : undefined) ??
    null;
  const savedInstalled = Boolean(config?.enabled && savedPixelId);

  function handlePixelIdChange(value: string) {
    const next = value.replace(/[^\d]/g, "");
    setPixelId(next);
    if (next) {
      setHeadSnippet(buildMetaPixelBaseCode(next));
    }
  }

  function handleSnippetChange(value: string) {
    setHeadSnippet(value);
    const extracted = extractMetaPixelIdFromSnippet(value);
    if (extracted) setPixelId(extracted);
  }

  return (
    <div className="space-y-6">
      <MetaPixelInstallStatus
        installed={savedInstalled}
        pixelId={savedPixelId}
        headSnippet={savedSnippet}
        siteUrl={siteUrl}
      />

      <Card>
        <CardHeader>
          <CardTitle>Meta Pixel + Conversions API</CardTitle>
          <CardDescription>
            Set up by code — paste the Meta Pixel base code from Events Manager. When Pixel is
            enabled and saved, this site injects the base code into the page{" "}
            <code className="text-[11px]">&lt;head&gt;</code> (via Next.js{" "}
            <code className="text-[11px]">beforeInteractive</code>), matching Meta&apos;s
            &quot;Paste base code between &lt;head&gt; tags&quot; step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id={formId}
            data-admin-save-form=""
            action={upsertTrackingConfigAction}
            className="space-y-5"
          >
            <input type="hidden" name="providerId" value="meta" />
            <input type="hidden" name="enabled" value={enabled ? "true" : "false"} />
            <input type="hidden" name="pixelId" value={resolvedPixelId} />
            <input type="hidden" name="headSnippet" value={displaySnippet} />

            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-sm font-medium">Install method: Code</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>In Meta Events Manager, open your Pixel → Set up → Install code manually.</li>
                <li>Copy the Meta Pixel base code, then paste it below (or enter the Pixel ID).</li>
                <li>Enable Pixel and save — we inject the code into the public site &lt;head&gt; for you.</li>
              </ol>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
                Pixel enabled on public site
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="capiEnabled"
                  defaultChecked={config?.capiEnabled ?? false}
                />
                CAPI enabled
              </label>
            </div>

            {enabled && resolvedPixelId ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Base code will be installed in the public site &lt;head&gt; after save
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="meta-pixel-id">Pixel ID</Label>
              <Input
                id="meta-pixel-id"
                value={pixelId}
                onChange={(event) => handlePixelIdChange(event.target.value)}
                placeholder="e.g. 2600xxxxxxxxxxxx"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Optional shortcut — updates the base code below. Or paste Meta&apos;s code and we
                extract the ID.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="meta-pixel-snippet">Meta Pixel base code</Label>
                <CopyCodeButton text={displaySnippet} />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste between the <code className="text-[11px]">&lt;head&gt;</code> tags on external
                sites, or save here to install on this site. Place underneath existing head code,
                above the closing head tag.
              </p>
              <Textarea
                id="meta-pixel-snippet"
                value={headSnippet}
                onChange={(event) => handleSnippetChange(event.target.value)}
                rows={12}
                spellCheck={false}
                className="font-mono text-xs leading-relaxed"
                placeholder={buildMetaPixelBaseCode("YOUR_PIXEL_ID")}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="meta-test-event">Test event code</Label>
                <Input
                  id="meta-test-event"
                  name="testEventCode"
                  defaultValue={config?.testEventCode ?? ""}
                  placeholder="TEST12345"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="meta-capi-token">CAPI access token</Label>
                <Input
                  id="meta-capi-token"
                  name="accessToken"
                  type="password"
                  placeholder="Leave blank to keep existing token"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-fit">
              Save Meta tracking
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
