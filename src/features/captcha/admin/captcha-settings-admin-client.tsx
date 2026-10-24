"use client";

import { useCallback, useState } from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageHeader } from "@/components/admin/layout/admin-shell";
import { SettingsSection, ToggleField } from "@/components/admin/settings-fields";
import {
  saveCaptchaSettingsAction,
  verifyCaptchaKeysAction,
} from "@/features/captcha/captcha.actions";
import {
  CAPTCHA_SCOPES,
  CAPTCHA_SCOPE_LABELS,
  type CaptchaOverride,
  type CaptchaSettingsPublic,
} from "@/features/captcha/captcha.schema";

const OVERRIDE_OPTIONS: Array<{ value: CaptchaOverride; label: string }> = [
  { value: "inherit", label: "Use global default" },
  { value: "on", label: "Always require" },
  { value: "off", label: "Never require" },
];

export function CaptchaSettingsAdminClient({
  initial,
  canManage = true,
}: {
  initial: CaptchaSettingsPublic;
  canManage?: boolean;
}) {
  const [settings, setSettings] = useState(initial);
  const [secretKey, setSecretKey] = useState("");
  const [clearSecret, setClearSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [keyCheck, setKeyCheck] = useState<{ ok: boolean; message: string } | null>(null);

  const patch = useCallback(
    (next: Partial<CaptchaSettingsPublic>) => {
      setMessage(null);
      setSettings((s) => ({ ...s, ...next }));
    },
    [],
  );

  const patchScope = useCallback((scope: keyof CaptchaSettingsPublic["scopes"], value: CaptchaOverride) => {
    setMessage(null);
    setSettings((s) => ({ ...s, scopes: { ...s.scopes, [scope]: value } }));
  }, []);

  const save = async () => {
    if (!canManage) {
      setMessage({ ok: false, text: "Only the Master Admin can change captcha settings." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await saveCaptchaSettingsAction({
      enabled: settings.enabled,
      siteKey: settings.siteKey,
      ...(secretKey.trim() ? { secretKey: secretKey.trim() } : {}),
      clearSecretKey: clearSecret,
      scopes: settings.scopes,
    });
    setBusy(false);
    if (!res.success) {
      setMessage({ ok: false, text: res.error });
      return;
    }
    setSettings(res.data);
    setSecretKey("");
    setClearSecret(false);
    setMessage({ ok: true, text: "Captcha settings saved." });
  };

  const checkKeys = async () => {
    setBusy(true);
    setKeyCheck(null);
    const res = await verifyCaptchaKeysAction();
    setBusy(false);
    if (!res.success) {
      setKeyCheck({ ok: false, message: res.error });
      return;
    }
    setKeyCheck(res.data);
  };

  const configured = settings.configured;
  const enforced = settings.enabled && configured;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Captcha"
        description="Bot protection for public forms and account pages. Cloudflare Turnstile."
      />

      {message ? (
        <p
          className={
            message.ok
              ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Status</CardTitle>
          <CardDescription>What visitors will actually see right now.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 pt-0">
          <Badge variant={settings.enabled ? "default" : "secondary"}>
            Master switch {settings.enabled ? "on" : "off"}
          </Badge>
          <Badge variant={configured ? "default" : "secondary"}>
            {configured ? "Keys configured" : "Keys missing"}
          </Badge>
          <Badge variant={enforced ? "default" : "secondary"}>
            {enforced ? "Captcha enforced" : "Captcha not enforced"}
          </Badge>
          {!configured && settings.enabled ? (
            <span className="text-xs text-destructive">
              Enabled but unusable — visitors will not be blocked until both keys are set.
            </span>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <SettingsSection
            title="Master switch"
            description="Turning this off ignores every per-form and per-page setting below."
          >
            <ToggleField
              label="Enable captcha"
              description="Only takes effect once both keys are saved."
              checked={settings.enabled}
              onChange={(enabled) => patch({ enabled })}
              disabled={!canManage}
            />
          </SettingsSection>

          <SettingsSection
            title="Cloudflare Turnstile keys"
            description="Create a widget at Cloudflare, then paste both keys. The secret is encrypted at rest and never shown again."
          >
            <div className="space-y-1.5">
              <Label htmlFor="captcha-site-key">Site key</Label>
              <p className="text-xs text-muted-foreground">Public — safe to expose to browsers.</p>
              <Input
                id="captcha-site-key"
                className="mt-1 font-mono text-xs"
                placeholder="0x4AAAAAAA…"
                value={settings.siteKey}
                onChange={(e) => patch({ siteKey: e.target.value })}
                disabled={!canManage}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="captcha-secret">Secret key</Label>
              <p className="text-xs text-muted-foreground">
                {settings.hasSecretKey
                  ? "A secret key is saved. Leave blank to keep it."
                  : "Required before the captcha can be enforced."}
              </p>
              <Input
                id="captcha-secret"
                className="mt-1 font-mono text-xs"
                type="password"
                autoComplete="new-password"
                placeholder={settings.hasSecretKey ? "•••••••• (saved)" : "0x4AAAAAAA…"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                disabled={!canManage || clearSecret}
              />
              {settings.hasSecretKey ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={clearSecret}
                    onChange={(e) => setClearSecret(e.target.checked)}
                    disabled={!canManage}
                  />
                  Remove the saved secret key on save
                </label>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !settings.hasSecretKey}
                onClick={() => void checkKeys()}
              >
                Verify keys with Cloudflare
              </Button>
              <Button asChild variant="ghost" size="sm">
                <a
                  href="https://dash.cloudflare.com/?to=/:account/turnstile"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Turnstile dashboard
                  <ExternalLink className="ms-2 size-3.5" aria-hidden />
                </a>
              </Button>
            </div>
            {keyCheck ? (
              <p className={keyCheck.ok ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-destructive"}>
                {keyCheck.message}
              </p>
            ) : null}
          </SettingsSection>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Where captcha is required</CardTitle>
          <CardDescription>
            Each page can follow the master switch or override it. Individual forms can override the
            form setting from the form designer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {CAPTCHA_SCOPES.map((scope) => (
            <div
              key={scope}
              className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">{CAPTCHA_SCOPE_LABELS[scope]}</p>
                <p className="text-xs text-muted-foreground">
                  {settings.scopes[scope] === "inherit"
                    ? `Follows master switch (${settings.enabled ? "on" : "off"})`
                    : settings.scopes[scope] === "on"
                      ? "Always requires a captcha"
                      : "Never requires a captcha"}
                </p>
              </div>
              <select
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                value={settings.scopes[scope]}
                onChange={(e) => patchScope(scope, e.target.value as CaptchaOverride)}
                disabled={!canManage}
                aria-label={`${CAPTCHA_SCOPE_LABELS[scope]} captcha policy`}
              >
                {OVERRIDE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={busy || !canManage} onClick={() => void save()}>
          {busy ? "Working…" : "Save captcha settings"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !canManage}
          onClick={() => {
            setSettings(initial);
            setSecretKey("");
            setClearSecret(false);
            setMessage(null);
          }}
        >
          Reset changes
        </Button>
      </div>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        When the captcha is not fully configured it is skipped everywhere instead of blocking
        submissions. Requests are still rate limited and honeypot-checked.
      </p>
    </div>
  );
}
