"use client";

import { useMemo, useState, useTransition } from "react";
import { upsertTranslationAiConfigAction } from "@/features/translation/actions";
import type { TranslationAiConfigPublic } from "@/features/translation/translation-ai-config.types";
import type { TranslationAiProviderId } from "@/capabilities/ai/providers/provider-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Trash2 } from "lucide-react";

type Props = {
  config: TranslationAiConfigPublic;
  onConfigChange?: (config: TranslationAiConfigPublic) => void;
};

export function TranslationAiConfigPanel({ config: initial, onConfigChange }: Props) {
  const [config, setConfig] = useState(initial);
  const [provider, setProvider] = useState<TranslationAiProviderId>(initial.provider);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(initial.model ?? "");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedMeta = useMemo(
    () => config.providers.find((p) => p.id === provider) ?? config.providers[0],
    [config.providers, provider]
  );

  const showModel = Boolean(selectedMeta?.requiresModel);
  const showBaseUrl = Boolean(
    selectedMeta?.requiresBaseUrl || selectedMeta?.allowBaseUrlOverride
  );
  const showApiKey = Boolean(
    selectedMeta?.requiresApiKey || selectedMeta?.apiKeyOptional
  );

  const applyPublic = (next: TranslationAiConfigPublic) => {
    setConfig(next);
    setProvider(next.provider);
    setModel(next.model ?? "");
    setBaseUrl(next.baseUrl ?? "");
    onConfigChange?.(next);
  };

  const save = () => {
    startTransition(async () => {
      setNotice(null);
      const result = await upsertTranslationAiConfigAction({
        provider,
        apiKey: apiKey.trim() || undefined,
        model: showModel ? model : undefined,
        baseUrl: showBaseUrl ? baseUrl : undefined,
      });
      if (!result.success) {
        setNotice(result.error ?? "Failed to save.");
        return;
      }
      const { success: _s, error: _e, ...publicConfig } = result;
      applyPublic(publicConfig as TranslationAiConfigPublic);
      setApiKey("");
      setNotice(
        publicConfig.isConfigured
          ? `${publicConfig.providerLabel} saved. You can queue AI translations from the Editor tab.`
          : "Saved, but configuration is incomplete — check required fields."
      );
    });
  };

  const clear = () => {
    if (!confirm("Remove the saved API key for the current provider?")) return;
    startTransition(async () => {
      setNotice(null);
      const result = await upsertTranslationAiConfigAction({
        provider,
        clearApiKey: true,
        model: showModel ? model : undefined,
        baseUrl: showBaseUrl ? baseUrl : undefined,
      });
      if (!result.success) {
        setNotice(result.error ?? "Failed to clear key.");
        return;
      }
      const { success: _s, error: _e, ...publicConfig } = result;
      applyPublic(publicConfig as TranslationAiConfigPublic);
      setApiKey("");
      setNotice("API key removed.");
    });
  };

  const canSave =
    showApiKey && selectedMeta?.requiresApiKey && !config.hasApiKey
      ? Boolean(apiKey.trim())
      : selectedMeta?.requiresBaseUrl
        ? Boolean(baseUrl.trim()) || Boolean(config.baseUrl?.trim())
        : true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          AI provider
        </CardTitle>
        <CardDescription>
          Choose a translation provider and store credentials. Secrets are encrypted at rest and
          never shown again after saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status:</span>
          {config.isConfigured ? (
            <Badge variant="secondary">{config.providerLabel} configured</Badge>
          ) : (
            <Badge variant="outline">Not configured</Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="translation-ai-provider">Provider</Label>
          <select
            id="translation-ai-provider"
            className="w-full border rounded-md h-10 px-3 text-sm bg-background"
            value={provider}
            onChange={(e) => setProvider(e.target.value as TranslationAiProviderId)}
          >
            {config.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {selectedMeta ? (
            <p className="text-xs text-muted-foreground">{selectedMeta.hint}</p>
          ) : null}
        </div>

        {showApiKey ? (
          <div className="space-y-1.5">
            <Label htmlFor="translation-ai-key">
              API key
              {config.hasApiKey && provider === config.provider
                ? " (leave blank to keep current)"
                : selectedMeta?.apiKeyOptional
                  ? " (optional)"
                  : ""}
            </Label>
            <Input
              id="translation-ai-key"
              type="password"
              autoComplete="off"
              placeholder={
                config.hasApiKey && provider === config.provider
                  ? "••••••••••••••••"
                  : selectedMeta?.id === "openai"
                    ? "sk-…"
                    : "API key"
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        ) : null}

        {showModel ? (
          <div className="space-y-1.5">
            <Label htmlFor="translation-ai-model">Model</Label>
            <Input
              id="translation-ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={selectedMeta?.defaultModel ?? "model id"}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use default ({selectedMeta?.defaultModel ?? "provider default"}).
            </p>
          </div>
        ) : null}

        {showBaseUrl ? (
          <div className="space-y-1.5">
            <Label htmlFor="translation-ai-base-url">
              Base URL
              {selectedMeta?.requiresBaseUrl ? "" : " (optional override)"}
            </Label>
            <Input
              id="translation-ai-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                selectedMeta?.requiresBaseUrl
                  ? "https://translate.example.com"
                  : selectedMeta?.defaultBaseUrl ?? "https://…"
              }
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isPending || !canSave} onClick={save}>
            {isPending ? "Saving…" : "Save configuration"}
          </Button>
          {config.hasApiKey ? (
            <Button type="button" variant="outline" disabled={isPending} onClick={clear}>
              <Trash2 className="h-4 w-4 me-2" />
              Remove key
            </Button>
          ) : null}
        </div>
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </CardContent>
    </Card>
  );
}
